import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SITE_CAROUSEL_MAX } from '../../libs/config';
import type { SitePostAdmin } from '../../libs/dto/site/site';
import type { SaveSitePostInput } from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import { SitePublishMode } from '../../libs/enums/site.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AuditService } from '../audit/audit.service';
import { SiteImages } from './site-images';
import { badRequest, cleanText, shortName, toLocalized } from './site-text';

/** Prisma writes SQL NULL into a Json column with this marker */
const DbNull = Prisma.DbNull;

const POST_INCLUDE = {
  cover: { select: { s3Key: true } },
  createdBy: { select: { firstName: true, lastName: true } },
  updatedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.SitePostInclude;
type PostRow = Prisma.SitePostGetPayload<{ include: typeof POST_INCLUDE }>;

/**
 * News & Events of the public website (Stitch "Campusly Admin — Website: News & Events").
 * Publish now / schedule (a future publishedAt) / draft; up to 5 posts in the home page slider,
 * in the admin's order. Archive instead of delete; every change is audited.
 */
@Injectable()
export class SitePostService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly images: SiteImages,
  ) {}

  /** Every post that is not archived, newest first (the page filters in the browser) */
  public async list(): Promise<SitePostAdmin[]> {
    const rows = await this.prismaService.sitePost.findMany({
      where: { archivedAt: null },
      include: POST_INCLUDE,
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.toAdmin(row));
  }

  public async save(
    admin: AuthUser,
    input: SaveSitePostInput,
  ): Promise<SitePostAdmin> {
    const before = input.id ? await this.findActive(input.id) : null;
    const isEvent = input.type === 'EVENT';
    if (isEvent && !input.eventDate) throw badRequest('An event needs a date');
    if (
      isEvent &&
      input.startTime &&
      input.endTime &&
      input.endTime <= input.startTime
    ) {
      throw badRequest('The event must end after it starts');
    }
    const publishedAt = this.publishedAt(input, before);
    const image = await this.images.nextImage(
      input.coverAssetId,
      input.removeCover,
    );
    const data = {
      type: input.type,
      title: cleanText(input.title, 'Title', 150)!,
      summary: cleanText(input.summary, 'Short description', 160)!,
      body: cleanText(input.body, 'Full text', 20_000, false) ?? DbNull,
      eventDate: isEvent ? toDbDate(input.eventDate!) : null,
      startTime: isEvent ? (input.startTime ?? null) : null,
      endTime: isEvent ? (input.endTime ?? null) : null,
      place: isEvent
        ? (cleanText(input.place, 'Place', 120, false) ?? DbNull)
        : DbNull,
      status:
        input.publish === SitePublishMode.DRAFT
          ? ('DRAFT' as const)
          : ('PUBLISHED' as const),
      publishedAt,
      coverAssetId: image.assetId,
      coverPath: image.path,
      updatedById: admin.id,
    };

    return this.prismaService.$transaction(async (tx) => {
      const row = before
        ? await tx.sitePost.update({ where: { id: before.id }, data })
        : await tx.sitePost.create({
            data: { ...data, createdById: admin.id },
          });
      await this.placeInCarousel(tx, row.id, input.carouselPosition ?? null);
      const after = this.toAdmin(
        await tx.sitePost.findUniqueOrThrow({
          where: { id: row.id },
          include: POST_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action: before
          ? AuditAction.SITE_POST_UPDATE
          : AuditAction.SITE_POST_CREATE,
        entityType: 'SitePost',
        entityId: row.id,
        before: before ?? undefined,
        after,
      });
      return after;
    });
  }

  /** "Archive post" (no hard delete): it leaves the site and the slider; the row stays */
  public async archive(admin: AuthUser, id: string): Promise<SitePostAdmin> {
    const before = await this.findActive(id);
    return this.prismaService.$transaction(async (tx) => {
      await tx.sitePost.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          updatedById: admin.id,
        },
      });
      await this.placeInCarousel(tx, id, null);
      const after = this.toAdmin(
        await tx.sitePost.findUniqueOrThrow({
          where: { id },
          include: POST_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_POST_ARCHIVE,
        entityType: 'SitePost',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  }

  /** Now / the scheduled time / null for a draft. Re-saving a published post keeps its date */
  private publishedAt(
    input: SaveSitePostInput,
    before: SitePostAdmin | null,
  ): Date | null {
    switch (input.publish) {
      case SitePublishMode.DRAFT:
        return null;
      case SitePublishMode.SCHEDULE:
        if (!input.scheduledAt || input.scheduledAt.getTime() <= Date.now()) {
          throw badRequest('Pick a time in the future to schedule');
        }
        return input.scheduledAt;
      case SitePublishMode.NOW: {
        const was = before?.publishedAt;
        return was && was.getTime() <= Date.now() ? was : new Date();
      }
    }
  }

  /**
   * Puts the post at `position` in the slider (1 = first) and numbers the others 1…n again, or
   * takes it out (null). The slider holds at most SITE_CAROUSEL_MAX posts.
   */
  private async placeInCarousel(
    tx: Prisma.TransactionClient,
    postId: string,
    position: number | null,
  ): Promise<void> {
    const others = await tx.sitePost.findMany({
      where: {
        carouselOrder: { not: null },
        archivedAt: null,
        id: { not: postId },
      },
      orderBy: { carouselOrder: 'asc' },
      select: { id: true },
    });
    const ids = others.map((o) => o.id);
    if (position !== null) {
      if (ids.length >= SITE_CAROUSEL_MAX) {
        throw new BadRequestException({
          code: ErrorCode.SITE_CAROUSEL_FULL,
          message: `The slider already has ${SITE_CAROUSEL_MAX} posts`,
        });
      }
      ids.splice(Math.min(position - 1, ids.length), 0, postId);
    } else {
      await tx.sitePost.update({
        where: { id: postId },
        data: { carouselOrder: null },
      });
    }
    for (const [i, id] of ids.entries()) {
      await tx.sitePost.update({
        where: { id },
        data: { carouselOrder: i + 1 },
      });
    }
  }

  private async findActive(id: string): Promise<SitePostAdmin> {
    const row = await this.prismaService.sitePost.findFirst({
      where: { id, archivedAt: null },
      include: POST_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Post not found',
      });
    }
    return this.toAdmin(row);
  }

  private toAdmin(row: PostRow): SitePostAdmin {
    return {
      id: row.id,
      type: row.type,
      title: toLocalized(row.title)!,
      summary: toLocalized(row.summary)!,
      body: toLocalized(row.body),
      coverUrl: this.images.url({ asset: row.cover, path: row.coverPath }),
      eventDate: row.eventDate ? fromDbDate(row.eventDate) : null,
      startTime: row.startTime,
      endTime: row.endTime,
      place: toLocalized(row.place),
      carouselPosition: row.carouselOrder,
      status: row.status,
      publishedAt: row.publishedAt,
      editedBy: shortName(row.updatedBy ?? row.createdBy)!,
      updatedAt: row.updatedAt,
    };
  }
}
