import {
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
  UpdateAnnouncementInput,
} from '../../libs/dto/announcement/announcement.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AccessPolicy } from '../auth/policies/access.policy';

const INCLUDE = {
  course: { select: { title: true } },
  author: { select: { firstName: true, lastName: true, role: true } },
  _count: { select: { reads: true } },
} satisfies Prisma.AnnouncementInclude;
type Row = Prisma.AnnouncementGetPayload<{ include: typeof INCLUDE }>;

/** School-wide announcements (admins) and course announcements (the course's teachers) */
@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

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
    if (!before) throw notFound('Announcement not found');
    await this.assertCanWrite(user, before.courseId);

    const row = await this.prismaService.announcement.update({
      where: { id: before.id },
      data: {
        title: input.title?.trim(),
        body: input.body,
        isPinned: input.isPinned,
        eventDate: input.eventDate ? toDbDate(input.eventDate) : undefined,
      },
      include: INCLUDE,
    });
    return toAnnouncement(row, user, await this.isRead(user, row.id));
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
    // The scope is one AND item: a filter from the client can never widen it
    const where: Prisma.AnnouncementWhereInput = {
      AND: [
        this.visibleTo(user),
        input.courseId ? { courseId: input.courseId } : {},
      ],
    };

    const [total, unread, rows] = await this.prismaService.$transaction([
      this.prismaService.announcement.count({ where }),
      this.prismaService.announcement.count({
        where: { AND: [where, { reads: { none: { userId: user.id } } }] },
      }),
      this.prismaService.announcement.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...INCLUDE,
          reads: { where: { userId: user.id }, select: { userId: true } },
        },
      }),
    ]);
    return {
      total,
      unread,
      list: rows.map((r) => toAnnouncement(r, user, r.reads.length > 0)),
    };
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
  };
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
