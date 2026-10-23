import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Lesson, Module } from '../../libs/dto/course/content';
import {
  CreateLessonInput,
  CreateModuleInput,
  PublishInput,
  ReorderInput,
  SetLessonFileInput,
  SetLessonVideoInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from '../../libs/dto/course/content.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import { CompletionType, LessonType } from '../../libs/enums/course.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AccessPolicy } from '../auth/policies/access.policy';
import {
  COURSE_FILE_SELECT,
  isCourseUpload,
  toCourseFile,
} from '../media/course-file';

/** A lesson with its video (VIDEO) or its first file (FILE), for the course page */
export const LESSON_INCLUDE = {
  videoAsset: { select: COURSE_FILE_SELECT },
  resources: {
    where: { assetId: { not: null } },
    orderBy: { order: 'asc' },
    take: 1,
    include: { asset: { select: COURSE_FILE_SELECT } },
  },
} satisfies Prisma.LessonInclude;

export const LESSONS_IN_ORDER = {
  lessons: {
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: LESSON_INCLUDE,
  },
} satisfies Prisma.ModuleInclude;

type ModuleRow = Prisma.ModuleGetPayload<{ include: typeof LESSONS_IN_ORDER }>;
type LessonRow = Prisma.LessonGetPayload<{ include: typeof LESSON_INCLUDE }>;

