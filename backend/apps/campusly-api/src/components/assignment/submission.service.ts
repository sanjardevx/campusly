import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FILE_URL_TTL_SEC, MIME_EXTENSIONS } from '../../libs/config';
import { Submission } from '../../libs/dto/assignment/submission';
import {
  AddSubmissionCommentInput,
  SubmitAssignmentInput,
} from '../../libs/dto/assignment/submission.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AccessPolicy } from '../auth/policies/access.policy';
import { submissionKeyPrefix } from '../media/media.service';
import { StorageService } from '../media/storage.service';

export const SUBMISSION_INCLUDE = {
  attempts: {
    orderBy: { number: 'asc' },
    include: {
      files: {
        include: {
          asset: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              s3Key: true,
            },
          },
        },
      },
    },
  },
  comments: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
    },
  },
} satisfies Prisma.SubmissionInclude;

export type SubmissionRow = Prisma.SubmissionGetPayload<{
  include: typeof SUBMISSION_INCLUDE;
}>;

/** What the mapper needs to know about the assignment */
export interface AssignmentRules {
  maxAttempts: number;
  gradesPublishedAt: Date | null;
}

/** Students submit (attempts, files, late), comments go both ways, parents only read */
@Injectable()
export class SubmissionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly storageService: StorageService,
  ) {}

  public async submitAssignment(
    user: AuthUser,
    input: SubmitAssignmentInput,
  ): Promise<Submission> {
    const assignment = await this.accessPolicy.assertCanViewAssignment(
      user,
      input.assignmentId,
    );
    if (assignment.type === 'EXAM') {
      throw badRequest('An offline exam has no submission');
    }
    if (assignment.course.status === 'ARCHIVED') {
      throw badRequest('The course is archived');
    }
    if (assignment.gradesPublishedAt) {
      throw badRequest('Grades are published: submissions are closed');
    }
    const text = input.text?.trim() || null;
    const assetIds = input.assetIds ?? [];
    if (!text && assetIds.length === 0) {
      throw badRequest('Add an answer or a file');
    }

    const now = new Date();
    const isLate = !!assignment.dueAt && now > assignment.dueAt;
    if (isLate && !assignment.allowLate) {
      throw badRequest('The deadline has passed');
    }

    // Every file: mine, READY, uploaded for THIS assignment, a type it accepts
    if (assetIds.length) {
      const prefix = `${submissionKeyPrefix(assignment.courseId, assignment.id)}/`;
      const assets = await this.prismaService.mediaAsset.findMany({
        where: { id: { in: assetIds }, ownerId: user.id, status: 'READY' },
        select: { s3Key: true, mimeType: true },
      });
      const valid =
        assets.length === assetIds.length &&
        assets.every(
          (a) =>
            !!a.s3Key?.startsWith(prefix) &&
            assignment.acceptedFileTypes.includes(
              MIME_EXTENSIONS[a.mimeType] ?? '',
            ),
        );
      // Someone else's file "does not exist" for this student
      if (!valid) throw notFound('File not found');
    }

    const existing = await this.prismaService.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: user.id,
        },
      },
      include: { _count: { select: { attempts: true } } },
    });
    if (existing?.status === 'GRADED') {
      throw badRequest('Already graded: ask the teacher to return it');
    }
    const used = existing?._count.attempts ?? 0;
    // RETURNED ("please redo") gives one more attempt even when all were used
    if (used >= assignment.maxAttempts && existing?.status !== 'RETURNED') {
      throw badRequest('No attempts left');
    }

    const status = isLate ? 'LATE' : 'SUBMITTED';
    await this.prismaService.$transaction(async (tx) => {
      // A new attempt is graded again: an old score (or the 0 of MISSING) is cleared
      const submission = await tx.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: assignment.id,
            studentId: user.id,
          },
        },
        create: {
          assignmentId: assignment.id,
          studentId: user.id,
          status,
          submittedAt: now,
        },
        update: {
          status,
          submittedAt: now,
          score: null,
          gradedAt: null,
          gradedById: null,
        },
      });
      // Unique (submissionId, number): a double click fails here (CONFLICT) instead of using 2 attempts
      await tx.submissionAttempt.create({
        data: {
          submissionId: submission.id,
          number: used + 1,
          text,
          isLate,
          submittedAt: now,
          files: { create: assetIds.map((assetId) => ({ assetId })) },
        },
      });
    });

    return this.getMySubmission(user, assignment.id) as Promise<Submission>;
  }

  /** Student (own work) and the course's teachers; parents may read but not write */
  public async addSubmissionComment(
    user: AuthUser,
    input: AddSubmissionCommentInput,
  ): Promise<Submission> {
    const submission = await this.prismaService.submission.findUnique({
      where: { id: input.submissionId },
      include: {
        assignment: { select: { courseId: true, id: true } },
      },
    });
    if (!submission) throw notFound('Submission not found');

    if (user.role === 'STUDENT') {
      if (submission.studentId !== user.id) {
        throw notFound('Submission not found');
      }
    } else if (user.role === 'PARENT') {
      // Not their child → NOT_FOUND; their child → read-only
      await this.accessPolicy.resolveStudentScope(user, submission.studentId);
      throw forbidden('Parents can read comments but not write them');
    } else {
      await this.accessPolicy.assertTeacherOf(
        user,
        submission.assignment.courseId,
      );
    }

    await this.prismaService.submissionComment.create({
      data: {
        submissionId: submission.id,
        authorId: user.id,
        body: input.body.trim(),
      },
    });
    return this.getSubmissionById(user, submission.id);
  }

  /**
   * A student's own submission, a parent's child's, or (admin) any student's.
   * null = nothing submitted yet.
   */
  public async getMySubmission(
    user: AuthUser,
    assignmentId: string,
    studentId?: string,
  ): Promise<Submission | null> {
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    const assignment = await this.accessPolicy.assertCanViewAssignment(
      user,
      assignmentId,
    );
    // The chosen student must belong to the course (a parent with two children, an admin)
    const enrolled = await this.prismaService.enrollment.count({
      where: { courseId: assignment.courseId, studentId: id },
    });
    if (!enrolled) throw notFound('Assignment not found');

    const row = await this.prismaService.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: id } },
      include: SUBMISSION_INCLUDE,
    });
    return row ? this.toSubmission(row, assignment, user) : null;
  }

  private async getSubmissionById(
    user: AuthUser,
    submissionId: string,
  ): Promise<Submission> {
    const row = await this.prismaService.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        ...SUBMISSION_INCLUDE,
        assignment: { select: { maxAttempts: true, gradesPublishedAt: true } },
      },
    });
    return this.toSubmission(row, row.assignment, user);
  }

  /**
   * The ONLY place a submission becomes API output. Students and parents get no score, feedback
   * or GRADED / MISSING status until the grades are published (even "graded" would hint).
   */
  public toSubmission(
    row: SubmissionRow,
    rules: AssignmentRules,
    viewer: AuthUser,
  ): Submission {
    const hidden =
      (viewer.role === 'STUDENT' || viewer.role === 'PARENT') &&
      !rules.gradesPublishedAt;
    // Hidden: what the student did (submitted / late / nothing yet), not what the teacher decided
    const last = row.attempts.at(-1);
    const shown = !last ? 'DRAFT' : last.isLate ? 'LATE' : 'SUBMITTED';
    const status =
      hidden && (row.status === 'GRADED' || row.status === 'MISSING')
        ? shown
        : row.status;

    return {
      id: row.id,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      status,
      submittedAt: row.submittedAt,
      score: hidden || row.score === null ? null : Number(row.score),
      feedback: hidden ? null : row.feedback,
      gradedAt: hidden ? null : row.gradedAt,
      attemptsLeft:
        row.status === 'RETURNED'
          ? Math.max(1, rules.maxAttempts - row.attempts.length)
          : Math.max(0, rules.maxAttempts - row.attempts.length),
      attempts: row.attempts.map((a) => ({
        number: a.number,
        text: a.text,
        isLate: a.isLate,
        submittedAt: a.submittedAt,
        files: a.files.map(({ asset }) => ({
          assetId: asset.id,
          originalName: asset.originalName,
          mimeType: asset.mimeType,
          size: Number(asset.size),
          url:
            this.storageService.isEnabled && asset.s3Key
              ? this.storageService.signedUrl(asset.s3Key, FILE_URL_TTL_SEC)
              : null,
        })),
      })),
      comments: row.comments.map((c) => ({
        id: c.id,
        authorName: `${c.author.firstName} ${c.author.lastName}`,
        authorRole: c.author.role,
        body: c.body,
        createdAt: c.createdAt,
      })),
    };
  }
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function forbidden(message: string) {
  return new ForbiddenException({ code: ErrorCode.FORBIDDEN, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
