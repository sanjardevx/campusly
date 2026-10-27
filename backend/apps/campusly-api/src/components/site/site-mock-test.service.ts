import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { SiteMockTestAdmin } from '../../libs/dto/site/site';
import type { SaveSiteMockTestInput } from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate, todayInZone } from '../../libs/utils/date';
import { AuditService } from '../audit/audit.service';
import { SchoolService } from '../school/school.service';
import { badRequest, cleanText, toLocalized } from './site-text';

const MOCK_INCLUDE = {
  contactPerson: {
    select: { id: true, firstName: true, lastName: true, role: true },
  },
} satisfies Prisma.SiteMockTestInclude;
type MockRow = Prisma.SiteMockTestGetPayload<{ include: typeof MOCK_INCLUDE }>;

const PHONE = /^\+?[\d\s()-]{7,20}$/;

/**
 * Mock tests (Stitch "Campusly Admin — Website: Mock tests"): paid practice exams open to
 * students from any school. People register by phone, so the admin keeps "taken seats" up to
 * date; the site says "Full" at 0 seats left and hides a test the day after the exam.
 * "Delete" archives (no hard deletes); every change is audited.
 */
@Injectable()
export class SiteMockTestService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly schoolService: SchoolService,
  ) {}

  /** Upcoming first (soonest on top), then past ones (latest on top) */
  public async list(): Promise<SiteMockTestAdmin[]> {
    const rows = await this.prismaService.siteMockTest.findMany({
      where: { archivedAt: null },
      include: MOCK_INCLUDE,
      orderBy: { examDate: 'asc' },
    });
    const today = await this.today();
    const items = rows.map((r) => toAdmin(r, today));
    return [
      ...items.filter((m) => !m.isPast),
      ...items.filter((m) => m.isPast).reverse(),
    ];
  }

  public async save(
    admin: AuthUser,
    input: SaveSiteMockTestInput,
  ): Promise<SiteMockTestAdmin> {
    const before = input.id ? await this.findActive(input.id) : null;
    if (input.takenSeats > input.totalSeats) {
      throw badRequest('Taken seats cannot be more than total seats');
    }
    if (input.contactPersonId) {
      const person = await this.prismaService.sitePerson.count({
        where: { id: input.contactPersonId, archivedAt: null },
      });
      if (!person) throw badRequest('Pick the contact from "Our team"');
    }
    // A landline is fine here (+998 71 …), so only the characters are checked
    const contactPhone = input.contactPhone?.trim() || null;
    if (contactPhone && !PHONE.test(contactPhone)) {
      throw badRequest('Write the phone with digits, spaces, + or -');
    }
    const data = {
      exam: input.exam,
      title: cleanText(input.title, 'Title', 120)!,
      included: cleanText(input.included, "What's included", 100)!,
      examDate: toDbDate(input.examDate),
      startTime: input.startTime,
      durationMin: input.durationMin,
      location: cleanText(input.location, 'Location', 100)!,
      price: input.price,
      totalSeats: input.totalSeats,
      takenSeats: input.takenSeats,
      contactPersonId: input.contactPersonId ?? null,
      contactPhone,
      showOnSite: input.showOnSite,
    };
    const today = await this.today();

    return this.prismaService.$transaction(async (tx) => {
      const row = before
        ? await tx.siteMockTest.update({
            where: { id: before.id },
            data,
            include: MOCK_INCLUDE,
          })
        : await tx.siteMockTest.create({ data, include: MOCK_INCLUDE });
      const after = toAdmin(row, today);
      await this.auditService.log(tx, {
        actor: admin,
        action: before
          ? AuditAction.SITE_MOCK_TEST_UPDATE
          : AuditAction.SITE_MOCK_TEST_CREATE,
        entityType: 'SiteMockTest',
        entityId: row.id,
        before: before ?? undefined,
        after,
      });
      return after;
    });
  }

  /** The "Seat registration" − / + stepper: the number of people who registered by phone */
  public async setTakenSeats(
    admin: AuthUser,
    id: string,
    takenSeats: number,
  ): Promise<SiteMockTestAdmin> {
    const before = await this.findActive(id);
    if (takenSeats < 0 || takenSeats > before.totalSeats) {
      throw badRequest(`Taken seats must be 0–${before.totalSeats}`);
    }
    return this.update(admin, before, { takenSeats });
  }

  /** The "On site" switch in the list */
  public async setVisible(
    admin: AuthUser,
    id: string,
    showOnSite: boolean,
  ): Promise<SiteMockTestAdmin> {
    const before = await this.findActive(id);
    return this.update(admin, before, { showOnSite });
  }

  public async archive(
    admin: AuthUser,
    id: string,
  ): Promise<SiteMockTestAdmin> {
    const before = await this.findActive(id);
    return this.update(
      admin,
      before,
      { archivedAt: new Date(), showOnSite: false },
      AuditAction.SITE_MOCK_TEST_ARCHIVE,
    );
  }

  private async update(
    admin: AuthUser,
    before: SiteMockTestAdmin,
    data: Prisma.SiteMockTestUpdateInput,
    action = AuditAction.SITE_MOCK_TEST_UPDATE,
  ): Promise<SiteMockTestAdmin> {
    const today = await this.today();
    return this.prismaService.$transaction(async (tx) => {
      const row = await tx.siteMockTest.update({
        where: { id: before.id },
        data,
        include: MOCK_INCLUDE,
      });
      const after = toAdmin(row, today);
      await this.auditService.log(tx, {
        actor: admin,
        action,
        entityType: 'SiteMockTest',
        entityId: before.id,
        before,
        after,
      });
      return after;
    });
  }

  private async findActive(id: string): Promise<SiteMockTestAdmin> {
    const row = await this.prismaService.siteMockTest.findFirst({
      where: { id, archivedAt: null },
      include: MOCK_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Mock test not found',
      });
    }
    return toAdmin(row, await this.today());
  }

  /** "Today" in the school's timezone: a test is past once its day is over there */
  private async today(): Promise<string> {
    const { timezone } = await this.schoolService.getSettings();
    return todayInZone(timezone);
  }
}

function toAdmin(row: MockRow, today: string): SiteMockTestAdmin {
  const examDate = fromDbDate(row.examDate);
  const p = row.contactPerson;
  return {
    id: row.id,
    exam: row.exam,
    title: toLocalized(row.title)!,
    included: toLocalized(row.included)!,
    examDate,
    startTime: row.startTime,
    durationMin: row.durationMin,
    location: toLocalized(row.location)!,
    price: row.price,
    totalSeats: row.totalSeats,
    takenSeats: row.takenSeats,
    contactPerson: p
      ? {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          role: toLocalized(p.role)!,
        }
      : null,
    contactPhone: row.contactPhone,
    showOnSite: row.showOnSite,
    isPast: examDate < today,
    updatedAt: row.updatedAt,
  };
}
