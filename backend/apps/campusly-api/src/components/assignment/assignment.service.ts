import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_CATEGORY_BY_TYPE } from '../../libs/config';
import { Assignment } from '../../libs/dto/assignment/assignment';
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '../../libs/dto/assignment/assignment.input';
import { PublishInput } from '../../libs/dto/course/content.input';
import { AssignmentType } from '../../libs/enums/assignment.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AccessPolicy } from '../auth/policies/access.policy';
import { isCourseUpload, toCourseFile } from '../media/course-file';
import { ASSIGNMENT_INCLUDE } from './assignment.include';

type AssignmentRow = Prisma.AssignmentGetPayload<{
  include: typeof ASSIGNMENT_INCLUDE;
}>;

/** Assignments of a course: teachers create and publish, students and parents read */
@Injectable()
export class AssignmentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  public async createAssignment(
    user: AuthUser,
    input: CreateAssignmentInput,
  ): Promise<Assignment> {
    await this.accessPolicy.assertCanEditCourse(user, input.courseId);
    const categoryId = await this.resolveCategory(
      input.courseId,
      input.type,
      input.categoryId,
    );
    if (input.lessonId) {
      await this.assertLessonOfCourse(input.lessonId, input.courseId);
    }
    if (input.moduleId) {
      await this.assertModuleOfCourse(input.moduleId, input.courseId);
    }
    const fileIds = input.fileAssetIds ?? [];
    await this.assertCourseFiles(fileIds, input.courseId);
    // An exam is offline: it is graded, never submitted
    const isExam = input.type === AssignmentType.EXAM;

    const row = await this.prismaService.assignment.create({
      data: {
        courseId: input.courseId,
        moduleId: input.moduleId,
        lessonId: input.lessonId,
        categoryId,
        type: input.type,
        title: input.title.trim(),
        instructions: input.instructions,
        maxScore: input.maxScore,
        dueAt: input.dueAt,
        allowLate: input.allowLate ?? true,
        maxAttempts: isExam ? 0 : (input.maxAttempts ?? 1),
        acceptedFileTypes: isExam
          ? []
          : (input.acceptedFileTypes ?? ['pdf', 'docx', 'jpg', 'png']),
        tutorMode: input.tutorMode,
        finalAnswer: input.finalAnswer,
        createdById: user.id,
        files: {
          create: fileIds.map((assetId, order) => ({ assetId, order })),
        },
      },
      include: ASSIGNMENT_INCLUDE,
    });
    return toAssignment(row, user);
  }

  public async updateAssignment(
    user: AuthUser,
    input: UpdateAssignmentInput,
  ): Promise<Assignment> {
    const before = await this.prismaService.assignment.findUnique({
      where: { id: input.id },
    });
    if (!before) throw notFound('Assignment not found');
    await this.accessPolicy.assertCanEditCourse(user, before.courseId);

    if (
      input.maxScore !== undefined &&
      input.maxScore !== Number(before.maxScore)
    ) {
      const graded = await this.prismaService.submission.count({
        where: { assignmentId: before.id, score: { not: null } },
      });
      if (graded) {
        throw badRequest('Max score cannot change after grading has started');
      }
    }
    const categoryId = input.categoryId
      ? await this.resolveCategory(
          before.courseId,
          before.type,
          input.categoryId,
        )
      : undefined;
    if (input.lessonId) {
      await this.assertLessonOfCourse(input.lessonId, before.courseId);
    }
    if (input.moduleId) {
      await this.assertModuleOfCourse(input.moduleId, before.courseId);
    }
    if (input.fileAssetIds) {
      await this.assertCourseFiles(input.fileAssetIds, before.courseId);
    }
    const isExam = before.type === AssignmentType.EXAM;

    const row = await this.prismaService.$transaction(async (tx) => {
      if (input.fileAssetIds) {
        await this.syncFiles(tx, before.id, input.fileAssetIds);
      }
      return tx.assignment.update({
        where: { id: before.id },
        data: {
          title: input.title?.trim(),
          categoryId,
          moduleId: input.moduleId,
          lessonId: input.lessonId,
          instructions: input.instructions,
          maxScore: input.maxScore,
          dueAt: input.dueAt,
          allowLate: input.allowLate,
          // An exam stays offline whatever is sent
          maxAttempts: isExam ? undefined : input.maxAttempts,
          acceptedFileTypes: isExam ? undefined : input.acceptedFileTypes,
          tutorMode: input.tutorMode,
          finalAnswer: input.finalAnswer,
        },
        include: ASSIGNMENT_INCLUDE,
      });
    });
    return toAssignment(row, user);
  }

  /** Publish now / schedule / back to draft (only while nobody has submitted) */
  public async publishAssignment(
    user: AuthUser,
    input: PublishInput,
  ): Promise<Assignment> {
    const before = await this.prismaService.assignment.findUnique({
      where: { id: input.id },
    });
    if (!before) throw notFound('Assignment not found');
    await this.accessPolicy.assertCanEditCourse(user, before.courseId);

    if (!input.publish) {
      const submitted = await this.prismaService.submission.count({
        where: { assignmentId: before.id, submittedAt: { not: null } },
      });
      // Students' work must not disappear from their view
      if (submitted) {
        throw badRequest('Students have already submitted: it stays published');
      }
    }
    const row = await this.prismaService.assignment.update({
      where: { id: before.id },
      data: {
        publishedAt: input.publish ? (input.publishAt ?? new Date()) : null,
      },
      include: ASSIGNMENT_INCLUDE,
    });
    return toAssignment(row, user);
  }

  /** Teachers and admins: all; students and parents: published only (DRAFT course: none) */
  public async getCourseAssignments(
    user: AuthUser,
    courseId: string,
  ): Promise<Assignment[]> {
    await this.accessPolicy.assertCanViewCourse(user, courseId);
    const learner = isLearner(user);
    if (learner) {
      const course = await this.prismaService.course.findUniqueOrThrow({
        where: { id: courseId },
        select: { status: true },
      });
      if (course.status === 'DRAFT') throw notFound('Course not found');
    }

    const rows = await this.prismaService.assignment.findMany({
      where: {
        AND: [
          { courseId },
          learner ? { publishedAt: { lte: new Date() } } : {},
        ],
      },
      orderBy: [
        { dueAt: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
      include: ASSIGNMENT_INCLUDE,
    });
    return rows.map((row) => toAssignment(row, user));
  }

  public async getAssignment(
    user: AuthUser,
    assignmentId: string,
  ): Promise<Assignment> {
    const row = await this.accessPolicy.assertCanViewAssignment(
      user,
      assignmentId,
    );
    return toAssignment(row, user);
  }

  // ───────────────────────── helpers ─────────────────────────

  /** The given category (of this course), or the default one for the type */
  private async resolveCategory(
    courseId: string,
    type: AssignmentType,
    categoryId?: string,
  ): Promise<string> {
    const category = await this.prismaService.gradeCategory.findFirst({
      where: categoryId
        ? { id: categoryId, courseId }
        : { courseId, name: DEFAULT_CATEGORY_BY_TYPE[type] },
      select: { id: true },
    });
    if (category) return category.id;
    if (categoryId) throw notFound('Grade category not found');
    throw badRequest('Choose a grade category for this assignment');
  }

  private async assertModuleOfCourse(moduleId: string, courseId: string) {
    const found = await this.prismaService.module.count({
      where: { id: moduleId, courseId },
    });
    if (!found) throw notFound('Week not found in this course');
  }

  /** Every id: a READY document or image uploaded for this course (another course's file: 404) */
  private async assertCourseFiles(assetIds: string[], courseId: string) {
    if (!assetIds.length) return;
    const assets = await this.prismaService.mediaAsset.findMany({
      where: { id: { in: assetIds } },
      select: { s3Key: true, kind: true, status: true },
    });
    const ofCourse = assets.filter((a) => isCourseUpload(a.s3Key, courseId));
    if (ofCourse.length !== assetIds.length) throw notFound('File not found');
    const usable = ofCourse.every(
      (a) =>
        (a.kind === 'DOCUMENT' || a.kind === 'IMAGE') && a.status === 'READY',
    );
    if (!usable) {
      throw badRequest('A file is not ready (finish the upload first)');
    }
  }

  /**
   * The new list wins: files left out get removedAt (no hard delete), new ones are added, and every
   * attached file takes its place in the list's order.
   */
  private async syncFiles(
    tx: Prisma.TransactionClient,
    assignmentId: string,
    assetIds: string[],
  ) {
    const current = await tx.assignmentFile.findMany({
      where: { assignmentId, removedAt: null },
    });
    const keep = new Set(assetIds);
    await tx.assignmentFile.updateMany({
      where: {
        id: {
          in: current.filter((f) => !keep.has(f.assetId)).map((f) => f.id),
        },
      },
      data: { removedAt: new Date() },
    });
    const byAsset = new Map(current.map((f) => [f.assetId, f]));
    for (const [order, assetId] of assetIds.entries()) {
      const file = byAsset.get(assetId);
      if (file) {
        await tx.assignmentFile.update({
          where: { id: file.id },
          data: { order },
        });
      } else {
        await tx.assignmentFile.create({
          data: { assignmentId, assetId, order },
        });
      }
    }
  }

  private async assertLessonOfCourse(lessonId: string, courseId: string) {
    const found = await this.prismaService.lesson.count({
      where: { id: lessonId, module: { courseId } },
    });
    if (!found) throw notFound('Lesson not found in this course');
  }
}

function isLearner(user: AuthUser): boolean {
  return user.role === 'STUDENT' || user.role === 'PARENT';
}

/** The only place an assignment becomes API output: the final answer never reaches learners */
export function toAssignment(row: AssignmentRow, viewer: AuthUser): Assignment {
  return {
    id: row.id,
    courseId: row.courseId,
    moduleId: row.moduleId,
    lessonId: row.lessonId,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    type: row.type,
    title: row.title,
    instructions: row.instructions,
    maxScore: Number(row.maxScore),
    dueAt: row.dueAt,
    allowLate: row.allowLate,
    maxAttempts: row.maxAttempts,
    acceptedFileTypes: row.acceptedFileTypes,
    tutorMode: row.tutorMode,
    finalAnswer: isLearner(viewer) ? null : row.finalAnswer,
    publishedAt: row.publishedAt,
    gradesPublishedAt: row.gradesPublishedAt,
    files: row.files.map((f) => toCourseFile(f.asset)),
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
