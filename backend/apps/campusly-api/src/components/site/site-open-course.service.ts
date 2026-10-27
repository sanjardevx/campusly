import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { SiteOpenCourseAdmin } from '../../libs/dto/site/site';
import type {
  SaveSiteOpenCourseInput,
  SiteOpenLessonInput,
} from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { badRequest, cleanText, toLocalized } from './site-text';

const COURSE_INCLUDE = {
  lessons: { orderBy: { order: 'asc' } },
} satisfies Prisma.SiteOpenCourseInclude;
type CourseRow = Prisma.SiteOpenCourseGetPayload<{
  include: typeof COURSE_INCLUDE;
}>;

/** watch?v=, youtu.be/, shorts/ and embed/ links → the 11-character video id */
const YOUTUBE_ID =
  /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})(?:[?&#/]|$)/;

/**
 * Open Courses (Stitch "Campusly Admin — Website: Open Courses"): free video courses from
 * YouTube on the public site, no sign-up. The drawer sends the whole lesson list each time, so
 * a save replaces the lessons in one transaction. A course needs at least one lesson to be
 * published; "Hide from site" puts it back to draft; archive instead of delete.
 */
@Injectable()
export class SiteOpenCourseService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  public async list(): Promise<SiteOpenCourseAdmin[]> {
    const rows = await this.prismaService.siteOpenCourse.findMany({
      where: { archivedAt: null },
      include: COURSE_INCLUDE,
      orderBy: { order: 'asc' },
    });
    return rows.map(toAdmin);
  }

  public async save(
    admin: AuthUser,
    input: SaveSiteOpenCourseInput,
  ): Promise<SiteOpenCourseAdmin> {
    const before = input.id ? await this.findActive(input.id) : null;
    const lessons = input.lessons.map(toLesson);
    if (input.publish && !lessons.length) {
      throw badRequest('Add at least one lesson before publishing');
    }
    const data = {
      category: input.category,
      title: cleanText(input.title, 'Course title', 120)!,
      source: input.source?.trim() || null,
      description:
        cleanText(input.description, 'Description', 200, false) ??
        Prisma.DbNull,
      status: input.publish ? ('PUBLISHED' as const) : ('DRAFT' as const),
    };

    return this.prismaService.$transaction(async (tx) => {
      const course = before
        ? await tx.siteOpenCourse.update({ where: { id: before.id }, data })
        : await tx.siteOpenCourse.create({
            // A new course goes to the end of the list
            data: { ...data, order: (await tx.siteOpenCourse.count()) + 1 },
          });
      await tx.siteOpenLesson.deleteMany({ where: { courseId: course.id } });
      await tx.siteOpenLesson.createMany({
        data: lessons.map((l, i) => ({ ...l, courseId: course.id, order: i })),
      });
      const after = toAdmin(
        await tx.siteOpenCourse.findUniqueOrThrow({
          where: { id: course.id },
          include: COURSE_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action: before
          ? AuditAction.SITE_OPEN_COURSE_UPDATE
          : AuditAction.SITE_OPEN_COURSE_CREATE,
        entityType: 'SiteOpenCourse',
        entityId: course.id,
        before: before ?? undefined,
        after,
      });
      return after;
    });
  }

  /** "Hide from site" (→ draft) and back */
  public async setPublished(
    admin: AuthUser,
    id: string,
    published: boolean,
  ): Promise<SiteOpenCourseAdmin> {
    const before = await this.findActive(id);
    if (published && !before.lessons.length) {
      throw badRequest('Add at least one lesson before publishing');
    }
    return this.update(admin, before, {
      status: published ? 'PUBLISHED' : 'DRAFT',
    });
  }

  public async archive(
    admin: AuthUser,
    id: string,
  ): Promise<SiteOpenCourseAdmin> {
    const before = await this.findActive(id);
    return this.update(
      admin,
      before,
      { status: 'ARCHIVED', archivedAt: new Date() },
      AuditAction.SITE_OPEN_COURSE_ARCHIVE,
    );
  }

  private async update(
    admin: AuthUser,
    before: SiteOpenCourseAdmin,
    data: Prisma.SiteOpenCourseUpdateInput,
    action = AuditAction.SITE_OPEN_COURSE_UPDATE,
  ): Promise<SiteOpenCourseAdmin> {
    return this.prismaService.$transaction(async (tx) => {
      const after = toAdmin(
        await tx.siteOpenCourse.update({
          where: { id: before.id },
          data,
          include: COURSE_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action,
        entityType: 'SiteOpenCourse',
        entityId: before.id,
        before,
        after,
      });
      return after;
    });
  }

  private async findActive(id: string): Promise<SiteOpenCourseAdmin> {
    const row = await this.prismaService.siteOpenCourse.findFirst({
      where: { id, archivedAt: null },
      include: COURSE_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Course not found',
      });
    }
    return toAdmin(row);
  }
}

/** One drawer row → DB columns; a link that is not a YouTube video is refused */
function toLesson(lesson: SiteOpenLessonInput, index: number) {
  const youtubeId = youtubeIdOf(lesson.youtubeUrl);
  if (!youtubeId) {
    throw badRequest(`Lesson ${index + 1}: use a YouTube video link`);
  }
  const title = lesson.title.trim();
  if (!title) throw badRequest(`Lesson ${index + 1}: write a title`);
  return {
    title,
    youtubeId,
    durationSec: lesson.duration ? toSeconds(lesson.duration) : null,
  };
}

export const youtubeIdOf = (url: string): string | null =>
  YOUTUBE_ID.exec(url.trim())?.[1] ?? null;

/** "8:42" → 522, "1:02:03" → 3723 */
export function toSeconds(duration: string): number {
  return duration
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

function toAdmin(row: CourseRow): SiteOpenCourseAdmin {
  const lessons = row.lessons.map((l) => ({
    title: l.title,
    youtubeId: l.youtubeId,
    durationSec: l.durationSec,
  }));
  return {
    id: row.id,
    category: row.category,
    title: toLocalized(row.title)!,
    source: row.source,
    description: toLocalized(row.description),
    status: row.status,
    lessons,
    totalDurationSec: lessons.reduce((s, l) => s + (l.durationSec ?? 0), 0),
    updatedAt: row.updatedAt,
  };
}
