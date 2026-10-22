import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SchoolEvent as SchoolEventRow } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SchoolEvent } from '../../libs/dto/school/school-event';
import {
  CreateSchoolEventInput,
  UpdateSchoolEventInput,
} from '../../libs/dto/school/school-event.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate } from '../../libs/utils/date';
import { AuditService } from '../audit/audit.service';

/** A holiday or a programme may span weeks, not a whole term */
const MAX_DAYS = 92;
const DAY_MS = 86_400_000;

/**
 * The school calendar (DECISIONS §14 changed on 2026-10-23): admins add holidays, events,
 * deadlines and starts. Every change is audited; nothing is hard-deleted.
 */
@Injectable()
export class SchoolEventService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  public async create(
    admin: AuthUser,
    input: CreateSchoolEventInput,
  ): Promise<SchoolEvent> {
    const { startsOn, endsOn } = checkDates(
      input.startsOn,
      input.endsOn ?? input.startsOn,
    );
    return this.prismaService.$transaction(async (tx) => {
      const row = await tx.schoolEvent.create({
        data: {
          kind: input.kind,
          title: input.title.trim(),
          startsOn,
          endsOn,
          note: input.note?.trim() || null,
          createdById: admin.id,
        },
      });
      const event = toSchoolEvent(row);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SCHOOL_EVENT_CREATE,
        entityType: 'SchoolEvent',
        entityId: row.id,
        after: event,
      });
      return event;
    });
  }

  public async update(
    admin: AuthUser,
    input: UpdateSchoolEventInput,
  ): Promise<SchoolEvent> {
    const before = await this.findActive(input.id);
    const start = input.startsOn ?? before.startsOn;
    // A one-day event moved to another day stays one day long
    const end =
      input.endsOn ??
      (before.startsOn === before.endsOn ? start : before.endsOn);
    // The new range is checked as a whole: a new start may pass the old end
    const { startsOn, endsOn } = checkDates(start, end);
    return this.prismaService.$transaction(async (tx) => {
      const row = await tx.schoolEvent.update({
        where: { id: input.id },
        data: {
          kind: input.kind,
          title: input.title?.trim(),
          startsOn,
          endsOn,
          note:
            input.note === undefined ? undefined : input.note.trim() || null,
        },
      });
      const after = toSchoolEvent(row);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SCHOOL_EVENT_UPDATE,
        entityType: 'SchoolEvent',
        entityId: row.id,
        before,
        after,
      });
      return after;
    });
  }

  /** No hard delete (DECISIONS §5): archived events leave the calendar, the row stays */
  public async archive(admin: AuthUser, id: string): Promise<SchoolEvent> {
    const before = await this.findActive(id);
    return this.prismaService.$transaction(async (tx) => {
      const row = await tx.schoolEvent.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      const after = toSchoolEvent(row);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.SCHOOL_EVENT_ARCHIVE,
        entityType: 'SchoolEvent',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  }

  private async findActive(id: string): Promise<SchoolEvent> {
    const row = await this.prismaService.schoolEvent.findFirst({
      where: { id, status: 'ACTIVE' },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return toSchoolEvent(row);
  }
}

/** "YYYY-MM-DD" pair → DB dates; the end may not be before the start; at most MAX_DAYS long */
function checkDates(start: string, end: string) {
  const startsOn = toDbDate(start);
  const endsOn = toDbDate(end);
  if (endsOn < startsOn) {
    throw new BadRequestException({
      code: ErrorCode.DATES_ORDER,
      message: 'The end date must not be before the start date',
    });
  }
  if ((endsOn.getTime() - startsOn.getTime()) / DAY_MS >= MAX_DAYS) {
    throw new BadRequestException({
      code: ErrorCode.BAD_REQUEST,
      message: `An event can last at most ${MAX_DAYS} days`,
    });
  }
  return { startsOn, endsOn };
}

export function toSchoolEvent(row: SchoolEventRow): SchoolEvent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    startsOn: fromDbDate(row.startsOn),
    endsOn: fromDbDate(row.endsOn),
    note: row.note,
    status: row.status,
  };
}
