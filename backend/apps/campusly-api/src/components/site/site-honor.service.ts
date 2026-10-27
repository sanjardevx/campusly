import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { SiteHonorStudentAdmin } from '../../libs/dto/site/site';
import type { SaveSiteHonorStudentInput } from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AuditService } from '../audit/audit.service';
import { SiteImages } from './site-images';
import { badRequest, cleanText, toLocalized } from './site-text';

const HONOR_INCLUDE = {
  student: {
    select: { id: true, firstName: true, lastName: true, loginId: true },
  },
  photo: { select: { s3Key: true } },
} satisfies Prisma.SiteHonorStudentInclude;
type HonorRow = Prisma.SiteHonorStudentGetPayload<{
  include: typeof HONOR_INCLUDE;
}>;

/**
 * Honor Students (Stitch "Campusly Admin — Website: Honor Students"): a real student's medal or
 * exam score on the public site, in the admin's order. The name comes from the student's profile
 * and the class is kept as it was when the result was won. A child appears on the site only with
 * the parents' consent (SITE_CONSENT_REQUIRED otherwise), and the site shows "Madina A." only.
 */
@Injectable()
export class SiteHonorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly images: SiteImages,
  ) {}

  public async list(): Promise<SiteHonorStudentAdmin[]> {
    const rows = await this.prismaService.siteHonorStudent.findMany({
      where: { archivedAt: null },
      include: HONOR_INCLUDE,
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => this.toAdmin(r));
  }

  public async save(
    admin: AuthUser,
    input: SaveSiteHonorStudentInput,
  ): Promise<SiteHonorStudentAdmin> {
    const before = input.id ? await this.findActive(input.id) : null;
    assertConsent(input.showOnSite, input.parentConsent);
    const medal = input.resultType === 'MEDAL';
    if (medal && !input.place)
      throw badRequest('Pick the place: 1st, 2nd or 3rd');
    const score = input.score?.trim();
    if (!medal && !score) throw badRequest('Write the score, e.g. IELTS 8.0');

    // The client sends only the id: the user must really be a student
    const student = await this.prismaService.user.findFirst({
      where: { id: input.studentId, role: 'STUDENT' },
      select: {
        id: true,
        groupMemberships: {
          where: { leftAt: null },
          select: { group: { select: { name: true } } },
          orderBy: { joinedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!student) throw badRequest('Pick a student');
    // The class is taken when the student is picked; it stays when only the text is edited
    const className =
      before && before.student.id === student.id
        ? before.className
        : (student.groupMemberships[0]?.group.name ?? null);

    const image = await this.images.nextImage(
      input.photoAssetId,
      input.removePhoto,
    );
    const data = {
      studentId: student.id,
      className,
      resultType: input.resultType,
      place: medal ? input.place! : null,
      score: medal ? null : score!,
      subject: cleanText(input.subject, 'Subject or sport', 60)!,
      competition: cleanText(input.competition, 'Competition', 120)!,
      location: cleanText(input.location, 'Place', 60, false) ?? Prisma.DbNull,
      achievedOn: toDbDate(input.achievedOn),
      photoAssetId: image.assetId,
      photoPath: image.path,
      parentConsent: input.parentConsent,
      showOnSite: input.showOnSite,
    };

    return this.prismaService.$transaction(async (tx) => {
      const row = before
        ? await tx.siteHonorStudent.update({
            where: { id: before.id },
            data,
            include: HONOR_INCLUDE,
          })
        : await tx.siteHonorStudent.create({
            // A new result goes to the end of the list
            data: {
              ...data,
              order: (await tx.siteHonorStudent.count()) + 1,
            },
            include: HONOR_INCLUDE,
          });
      const after = this.toAdmin(row);
      await this.auditService.log(tx, {
        actor: admin,
        action: before
          ? AuditAction.SITE_HONOR_UPDATE
          : AuditAction.SITE_HONOR_CREATE,
        entityType: 'SiteHonorStudent',
        entityId: row.id,
        before: before ?? undefined,
        after,
      });
      return after;
    });
  }

  /** The visibility switch in the list */
  public async setVisible(
    admin: AuthUser,
    id: string,
    showOnSite: boolean,
  ): Promise<SiteHonorStudentAdmin> {
    const before = await this.findActive(id);
    assertConsent(showOnSite, before.parentConsent);
    return this.update(admin, before, { showOnSite });
  }

  /** Drag to reorder: the full list of ids in the new order */
  public async reorder(
    admin: AuthUser,
    ids: string[],
  ): Promise<SiteHonorStudentAdmin[]> {
    const active = await this.prismaService.siteHonorStudent.findMany({
      where: { archivedAt: null },
      select: { id: true },
    });
    const known = new Set(active.map((h) => h.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw badRequest('Send every honor student once');
    }
    await this.prismaService.$transaction(async (tx) => {
      for (const [i, id] of ids.entries()) {
        await tx.siteHonorStudent.update({
          where: { id },
          data: { order: i + 1 },
        });
      }
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SITE_HONOR_REORDER,
        entityType: 'SiteHonorStudent',
        after: { order: ids },
      });
    });
    return this.list();
  }

  public async archive(
    admin: AuthUser,
    id: string,
  ): Promise<SiteHonorStudentAdmin> {
    const before = await this.findActive(id);
    return this.update(
      admin,
      before,
      { archivedAt: new Date(), showOnSite: false },
      AuditAction.SITE_HONOR_ARCHIVE,
    );
  }

  private async update(
    admin: AuthUser,
    before: SiteHonorStudentAdmin,
    data: Prisma.SiteHonorStudentUpdateInput,
    action = AuditAction.SITE_HONOR_UPDATE,
  ): Promise<SiteHonorStudentAdmin> {
    return this.prismaService.$transaction(async (tx) => {
      const after = this.toAdmin(
        await tx.siteHonorStudent.update({
          where: { id: before.id },
          data,
          include: HONOR_INCLUDE,
        }),
      );
      await this.auditService.log(tx, {
        actor: admin,
        action,
        entityType: 'SiteHonorStudent',
        entityId: before.id,
        before,
        after,
      });
      return after;
    });
  }

  private async findActive(id: string): Promise<SiteHonorStudentAdmin> {
    const row = await this.prismaService.siteHonorStudent.findFirst({
      where: { id, archivedAt: null },
      include: HONOR_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Honor student not found',
      });
    }
    return this.toAdmin(row);
  }

  private toAdmin(row: HonorRow): SiteHonorStudentAdmin {
    return {
      id: row.id,
      student: row.student,
      className: row.className,
      resultType: row.resultType,
      place: row.place,
      score: row.score,
      subject: toLocalized(row.subject)!,
      competition: toLocalized(row.competition)!,
      location: toLocalized(row.location),
      achievedOn: fromDbDate(row.achievedOn),
      photoUrl: this.images.url({ asset: row.photo, path: row.photoPath }),
      parentConsent: row.parentConsent,
      showOnSite: row.showOnSite,
      order: row.order,
      createdAt: row.createdAt,
    };
  }
}

function assertConsent(showOnSite: boolean, parentConsent: boolean) {
  if (showOnSite && !parentConsent) {
    throw new BadRequestException({
      code: ErrorCode.SITE_CONSENT_REQUIRED,
      message: "A child is shown on the website only with the parents' consent",
    });
  }
}
