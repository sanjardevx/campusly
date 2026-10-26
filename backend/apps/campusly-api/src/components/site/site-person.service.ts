import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { SitePersonAdmin } from '../../libs/dto/site/site';
import type { SaveSitePersonInput } from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { SiteImages } from './site-images';
import { badRequest, cleanText, toLocalized } from './site-text';

const PERSON_INCLUDE = {
  photo: { select: { s3Key: true } },
} satisfies Prisma.SitePersonInclude;
type PersonRow = Prisma.SitePersonGetPayload<{
  include: typeof PERSON_INCLUDE;
}>;

/**
 * "Our team" (Stitch "Campusly Admin — Website: Our team"): the director in the large card, the
 * others in the admin's order. A person is not a portal user — the website shows whoever the
 * school wants (a CEO has no account). One director at most: marking a new one unmarks the old.
 */
@Injectable()
export class SitePersonService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly images: SiteImages,
  ) {}

  public async list(): Promise<SitePersonAdmin[]> {
    const rows = await this.prismaService.sitePerson.findMany({
      where: { archivedAt: null },
      include: PERSON_INCLUDE,
      orderBy: [{ isDirector: 'desc' }, { order: 'asc' }],
    });
    return rows.map((row) => this.toAdmin(row));
  }

  public async save(
    admin: AuthUser,
    input: SaveSitePersonInput,
  ): Promise<SitePersonAdmin> {
    const before = input.id ? await this.findActive(input.id) : null;
    const image = await this.images.nextImage(
      input.photoAssetId,
      input.removePhoto,
    );
    const data = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: cleanText(input.role, 'Role or subject', 80)!,
      note: cleanText(input.note, 'Note', 120, false) ?? Prisma.DbNull,
      isDirector: input.isDirector,
      photoAssetId: image.assetId,
      photoPath: image.path,
      showOnSite: input.showOnSite,
    };
    if (!data.firstName || !data.lastName)
      throw badRequest('Write the first and last name');

    return this.prismaService.$transaction(async (tx) => {
      if (input.isDirector) {
        await tx.sitePerson.updateMany({
          where: { isDirector: true, id: { not: input.id ?? undefined } },
          data: { isDirector: false },
        });
      }
      const row = before
        ? await tx.sitePerson.update({
            where: { id: before.id },
            data,
            include: PERSON_INCLUDE,
          })
        : await tx.sitePerson.create({
            data: { ...data, order: (await tx.sitePerson.count()) + 1 },
            include: PERSON_INCLUDE,
          });
      const after = this.toAdmin(row);
      await this.auditService.log(tx, {
        actor: admin,
        action: before
          ? AuditAction.SITE_PERSON_UPDATE
          : AuditAction.SITE_PERSON_CREATE,
        entityType: 'SitePerson',
        entityId: row.id,
        before: before ?? undefined,
        after,
      });
      return after;
    });
  }

  public async setVisible(
    admin: AuthUser,
    id: string,
    showOnSite: boolean,
  ): Promise<SitePersonAdmin> {
    const before = await this.findActive(id);
    return this.prismaService.$transaction(async (tx) => {
      const after = this.toAdmin(
        await tx.sitePerson.update({
          where: { id },
          data: { showOnSite },
          include: PERSON_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_PERSON_UPDATE,
        entityType: 'SitePerson',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  }

  /** Drag to reorder: every person (not archived) once, in the new order */
  public async reorder(
    admin: AuthUser,
    ids: string[],
  ): Promise<SitePersonAdmin[]> {
    const active = await this.prismaService.sitePerson.findMany({
      where: { archivedAt: null },
      select: { id: true },
    });
    const known = new Set(active.map((p) => p.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw badRequest('Send every person once');
    }
    await this.prismaService.$transaction(async (tx) => {
      for (const [i, id] of ids.entries()) {
        await tx.sitePerson.update({ where: { id }, data: { order: i + 1 } });
      }
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_PERSON_REORDER,
        entityType: 'SitePerson',
        after: { order: ids },
      });
    });
    return this.list();
  }

  /** Archive instead of delete; programs that named them simply stop showing the name */
  public async archive(admin: AuthUser, id: string): Promise<SitePersonAdmin> {
    const before = await this.findActive(id);
    return this.prismaService.$transaction(async (tx) => {
      const after = this.toAdmin(
        await tx.sitePerson.update({
          where: { id },
          data: {
            archivedAt: new Date(),
            showOnSite: false,
            isDirector: false,
          },
          include: PERSON_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_PERSON_ARCHIVE,
        entityType: 'SitePerson',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  }

  private async findActive(id: string): Promise<SitePersonAdmin> {
    const row = await this.prismaService.sitePerson.findFirst({
      where: { id, archivedAt: null },
      include: PERSON_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Person not found',
      });
    }
    return this.toAdmin(row);
  }

  private toAdmin(row: PersonRow): SitePersonAdmin {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      role: toLocalized(row.role)!,
      note: toLocalized(row.note),
      isDirector: row.isDirector,
      photoUrl: this.images.url({ asset: row.photo, path: row.photoPath }),
      showOnSite: row.showOnSite,
      order: row.order,
    };
  }
}
