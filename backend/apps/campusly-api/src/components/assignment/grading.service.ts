import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Assignment } from '../../libs/dto/assignment/assignment';
import { GradebookRow, Submission } from '../../libs/dto/assignment/submission';
import {
  GradeSubmissionInput,
  PublishGradesInput,
  ReturnSubmissionInput,
} from '../../libs/dto/assignment/submission.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { toAssignment } from './assignment.service';
import { SUBMISSION_INCLUDE, SubmissionService } from './submission.service';

/**
 * The teacher's side: the gradebook, grading, "please redo", zeros for missing work and
 * publishing. Every grade change is written to AuditLog in the same transaction.
 */
@Injectable()
export class GradingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditService: AuditService,
    private readonly submissionService: SubmissionService,
  ) {}

  /** Every ACTIVE student of the course, with their submission (or null) */
  public async getGradebook(
    user: AuthUser,
    assignmentId: string,
  ): Promise<GradebookRow[]> {
    const assignment = await this.findForTeacher(user, assignmentId);
    const enrollments = await this.prismaService.enrollment.findMany({
      where: { courseId: assignment.courseId, status: 'ACTIVE' },
      include: {
        student: {
          select: { id: true, loginId: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });
    const submissions = await this.prismaService.submission.findMany({
      where: { assignmentId },
      include: SUBMISSION_INCLUDE,
    });
    const byStudent = new Map(submissions.map((s) => [s.studentId, s]));

    return enrollments.map(({ student }) => {
      const row = byStudent.get(student.id);
      return {
        studentId: student.id,
        loginId: student.loginId,
        firstName: student.firstName,
        lastName: student.lastName,
        submission: row
          ? this.submissionService.toSubmission(row, assignment, user)
          : null,
      };
    });
  }

  public async gradeSubmission(
    user: AuthUser,
    input: GradeSubmissionInput,
  ): Promise<Submission> {
    const assignment = await this.findForTeacher(user, input.assignmentId);
    await this.assertEnrolled(assignment.courseId, input.studentId);
    const maxScore = Number(assignment.maxScore);
    if (input.score > maxScore) {
      throw badRequest(`The score must be between 0 and ${maxScore}`);
    }

    const key = {
      assignmentId: assignment.id,
      studentId: input.studentId,
    };
    await this.prismaService.$transaction(async (tx) => {
      const before = await tx.submission.findUnique({
        where: { assignmentId_studentId: key },
        select: { score: true, status: true },
      });
      // No submission yet is fine: an offline exam, or work handed in on paper
      const after = await tx.submission.upsert({
        where: { assignmentId_studentId: key },
        create: {
          ...key,
          status: 'GRADED',
          score: input.score,
          feedback: input.feedback,
          gradedById: user.id,
          gradedAt: new Date(),
        },
        update: {
          status: 'GRADED',
          score: input.score,
          feedback: input.feedback,
          gradedById: user.id,
          gradedAt: new Date(),
        },
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.SUBMISSION_GRADE,
        entityType: 'Submission',
        entityId: after.id,
        before: {
          status: before?.status ?? null,
          score: before?.score ?? null,
        },
        after: { status: after.status, score: after.score },
      });
    });
    return this.getOne(user, assignment, input.studentId);
  }

  /** "Please redo": RETURNED gives the student one more attempt; the score is cleared */
  public async returnSubmission(
    user: AuthUser,
    input: ReturnSubmissionInput,
  ): Promise<Submission> {
    const assignment = await this.findForTeacher(user, input.assignmentId);
    const before = await this.prismaService.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: input.studentId,
        },
      },
      include: { _count: { select: { attempts: true } } },
    });
    if (!before?._count.attempts) {
      throw notFound('There is no submitted work to return');
    }
    if (assignment.gradesPublishedAt) {
      throw badRequest('Grades are published: hide them first to return work');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: before.id },
        data: {
          status: 'RETURNED',
          score: null,
          feedback: input.feedback ?? before.feedback,
          gradedById: user.id,
          gradedAt: new Date(),
        },
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.SUBMISSION_RETURN,
        entityType: 'Submission',
        entityId: before.id,
        before: { status: before.status, score: before.score },
        after: { status: 'RETURNED', score: null },
      });
    });
    return this.getOne(user, assignment, input.studentId);
  }

  /** After the deadline: 0 and MISSING for every active student with no work and no grade */
  public async giveZeroToMissing(
    user: AuthUser,
    assignmentId: string,
  ): Promise<number> {
    const assignment = await this.findForTeacher(user, assignmentId);
    if (assignment.dueAt && assignment.dueAt > new Date()) {
      throw badRequest('The deadline has not passed yet');
    }

    return this.prismaService.$transaction(async (tx) => {
      const enrolled = await tx.enrollment.findMany({
        where: { courseId: assignment.courseId, status: 'ACTIVE' },
        select: { studentId: true },
      });
      // Students who already have something (work, a grade, RETURNED) are left alone
      const existing = await tx.submission.findMany({
        where: {
          assignmentId,
          OR: [{ attempts: { some: {} } }, { score: { not: null } }],
        },
        select: { studentId: true },
      });
      const done = new Set(existing.map((s) => s.studentId));
      const missing = enrolled
        .map((e) => e.studentId)
        .filter((id) => !done.has(id));

      for (const studentId of missing) {
        await tx.submission.upsert({
          where: { assignmentId_studentId: { assignmentId, studentId } },
          create: {
            assignmentId,
            studentId,
            status: 'MISSING',
            score: 0,
            gradedById: user.id,
            gradedAt: new Date(),
          },
          update: {
            status: 'MISSING',
            score: 0,
            gradedById: user.id,
            gradedAt: new Date(),
          },
        });
      }
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.ASSIGNMENT_ZERO_MISSING,
        entityType: 'Assignment',
        entityId: assignmentId,
        after: { studentIds: missing },
      });
      return missing.length;
    });
  }

  /** Students and parents see scores and feedback only after this */
  public async publishGrades(
    user: AuthUser,
    input: PublishGradesInput,
  ): Promise<Assignment> {
    const assignment = await this.findForTeacher(user, input.assignmentId);
    const row = await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id: assignment.id },
        data: { gradesPublishedAt: input.publish ? new Date() : null },
        include: { category: { select: { name: true } } },
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.ASSIGNMENT_PUBLISH_GRADES,
        entityType: 'Assignment',
        entityId: assignment.id,
        before: { gradesPublishedAt: assignment.gradesPublishedAt },
        after: { gradesPublishedAt: updated.gradesPublishedAt },
      });
      return updated;
    });
    return toAssignment(row, user);
  }

  // ───────────────────────── helpers ─────────────────────────

  /** The assignment, if the user teaches its course (strangers: NOT_FOUND) */
  private async findForTeacher(user: AuthUser, assignmentId: string) {
    const assignment = await this.prismaService.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw notFound('Assignment not found');
    await this.accessPolicy.assertTeacherOf(user, assignment.courseId);
    return assignment;
  }

  /** Grades only for students of this course (an id from the client is checked in the DB) */
  private async assertEnrolled(courseId: string, studentId: string) {
    const enrolled = await this.prismaService.enrollment.count({
      where: { courseId, studentId, status: 'ACTIVE' },
    });
    if (!enrolled) throw notFound('Student not found in this course');
  }

  private async getOne(
    user: AuthUser,
    assignment: {
      id: string;
      maxAttempts: number;
      gradesPublishedAt: Date | null;
    },
    studentId: string,
  ): Promise<Submission> {
    const row = await this.prismaService.submission.findUniqueOrThrow({
      where: {
        assignmentId_studentId: { assignmentId: assignment.id, studentId },
      },
      include: SUBMISSION_INCLUDE,
    });
    return this.submissionService.toSubmission(row, assignment, user);
  }
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
