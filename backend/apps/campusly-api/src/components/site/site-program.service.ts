import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { SiteProgramAdmin } from '../../libs/dto/site/site';
import type { SaveSiteProgramInput } from '../../libs/dto/site/site.input';
import { SITE_DAYS } from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { SiteImages } from './site-images';
import { badRequest, cleanText, shortName, toLocalized } from './site-text';

const PROGRAM_INCLUDE = {
  photo: { select: { s3Key: true } },
  updatedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.SiteProgramInclude;
type ProgramRow = Prisma.SiteProgramGetPayload<{
  include: typeof PROGRAM_INCLUDE;
}>;

/** Only YouTube links (watch, youtu.be, shorts): the public card shows its thumbnail */
const YOUTUBE =
  /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}/;

/**
 * Programs & clubs (Stitch "Campusly Admin — Website: Programs"). The home page shows the first 6
 * that are on the site, in the admin's order. Hide / show with a switch, archive instead of
 * delete; every change is audited.
 */
@Injectable()
export class SiteProgramService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly images: SiteImages,
  ) {}

  public async list(): Promise<SiteProgramAdmin[]> {
    const rows = await this.prismaService.siteProgram.findMany({
      where: { archivedAt: null },
      include: PROGRAM_INCLUDE,
      orderBy: { order: 'asc' },
    });
    return this.toAdminList(rows);
  }

  public async save(
    admin: AuthUser,
    input: SaveSiteProgramInput,
  ): Promise<SiteProgramAdmin> {
    const before = input.id ? await this.findActive(input.id) : null;
    if (input.gradeTo < input.gradeFrom) {
      throw badRequest('"To" grade must not be before "From"');
    }
    if (input.startTime && input.endTime && input.endTime <= input.startTime) {
      throw badRequest('The program must end after it starts');
    }
    const videoUrl = input.videoUrl?.trim() || null;
    if (videoUrl && !YOUTUBE.test(videoUrl)) {
      throw badRequest('Use a YouTube link for the video');
    }
    // Teachers come from "Our team" (people that are not archived)
    const teacherIds = [...new Set(input.teacherIds)];
    const found = await this.prismaService.sitePerson.count({
      where: { id: { in: teacherIds }, archivedAt: null },
    });
    if (found !== teacherIds.length)
      throw badRequest('Pick teachers from "Our team"');

    const image = await this.images.nextImage(
      input.photoAssetId,
      input.removePhoto,
    );
    const data = {
      category: input.category,
      name: cleanText(input.name, 'Name', 100)!,
      gradeFrom: input.gradeFrom,
      gradeTo: input.gradeTo,
      levelNote:
        cleanText(input.levelNote, 'Level note', 60, false) ?? Prisma.DbNull,
      // Mon … Sat in week order, whatever order they were clicked in
      days: SITE_DAYS.filter((d) => input.days.includes(d)),
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      room: input.room?.trim() || null,
      teacherIds,
      description: cleanText(input.description, 'Short description', 100)!,
      photoAssetId: image.assetId,
      photoPath: image.path,
      videoUrl,
      showOnSite: input.showOnSite,
      updatedById: admin.id,
    };

    return this.prismaService.$transaction(async (tx) => {
      const row = before
        ? await tx.siteProgram.update({
            where: { id: before.id },
            data,
            include: PROGRAM_INCLUDE,
          })
        : await tx.siteProgram.create({
            // A new program goes to the end of the list
            data: { ...data, order: (await tx.siteProgram.count()) + 1 },
            include: PROGRAM_INCLUDE,
          });
      const [after] = await this.toAdminList([row]);
      await this.auditService.log(tx, {
        actor: admin,
        action: before
          ? AuditAction.SITE_PROGRAM_UPDATE
          : AuditAction.SITE_PROGRAM_CREATE,
        entityType: 'SiteProgram',
        entityId: row.id,
        before: before ?? undefined,
        after,
      });
      return after;
    });
  }

  /** The "On site" switch in the list */
  public async setVisible(
    admin: AuthUser,
    id: string,
    showOnSite: boolean,
  ): Promise<SiteProgramAdmin> {
    const before = await this.findActive(id);
    return this.prismaService.$transaction(async (tx) => {
      const row = await tx.siteProgram.update({
        where: { id },
        data: { showOnSite, updatedById: admin.id },
        include: PROGRAM_INCLUDE,
      });
      const [after] = await this.toAdminList([row]);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_PROGRAM_UPDATE,
        entityType: 'SiteProgram',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  }

  /** Drag to reorder: the full list of ids in the new order */
  public async reorder(
    admin: AuthUser,
    ids: string[],
  ): Promise<SiteProgramAdmin[]> {
    const active = await this.prismaService.siteProgram.findMany({
      where: { archivedAt: null },
      select: { id: true },
    });
    const known = new Set(active.map((p) => p.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw badRequest('Send every program once');
    }
    await this.prismaService.$transaction(async (tx) => {
      for (const [i, id] of ids.entries()) {
        await tx.siteProgram.update({ where: { id }, data: { order: i + 1 } });
      }
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_PROGRAM_REORDER,
        entityType: 'SiteProgram',
        after: { order: ids },
      });
    });
    return this.list();
  }

  public async archive(admin: AuthUser, id: string): Promise<SiteProgramAdmin> {
    const before = await this.findActive(id);
    return this.prismaService.$transaction(async (tx) => {
      const row = await tx.siteProgram.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          showOnSite: false,
          updatedById: admin.id,
        },
        include: PROGRAM_INCLUDE,
      });
      const [after] = await this.toAdminList([row]);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_PROGRAM_ARCHIVE,
        entityType: 'SiteProgram',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  }

  private async findActive(id: string): Promise<SiteProgramAdmin> {
    const row = await this.prismaService.siteProgram.findFirst({
      where: { id, archivedAt: null },
      include: PROGRAM_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Program not found',
      });
    }
    return (await this.toAdminList([row]))[0];
  }

  /** Rows → admin DTOs, with the teachers' names from "Our team" in one query (people do not change here) */
  private async toAdminList(rows: ProgramRow[]): Promise<SiteProgramAdmin[]> {
    const people = await this.prismaService.sitePerson.findMany({
      where: { id: { in: rows.flatMap((r) => r.teacherIds) } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const byId = new Map(people.map((p) => [p.id, p]));
    return rows.map((row) => ({
      id: row.id,
      category: row.category,
      name: toLocalized(row.name)!,
      gradeFrom: row.gradeFrom,
      gradeTo: row.gradeTo,
      levelNote: toLocalized(row.levelNote),
      days: row.days,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
      teachers: row.teacherIds
        .map((id) => byId.get(id))
        .filter((p) => !!p)
        .map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          role: toLocalized(p.role)!,
        })),
      description: toLocalized(row.description)!,
      photoUrl: this.images.url({ asset: row.photo, path: row.photoPath }),
      videoUrl: row.videoUrl,
      showOnSite: row.showOnSite,
      order: row.order,
      editedBy: shortName(row.updatedBy),
      updatedAt: row.updatedAt,
    }));
  }
}