/**
 * Weeks (modules) and lessons of a course. Every change goes through AccessPolicy.assertTeacherOf:
 * the course is always found from the database, never taken from the client.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  // ───────────────────────── modules ─────────────────────────

  public async createModule(
    user: AuthUser,
    input: CreateModuleInput,
  ): Promise<Module> {
    await this.assertCanEdit(user, input.courseId);
    const dates = moduleDates(input.startsAt, input.endsAt);

    const last = await this.prismaService.module.aggregate({
      where: { courseId: input.courseId },
      _max: { order: true },
    });
    const created = await this.prismaService.module.create({
      data: {
        courseId: input.courseId,
        title: input.title.trim(),
        order: (last._max.order ?? 0) + 1,
        ...dates,
      },
      include: LESSONS_IN_ORDER,
    });
    return toModule(created);
  }

  public async updateModule(
    user: AuthUser,
    input: UpdateModuleInput,
  ): Promise<Module> {
    const before = await this.findModule(input.id);
    await this.assertCanEdit(user, before.courseId);
    // A date that is not sent keeps its old value, so both are checked together
    const dates = moduleDates(
      input.startsAt ?? optionalDate(before.startsAt),
      input.endsAt ?? optionalDate(before.endsAt),
    );

    const updated = await this.prismaService.module.update({
      where: { id: input.id },
      data: { title: input.title?.trim(), isHidden: input.isHidden, ...dates },
      include: LESSONS_IN_ORDER,
    });
    return toModule(updated);
  }

  public async publishModule(
    user: AuthUser,
    input: PublishInput,
  ): Promise<Module> {
    const module = await this.findModule(input.id);
    await this.assertCanEdit(user, module.courseId);
    const updated = await this.prismaService.module.update({
      where: { id: input.id },
      data: { publishedAt: publishedAt(input) },
      include: LESSONS_IN_ORDER,
    });
    return toModule(updated);
  }

  /** `ids` = every module of the course, in the new order */
  public async reorderModules(
    user: AuthUser,
    input: ReorderInput,
  ): Promise<Module[]> {
    await this.assertCanEdit(user, input.parentId);
    const current = await this.prismaService.module.findMany({
      where: { courseId: input.parentId },
      select: { id: true },
    });
    assertSameSet(
      current.map((m) => m.id),
      input.ids,
    );

    await this.prismaService.$transaction(
      input.ids.map((id, i) =>
        this.prismaService.module.update({
          where: { id },
          data: { order: i + 1 },
        }),
      ),
    );
    return this.getModules(input.parentId);
  }

  /** Teacher view: every module and lesson, drafts included */
  public async getModules(courseId: string): Promise<Module[]> {
    const modules = await this.prismaService.module.findMany({
      where: { courseId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: LESSONS_IN_ORDER,
    });
    return modules.map(toModule);
  }

  // ───────────────────────── lessons ─────────────────────────

  public async createLesson(
    user: AuthUser,
    input: CreateLessonInput,
  ): Promise<Lesson> {
    const module = await this.findModule(input.moduleId);
    await this.assertCanEdit(user, module.courseId);
    if (input.type === LessonType.LINK && !input.body) {
      throw badRequest('A link lesson needs a URL in body');
    }
    const body = lessonBody(input.type, input.body);

    const last = await this.prismaService.lesson.aggregate({
      where: { moduleId: module.id },
      _max: { order: true },
    });
    const lesson = await this.prismaService.lesson.create({
      data: {
        moduleId: module.id,
        title: input.title.trim(),
        type: input.type,
        body,
        dueAt: input.dueAt,
        completionType:
          input.completionType ??
          (input.type === LessonType.VIDEO
            ? CompletionType.VIDEO_WATCHED
            : CompletionType.VIEW),
        tutorNotes: input.tutorNotes,
        order: (last._max.order ?? 0) + 1,
      },
      include: LESSON_INCLUDE,
    });
    return toLesson(lesson);
  }

  public async updateLesson(
    user: AuthUser,
    input: UpdateLessonInput,
  ): Promise<Lesson> {
    const before = await this.findLesson(input.id);
    await this.assertCanEdit(user, before.module.courseId);

    const lesson = await this.prismaService.lesson.update({
      where: { id: input.id },
      data: {
        title: input.title?.trim(),
        body:
          input.body === undefined
            ? undefined
            : lessonBody(before.type, input.body),
        dueAt: input.dueAt,
        completionType: input.completionType,
        tutorNotes: input.tutorNotes,
      },
      include: LESSON_INCLUDE,
    });
    return toLesson(lesson);
  }

  public async publishLesson(
    user: AuthUser,
    input: PublishInput,
  ): Promise<Lesson> {
    const before = await this.findLesson(input.id);
    await this.assertCanEdit(user, before.module.courseId);
    const lesson = await this.prismaService.lesson.update({
      where: { id: input.id },
      data: { publishedAt: publishedAt(input) },
      include: LESSON_INCLUDE,
    });
    return toLesson(lesson);
  }

  /**
   * Attach a READY video to a VIDEO lesson (null detaches it). The video must have been uploaded
   * for this course: its key starts with raw/{courseId}/, so another course's video cannot be used.
   */
  public async setLessonVideo(
    user: AuthUser,
    input: SetLessonVideoInput,
  ): Promise<Lesson> {
    const lesson = await this.findLesson(input.lessonId);
    const { courseId } = lesson.module;
    await this.assertCanEdit(user, courseId);
    if (lesson.type !== LessonType.VIDEO) {
      throw badRequest('Only a video lesson can have a video');
    }

    if (input.assetId) {
      const asset = await this.prismaService.mediaAsset.findUnique({
        where: { id: input.assetId },
      });
      const ofThisCourse = !!asset && isCourseUpload(asset.s3Key, courseId);
      if (!asset || !ofThisCourse) throw notFound('Video not found');
      if (asset.kind !== 'VIDEO' || asset.status !== 'READY') {
        throw badRequest('The video is not ready (finish the upload first)');
      }
    }

    const updated = await this.prismaService.lesson.update({
      where: { id: lesson.id },
      data: { videoAssetId: input.assetId ?? null },
      include: LESSON_INCLUDE,
    });
    return toLesson(updated);
  }

  /**
   * A FILE lesson's document: its first LessonResource points to the asset (null clears it, the row
   * stays). Same rule as the video: only a READY document or image uploaded for this course.
   */
  public async setLessonFile(
    user: AuthUser,
    input: SetLessonFileInput,
  ): Promise<Lesson> {
    const lesson = await this.findLesson(input.lessonId);
    const { courseId } = lesson.module;
    await this.assertCanEdit(user, courseId);
    if (lesson.type !== LessonType.FILE) {
      throw badRequest('Only a file lesson can have a file');
    }

    let title = lesson.title;
    if (input.assetId) {
      const asset = await this.prismaService.mediaAsset.findUnique({
        where: { id: input.assetId },
      });
      if (!asset || !isCourseUpload(asset.s3Key, courseId)) {
        throw notFound('File not found');
      }
      if (
        (asset.kind !== 'DOCUMENT' && asset.kind !== 'IMAGE') ||
        asset.status !== 'READY'
      ) {
        throw badRequest('The file is not ready (finish the upload first)');
      }
      title = asset.originalName;
    }

    const first = await this.prismaService.lessonResource.findFirst({
      where: { lessonId: lesson.id },
      orderBy: { order: 'asc' },
    });
    if (first) {
      await this.prismaService.lessonResource.update({
        where: { id: first.id },
        data: { assetId: input.assetId ?? null, title },
      });
    } else if (input.assetId) {
      await this.prismaService.lessonResource.create({
        data: { lessonId: lesson.id, assetId: input.assetId, title, order: 0 },
      });
    }
    const updated = await this.prismaService.lesson.findUniqueOrThrow({
      where: { id: lesson.id },
      include: LESSON_INCLUDE,
    });
    return toLesson(updated);
  }

  /** `ids` = every lesson of the module, in the new order */
  public async reorderLessons(
    user: AuthUser,
    input: ReorderInput,
  ): Promise<Module> {
    const module = await this.findModule(input.parentId);
    await this.assertCanEdit(user, module.courseId);
    assertSameSet(
      module.lessons.map((l) => l.id),
      input.ids,
    );

    await this.prismaService.$transaction(
      input.ids.map((id, i) =>
        this.prismaService.lesson.update({
          where: { id },
          data: { order: i + 1 },
        }),
      ),
    );
    return toModule(await this.findModule(module.id));
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Teachers of the course (or the admin); an archived course is read-only */
  private assertCanEdit(user: AuthUser, courseId: string) {
    return this.accessPolicy.assertCanEditCourse(user, courseId);
  }

  private async findModule(id: string): Promise<ModuleRow> {
    const module = await this.prismaService.module.findUnique({
      where: { id },
      include: LESSONS_IN_ORDER,
    });
    if (!module) throw notFound('Module not found');
    return module;
  }

  private async findLesson(id: string) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw notFound('Lesson not found');
    return lesson;
  }
}

