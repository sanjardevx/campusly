import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  Announcement,
  Announcements,
} from '../../libs/dto/announcement/announcement';
import {
  AnnouncementsInquiry,
  CreateAnnouncementInput,
  CreateCourseAnnouncementsInput,
  UpdateAnnouncementInput,
} from '../../libs/dto/announcement/announcement.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AuditService } from '../audit/audit.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { COURSE_FILE_SELECT, toCourseFile } from '../media/course-file';

const INCLUDE = {
  course: { select: { title: true } },
  author: { select: { firstName: true, lastName: true, role: true } },
  _count: { select: { reads: true } },
  files: {
    where: { removedAt: null },
    orderBy: { order: 'asc' },
    include: { asset: { select: COURSE_FILE_SELECT } },
  },
} satisfies Prisma.AnnouncementInclude;
type Row = Prisma.AnnouncementGetPayload<{ include: typeof INCLUDE }>;

/** School-wide announcements (admins) and course announcements (the course's teachers) */
@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditService: AuditService,
  ) {}

  /**
   * The teacher's drawer: one announcement per chosen course (DECISIONS), all in one transaction —
   * either every course gets it or none. Each course is checked (its teacher, not archived).
   */
  public async createCourseAnnouncements(
    user: AuthUser,
    input: CreateCourseAnnouncementsInput,
  ): Promise<Announcement[]> {
    for (const courseId of input.courseIds) {
      await this.accessPolicy.assertCanEditCourse(user, courseId);
    }
    const fileIds = input.fileAssetIds ?? [];
    await this.assertOwnFiles(user, fileIds, input.courseIds);

    const ids = await this.prismaService.$transaction(async (tx) => {
      const created: string[] = [];
      for (const courseId of input.courseIds) {
        const row = await tx.announcement.create({
          data: {
            courseId,
            authorId: user.id,
            title: input.title.trim(),
            body: input.body,
            isPinned: input.isPinned ?? false,
            files: {
              create: fileIds.map((assetId, order) => ({ assetId, order })),
            },
          },
        });
        created.push(row.id);
      }
      return created;
    });
    const rows = await this.prismaService.announcement.findMany({
      where: { id: { in: ids } },
      include: INCLUDE,
    });
    return this.withAudience(rows, user, new Set());
  }

  /** Taken down: nobody sees it any more, the row and its reads stay (no hard deletes) */
  public async archiveAnnouncement(
    user: AuthUser,
    id: string,
  ): Promise<Announcement> {
    const before = await this.prismaService.announcement.findUnique({
      where: { id },
    });
    if (!before || before.status === 'ARCHIVED') {
      throw notFound('Announcement not found');
    }
    await this.assertCanWrite(user, before.courseId);
    const row = await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.announcement.update({
        where: { id },
        data: { status: 'ARCHIVED' },
        include: INCLUDE,
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.ANNOUNCEMENT_ARCHIVE,
        entityType: 'Announcement',
        entityId: id,
        before: { status: before.status, title: before.title },
        after: { status: 'ARCHIVED' },
      });
      return updated;
    });
    return toAnnouncement(row, user, false);
  }

  public async createAnnouncement(
    user: AuthUser,
    input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    await this.assertCanWrite(user, input.courseId ?? null);
    const row = await this.prismaService.announcement.create({
      data: {
        courseId: input.courseId,
        authorId: user.id,
        title: input.title.trim(),
        body: input.body,
        isPinned: input.isPinned ?? false,
        eventDate: input.eventDate ? toDbDate(input.eventDate) : undefined,
      },
      include: INCLUDE,
    });
    return toAnnouncement(row, user, false);
  }

  public async updateAnnouncement(
    user: AuthUser,
    input: UpdateAnnouncementInput,
  ): Promise<Announcement> {
    const before = await this.prismaService.announcement.findUnique({
      where: { id: input.id },
    });
    if (!before || before.status === 'ARCHIVED') {
      throw notFound('Announcement not found');
    }
    await this.assertCanWrite(user, before.courseId);
    if (input.fileAssetIds) {
      await this.assertOwnFiles(
        user,
        input.fileAssetIds,
        before.courseId ? [before.courseId] : [],
      );
    }

    const row = await this.prismaService.$transaction(async (tx) => {
      if (input.fileAssetIds) {
        await syncFiles(tx, before.id, input.fileAssetIds);
      }
      return tx.announcement.update({
        where: { id: before.id },
        data: {
          title: input.title?.trim(),
          body: input.body,
          isPinned: input.isPinned,
          eventDate: input.eventDate ? toDbDate(input.eventDate) : undefined,
        },
        include: INCLUDE,
      });
    });
    const [view] = await this.withAudience(
      [row],
      user,
      (await this.isRead(user, row.id)) ? new Set([row.id]) : new Set(),
    );
    return view;
  }

  /** What the viewer may see: school-wide plus their courses; pinned first, newest first */
  public async getAnnouncements(
    user: AuthUser,
    input: AnnouncementsInquiry = {},
  ): Promise<Announcements> {
    if (input.courseId) {
      await this.accessPolicy.assertCanViewCourse(user, input.courseId);
    }
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const child = await this.childFilter(user, input.studentId);
    // The scope is one AND item: a filter from the client can never widen it
    const base: Prisma.AnnouncementWhereInput = {
      AND: [
        this.visibleTo(user),
        child,
        input.courseId ? { courseId: input.courseId } : {},
        input.search?.trim()
          ? {
              OR: [
                {
                  title: { contains: input.search.trim(), mode: 'insensitive' },
                },
                {
                  body: { contains: input.search.trim(), mode: 'insensitive' },
                },
              ],
            }
          : {},
      ],
    };
    const notRead = { reads: { none: { userId: user.id } } };
    // The tab narrows the list; the tab counts are taken on `base`
    const where: Prisma.AnnouncementWhereInput = {
      AND: [
        base,
        input.unreadOnly ? notRead : {},
        input.schoolOnly ? { courseId: null } : {},
      ],
    };

    const [total, all, unread, school, rows] =
      await this.prismaService.$transaction([
        this.prismaService.announcement.count({ where }),
        this.prismaService.announcement.count({ where: base }),
        this.prismaService.announcement.count({
          where: { AND: [base, notRead] },
        }),
        this.prismaService.announcement.count({
          where: { AND: [base, { courseId: null }] },
        }),
        this.prismaService.announcement.findMany({
          where,
          orderBy: [
            { isPinned: 'desc' },
            { publishedAt: 'desc' },
            { id: 'asc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
          include: {
            ...INCLUDE,
            reads: { where: { userId: user.id }, select: { userId: true } },
          },
        }),
      ]);
    const read = new Set(rows.filter((r) => r.reads.length).map((r) => r.id));
    return {
      total,
      all,
      unread,
      school,
      list: await this.withAudience(rows, user, read),
    };
  }

  /** "Mark all as read": every announcement the viewer may see (a parent: of one child); returns how many were new */
  public async markAllAnnouncementsRead(
    user: AuthUser,
    studentId?: string,
  ): Promise<number> {
    const child = await this.childFilter(user, studentId);
    const unread = await this.prismaService.announcement.findMany({
      where: {
        AND: [
          this.visibleTo(user),
          child,
          { reads: { none: { userId: user.id } } },
        ],
      },
      select: { id: true },
    });
    if (!unread.length) return 0;
    // skipDuplicates: a parallel click or another tab may have added some rows already
    const { count } = await this.prismaService.announcementRead.createMany({
      data: unread.map((a) => ({ announcementId: a.id, userId: user.id })),
      skipDuplicates: true,
    });
    return count;
  }

  /** Twice is fine: one row per user (composite key) */
  public async markAnnouncementRead(
    user: AuthUser,
    announcementId: string,
  ): Promise<Announcement> {
    const row = await this.prismaService.announcement.findFirst({
      where: { AND: [{ id: announcementId }, this.visibleTo(user)] },
    });
    // Not for this viewer → it "does not exist"
    if (!row) throw notFound('Announcement not found');

    await this.prismaService.announcementRead.upsert({
      where: {
        announcementId_userId: { announcementId: row.id, userId: user.id },
      },
      create: { announcementId: row.id, userId: user.id },
      update: {},
    });
    const updated = await this.prismaService.announcement.findUniqueOrThrow({
      where: { id: row.id },
      include: INCLUDE,
    });
    return toAnnouncement(updated, user, true);
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Published, and school-wide or of a course the viewer may see (not a draft for learners) */
  private visibleTo(user: AuthUser): Prisma.AnnouncementWhereInput {
    const learner = user.role === 'STUDENT' || user.role === 'PARENT';
    return {
      status: 'ACTIVE',
      publishedAt: { lte: new Date() },
      OR: [
        { courseId: null },
        {
          course: {
            AND: [
              this.accessPolicy.courseScope(user),
              learner ? { status: { not: 'DRAFT' } } : {},
            ],
          },
        },
      ],
    };
  }

  /**
   * A parent with several children looks at one child at a time (?child=): school-wide plus that
   * child's courses. resolveStudentScope checks the link (someone else's child → NOT_FOUND).
   */
  private async childFilter(
    user: AuthUser,
    studentId?: string,
  ): Promise<Prisma.AnnouncementWhereInput> {
    if (!studentId) return {};
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    return {
      OR: [
        { courseId: null },
        {
          course: {
            enrollments: { some: { studentId: id, status: 'ACTIVE' } },
          },
        },
      ],
    };
  }

  /** School-wide: admins only. A course: its teachers (or admins), not archived. */
  private async assertCanWrite(user: AuthUser, courseId: string | null) {
    if (courseId) {
      await this.accessPolicy.assertCanEditCourse(user, courseId);
    } else if (user.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Only admins can post school-wide announcements',
      });
    }
  }

  /**
   * Staff see "52 / 56 read": the course's active students and how many of them opened it
   * (parents' reads are not counted). Students and parents get the plain announcement.
   */
  private async withAudience(
    rows: Row[],
    user: AuthUser,
    read: Set<string>,
  ): Promise<Announcement[]> {
    const staff = user.role === 'TEACHER' || user.role === 'ADMIN';
    if (!staff) return rows.map((r) => toAnnouncement(r, user, read.has(r.id)));
    const courseIds = [
      ...new Set(rows.map((r) => r.courseId).filter(Boolean)),
    ] as string[];
    const enrolled = await this.prismaService.enrollment.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds }, status: 'ACTIVE' },
      _count: { _all: true },
    });
    const audience = new Map(enrolled.map((e) => [e.courseId, e._count._all]));
    return Promise.all(
      rows.map(async (r) => {
        const view = toAnnouncement(r, user, read.has(r.id));
        if (!r.courseId) return view;
        view.audience = audience.get(r.courseId) ?? 0;
        view.studentReads = await this.prismaService.announcementRead.count({
          where: {
            announcementId: r.id,
            user: {
              enrollments: { some: { courseId: r.courseId, status: 'ACTIVE' } },
            },
          },
        });
        return view;
      }),
    );
  }

  /** Each file: READY document or image, uploaded by this user for one of these courses */
  private async assertOwnFiles(
    user: AuthUser,
    assetIds: string[],
    courseIds: string[],
  ) {
    if (!assetIds.length) return;
    const assets = await this.prismaService.mediaAsset.findMany({
      where: { id: { in: assetIds }, ownerId: user.id },
      select: { s3Key: true, kind: true, status: true },
    });
    const mine = assets.filter((a) =>
      courseIds.some((c) => a.s3Key?.startsWith(`raw/${c}/`)),
    );
    if (mine.length !== assetIds.length) throw notFound('File not found');
    const usable = mine.every(
      (a) =>
        (a.kind === 'DOCUMENT' || a.kind === 'IMAGE') && a.status === 'READY',
    );
    if (!usable) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'A file is not ready (finish the upload first)',
      });
    }
  }

  private async isRead(user: AuthUser, announcementId: string) {
    return (
      (await this.prismaService.announcementRead.count({
        where: { announcementId, userId: user.id },
      })) > 0
    );
  }
}

