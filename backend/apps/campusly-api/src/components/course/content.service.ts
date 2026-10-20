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
  UpdateLessonInput,
  UpdateModuleInput,
} from '../../libs/dto/course/content.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import { CompletionType, LessonType } from '../../libs/enums/course.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AccessPolicy } from '../auth/policies/access.policy';

type ModuleRow = Prisma.ModuleGetPayload<{ include: { lessons: true } }>;
type LessonRow = Prisma.LessonGetPayload<object>;

const LESSONS_IN_ORDER = {
  lessons: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ModuleInclude;

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
    });
    return toLesson(lesson);
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
  private async assertCanEdit(user: AuthUser, courseId: string) {
    await this.accessPolicy.assertTeacherOf(user, courseId);
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { status: true },
    });
    if (course.status === 'ARCHIVED') {
      throw badRequest('The course is archived');
    }
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