/** null = draft, otherwise the given time or now */
function publishedAt(input: PublishInput): Date | null {
  return input.publish ? (input.publishAt ?? new Date()) : null;
}

function moduleDates(startsAt?: string, endsAt?: string) {
  const start = startsAt ? toDbDate(startsAt) : undefined;
  const end = endsAt ? toDbDate(endsAt) : undefined;
  if (start && end && end < start) {
    throw badRequest('The end date must not be before the start date');
  }
  return { startsAt: start, endsAt: end };
}

function optionalDate(date: Date | null): string | undefined {
  return date ? fromDbDate(date) : undefined;
}

/** A LINK lesson keeps its URL in `body`: only http(s), so no "javascript:" links reach students */
function lessonBody(type: LessonType, body?: string): string | undefined {
  if (type !== LessonType.LINK || body === undefined) return body;
  let url: URL;
  try {
    url = new URL(body.trim());
  } catch {
    throw badRequest('A link lesson needs a valid URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw badRequest('Only http(s) links are allowed');
  }
  return url.toString();
}

function assertSameSet(current: string[], next: string[]) {
  const known = new Set(current);
  if (next.length !== current.length || !next.every((id) => known.has(id))) {
    throw badRequest('Send every item of the list exactly once');
  }
}

export function toLesson(lesson: LessonRow): Lesson {
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    type: lesson.type,
    body: lesson.body,
    videoAssetId: lesson.videoAssetId,
    file:
      lesson.type === LessonType.VIDEO
        ? lesson.videoAsset && toCourseFile(lesson.videoAsset)
        : lesson.resources[0]?.asset
          ? toCourseFile(lesson.resources[0].asset)
          : null,
    dueAt: lesson.dueAt,
    completionType: lesson.completionType,
    tutorNotes: lesson.tutorNotes,
    order: lesson.order,
    publishedAt: lesson.publishedAt,
  };
}

export function toModule(module: ModuleRow): Module {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    order: module.order,
    startsAt: module.startsAt ? fromDbDate(module.startsAt) : null,
    endsAt: module.endsAt ? fromDbDate(module.endsAt) : null,
    isHidden: module.isHidden,
    publishedAt: module.publishedAt,
    lessons: module.lessons.map(toLesson),
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