function toAnnouncement(
  row: Row,
  viewer: AuthUser,
  isRead: boolean,
): Announcement {
  const staff = viewer.role === 'TEACHER' || viewer.role === 'ADMIN';
  return {
    id: row.id,
    courseId: row.courseId,
    courseTitle: row.course?.title ?? null,
    authorName: `${row.author.firstName} ${row.author.lastName}`,
    authorRole: row.author.role,
    title: row.title,
    body: row.body,
    isPinned: row.isPinned,
    eventDate: row.eventDate ? fromDbDate(row.eventDate) : null,
    publishedAt: row.publishedAt,
    isRead,
    readCount: staff ? row._count.reads : null,
    audience: null,
    studentReads: null,
    files: row.files.map((f) => toCourseFile(f.asset)),
  };
}

/** The new list wins: left-out files get removedAt, new ones are added, order follows the list */
async function syncFiles(
  tx: Prisma.TransactionClient,
  announcementId: string,
  assetIds: string[],
) {
  const current = await tx.announcementFile.findMany({
    where: { announcementId, removedAt: null },
  });
  const keep = new Set(assetIds);
  await tx.announcementFile.updateMany({
    where: {
      id: { in: current.filter((f) => !keep.has(f.assetId)).map((f) => f.id) },
    },
    data: { removedAt: new Date() },
  });
  const byAsset = new Map(current.map((f) => [f.assetId, f]));
  for (const [order, assetId] of assetIds.entries()) {
    const file = byAsset.get(assetId);
    if (file)
      await tx.announcementFile.update({
        where: { id: file.id },
        data: { order },
      });
    else
      await tx.announcementFile.create({
        data: { announcementId, assetId, order },
      });
  }
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
