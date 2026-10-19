import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import {
  AcademicYear,
  Period,
  SchoolSettings,
} from '../../libs/dto/school/school';
import {
  CreateAcademicYearInput,
  CreatePeriodInput,
  UpdateAcademicYearInput,
  UpdatePeriodInput,
  UpdateSchoolSettingsInput,
} from '../../libs/dto/school/school.input';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, isValidTimeZone, toDbDate } from '../../libs/utils/date';
import { AuditService } from '../audit/audit.service';

/** Used until the admin saves the settings for the first time (one row, id = 1) */
const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'Campusly School',
  timezone: 'Asia/Tashkent',
  defaultLocale: 'en',
  mark5MinPercent: 86,
  mark4MinPercent: 71,
  mark3MinPercent: 56,
  defaultHomeworkWeight: 30,
  defaultQuizWeight: 30,
  defaultExamWeight: 40,
};

@Injectable()
export class SchoolService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ───────────────────────── settings ─────────────────────────

  public async getSettings(): Promise<SchoolSettings> {
    const row = await this.prismaService.schoolSetting.findUnique({
      where: { id: 1 },
      omit: { id: true, updatedAt: true },
    });
    return row ?? DEFAULT_SETTINGS;
  }

  public async updateSettings(
    admin: AuthUser,
    input: UpdateSchoolSettingsInput,
  ): Promise<SchoolSettings> {
    const before = await this.getSettings();
    // Only the given fields change (null / missing = keep)
    const after: SchoolSettings = { ...before, ...withoutEmpty(input) };

    if (!isValidTimeZone(after.timezone)) {
      throw badRequest(`Unknown timezone: ${after.timezone}`);
    }
    if (!(
      after.mark5MinPercent > after.mark4MinPercent &&
      after.mark4MinPercent > after.mark3MinPercent
    )) {
      throw badRequest('Mark thresholds must go down: 5 > 4 > 3');
    }
    const weights =
      after.defaultHomeworkWeight +
      after.defaultQuizWeight +
      after.defaultExamWeight;
    if (weights !== 100) {
      throw badRequest(`Category weights must add up to 100 (now ${weights})`);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.schoolSetting.upsert({
        where: { id: 1 },
        create: { id: 1, ...after },
        update: after,
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SETTINGS_UPDATE,
        entityType: 'SchoolSetting',
        entityId: '1',
        before,
        after,
      });
    });
    return after;
  }

  // ─────────────────────── academic years ───────────────────────

  public async getAcademicYears(): Promise<AcademicYear[]> {
    const years = await this.prismaService.academicYear.findMany({
      orderBy: { startsAt: 'desc' },
    });
    return years.map(toYear);
  }

  public async getCurrentAcademicYear(): Promise<AcademicYear | null> {
    const year = await this.prismaService.academicYear.findFirst({
      where: { isCurrent: true },
    });
    return year ? toYear(year) : null;
  }

  public async createAcademicYear(
    admin: AuthUser,
    input: CreateAcademicYearInput,
  ): Promise<AcademicYear> {
    const startsAt = toDbDate(input.startsAt);
    const endsAt = toDbDate(input.endsAt);
    assertRange(startsAt, endsAt);
    await this.assertNoYearOverlap(startsAt, endsAt);

    // A duplicate name is caught by the unique index → CONFLICT (formatGraphqlError)
    const year = await this.prismaService.$transaction(async (tx) => {
      if (input.isCurrent) await this.clearCurrentYear(tx);
      const created = await tx.academicYear.create({
        data: {
          name: input.name,
          startsAt,
          endsAt,
          isCurrent: input.isCurrent ?? false,
        },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.ACADEMIC_YEAR_CREATE,
        entityType: 'AcademicYear',
        entityId: created.id,
        after: created,
      });
      return created;
    });
    return toYear(year);
  }

  public async updateAcademicYear(
    admin: AuthUser,
    input: UpdateAcademicYearInput,
  ): Promise<AcademicYear> {
    const before = await this.findYear(input.id);
    const startsAt = input.startsAt
      ? toDbDate(input.startsAt)
      : before.startsAt;
    const endsAt = input.endsAt ? toDbDate(input.endsAt) : before.endsAt;
    assertRange(startsAt, endsAt);
    await this.assertNoYearOverlap(startsAt, endsAt, before.id);

    // Shrinking the year must not leave a quarter outside it
    const outside = await this.prismaService.period.count({
      where: {
        academicYearId: before.id,
        OR: [{ startsAt: { lt: startsAt } }, { endsAt: { gt: endsAt } }],
      },
    });
    if (outside > 0) {
      throw badRequest(`${outside} period(s) would end up outside the year`);
    }

    const year = await this.prismaService.$transaction(async (tx) => {
      const after = await tx.academicYear.update({
        where: { id: before.id },
        data: { name: input.name ?? undefined, startsAt, endsAt },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.ACADEMIC_YEAR_UPDATE,
        entityType: 'AcademicYear',
        entityId: after.id,
        before,
        after,
      });
      return after;
    });
    return toYear(year);
  }

  /** Exactly one current year (Prisma cannot express a partial unique index) */
  public async setCurrentAcademicYear(
    admin: AuthUser,
    id: string,
  ): Promise<AcademicYear> {
    const before = await this.findYear(id);
    const year = await this.prismaService.$transaction(async (tx) => {
      await this.clearCurrentYear(tx);
      const after = await tx.academicYear.update({
        where: { id },
        data: { isCurrent: true },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.ACADEMIC_YEAR_UPDATE,
        entityType: 'AcademicYear',
        entityId: id,
        before: { isCurrent: before.isCurrent },
        after: { isCurrent: true },
      });
      return after;
    });
    return toYear(year);
  }

  /**
   * Two admins switching the current year at the same moment could both "clear, then set" and
   * leave two current years. The advisory lock makes the second transaction wait for the first.
   */
  private async clearCurrentYear(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('current_academic_year'))`;
    await tx.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });
  }

  private async assertNoYearOverlap(
    startsAt: Date,
    endsAt: Date,
    exceptId?: string,
  ) {
    const overlap = await this.prismaService.academicYear.findFirst({
      where: {
        id: exceptId ? { not: exceptId } : undefined,
        startsAt: { lte: endsAt },
        endsAt: { gte: startsAt },
      },
      select: { name: true },
    });
    if (overlap) throw badRequest(`Dates overlap the year ${overlap.name}`);
  }

  private async findYear(id: string) {
    const year = await this.prismaService.academicYear.findUnique({
      where: { id },
    });
    if (!year) throw notFound('Academic year not found');
    return year;
  }

  // ───────────────────────── periods ─────────────────────────

  public async getPeriods(academicYearId: string): Promise<Period[]> {
    const periods = await this.prismaService.period.findMany({
      where: { academicYearId },
      orderBy: [{ kind: 'asc' }, { order: 'asc' }],
    });
    return periods.map(toPeriod);
  }

  public async createPeriod(
    admin: AuthUser,
    input: CreatePeriodInput,
  ): Promise<Period> {
    const startsAt = toDbDate(input.startsAt);
    const endsAt = toDbDate(input.endsAt);
    await this.assertPeriodFits({
      academicYearId: input.academicYearId,
      parentId: input.parentId ?? null,
      kind: input.kind,
      startsAt,
      endsAt,
    });

    const period = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.period.create({
        data: { ...input, parentId: input.parentId ?? null, startsAt, endsAt },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.PERIOD_CREATE,
        entityType: 'Period',
        entityId: created.id,
        after: created,
      });
      return created;
    });
    return toPeriod(period);
  }

  public async updatePeriod(
    admin: AuthUser,
    input: UpdatePeriodInput,
  ): Promise<Period> {
    const before = await this.prismaService.period.findUnique({
      where: { id: input.id },
    });
    if (!before) throw notFound('Period not found');
    const startsAt = input.startsAt
      ? toDbDate(input.startsAt)
      : before.startsAt;
    const endsAt = input.endsAt ? toDbDate(input.endsAt) : before.endsAt;
    await this.assertPeriodFits({ ...before, startsAt, endsAt }, before.id);

    const period = await this.prismaService.$transaction(async (tx) => {
      const after = await tx.period.update({
        where: { id: before.id },
        data: {
          name: input.name ?? undefined,
          order: input.order ?? undefined,
          startsAt,
          endsAt,
        },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.PERIOD_UPDATE,
        entityType: 'Period',
        entityId: after.id,
        before,
        after,
      });
      return after;
    });
    return toPeriod(period);
  }

  /**
   * A period lies inside its year (and inside its parent semester), and periods of the same kind
   * do not overlap: an assignment belongs to exactly one quarter by its due date (DECISIONS §10).
   */
  private async assertPeriodFits(
    p: {
      academicYearId: string;
      parentId: string | null;
      kind: Period['kind'];
      startsAt: Date;
      endsAt: Date;
    },
    exceptId?: string,
  ) {
    assertRange(p.startsAt, p.endsAt);
    const year = await this.findYear(p.academicYearId);
    if (p.startsAt < year.startsAt || p.endsAt > year.endsAt) {
      throw badRequest(`The period must be inside ${year.name}`);
    }
    if (p.parentId) {
      const parent = await this.prismaService.period.findUnique({
        where: { id: p.parentId },
      });
      if (!parent || parent.academicYearId !== p.academicYearId) {
        throw badRequest('The parent period must belong to the same year');
      }
      if (p.startsAt < parent.startsAt || p.endsAt > parent.endsAt) {
        throw badRequest(`The period must be inside ${parent.name}`);
      }
    }
    const overlap = await this.prismaService.period.findFirst({
      where: {
        id: exceptId ? { not: exceptId } : undefined,
        academicYearId: p.academicYearId,
        kind: p.kind,
        startsAt: { lte: p.endsAt },
        endsAt: { gte: p.startsAt },
      },
      select: { name: true },
    });
    if (overlap) throw badRequest(`Dates overlap ${overlap.name}`);
  }
}

// ───────────────────────── helpers ─────────────────────────

function toYear(year: {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  isCurrent: boolean;
}): AcademicYear {
  return {
    id: year.id,
    name: year.name,
    startsAt: fromDbDate(year.startsAt),
    endsAt: fromDbDate(year.endsAt),
    isCurrent: year.isCurrent,
  };
}

function toPeriod(period: {
  id: string;
  academicYearId: string;
  parentId: string | null;
  kind: Period['kind'];
  name: string;
  order: number;
  startsAt: Date;
  endsAt: Date;
}): Period {
  return {
    ...period,
    startsAt: fromDbDate(period.startsAt),
    endsAt: fromDbDate(period.endsAt),
  };
}

function assertRange(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt)
    throw badRequest('The end date must be after the start date');
}

/** Drops null / undefined so a partial update keeps the old values */
function withoutEmpty<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
