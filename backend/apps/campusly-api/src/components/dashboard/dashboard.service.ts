import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ActivityItem,
  AdminDashboard,
  AttendanceOverview,
  CalendarEvent,
  DashboardPeriod,
  NeedsAttention,
} from '../../libs/dto/dashboard/dashboard';
import { AttendanceStatus } from '../../libs/enums/attendance.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import {
  AttendanceRange,
  AttentionPriority,
  CalendarEventKind,
} from '../../libs/enums/dashboard.enum';
import {
  fromDbDate,
  startOfDayInZone,
  periodWeek,
  toDbDate,
  todayInZone,
  weekDays,
} from '../../libs/utils/date';
import { summarizeAttendance } from '../attendance/attendance.service';
import { SchoolService } from '../school/school.service';

const DAY_MS = 86_400_000;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * "Needs attention" is about attendance only (DECISIONS §10), in the current period up to today:
 * below 75 % → HIGH, 75–85 % → MEDIUM, 85–90 % → LOW. A rate needs at least MIN_MARKS marks,
 * so one absence in week 1 is not "40 %".
 */
const HIGH_BELOW = 75;
const MEDIUM_BELOW = 85;
const LOW_BELOW = 90;
const MIN_MARKS = 5;
const ATTENTION_LIST = 5;
const ACTIVITY_LIST = 6;

/**
 * Admin home page. Everything is counted in the database (count / groupBy): the browser gets
 * numbers and short lists, never the rows behind them.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly schoolService: SchoolService,
  ) {}

  public async getAdminDashboard(): Promise<AdminDashboard> {
    const [{ timezone }, year] = await Promise.all([
      this.schoolService.getSettings(),
      this.schoolService.getCurrentAcademicYear(),
    ]);
    // "Today" and "this month" are the school's, not the server's (UTC)
    const today = todayInZone(timezone);
    const monthStart = startOfDayInZone(`${today.slice(0, 8)}01`, timezone);
    const thisMonth = `${today.slice(0, 8)}01`;
    const lastMonth = previousMonth(thisMonth);
    const createdThisMonth = { createdAt: { gte: monthStart } };

    const [
      students,
      newStudentsThisMonth,
      teachers,
      newTeachersThisMonth,
      classes,
      courses,
      attendanceThisMonth,
      attendanceLastMonth,
      accounts,
      notSignedIn,
      period,
      recentActivity,
    ] = await Promise.all([
      this.prismaService.user.count({
        where: { role: 'STUDENT', status: 'ACTIVE' },
      }),
      this.prismaService.user.count({
        where: { role: 'STUDENT', status: 'ACTIVE', ...createdThisMonth },
      }),
      this.prismaService.user.count({
        where: { role: 'TEACHER', status: 'ACTIVE' },
      }),
      this.prismaService.user.count({
        where: { role: 'TEACHER', status: 'ACTIVE', ...createdThisMonth },
      }),
      year
        ? this.prismaService.group.count({
            where: { academicYearId: year.id, status: 'ACTIVE' },
          })
        : 0,
      year
        ? this.prismaService.course.count({
            where: { academicYearId: year.id, status: 'ACTIVE' },
          })
        : 0,
      this.attendanceRate(thisMonth, today),
      this.attendanceRate(
        lastMonth,
        fromDbDate(new Date(toDbDate(thisMonth).getTime() - DAY_MS)),
      ),
      this.prismaService.user.count({
        where: { role: { in: ['STUDENT', 'PARENT'] }, status: 'ACTIVE' },
      }),
      // Never set their own password: still on the temporary one (or it ran out)
      this.prismaService.user.count({
        where: {
          role: { in: ['STUDENT', 'PARENT'] },
          status: 'ACTIVE',
          OR: [
            { mustChangePassword: true },
            { tempPasswordUsesLeft: { not: null } },
          ],
        },
      }),
      year ? this.currentPeriod(year.id, today) : null,
      this.recentActivity(),
    ]);

    return {
      today,
      period: period?.view ?? null,
      students,
      newStudentsThisMonth,
      teachers,
      newTeachersThisMonth,
      classes,
      courses,
      attendanceThisMonth,
      attendanceLastMonth,
      notSignedIn,
      accounts,
      needsAttention: period
        ? await this.needsAttention(period.startsAt, today, period.endsAt)
        : { total: 0, high: 0, medium: 0, low: 0, students: [] },
      recentActivity,
    };
  }

  /** Donut: marks by status, from the start of the window up to today */
  public async getAttendanceOverview(
    range: AttendanceRange,
  ): Promise<AttendanceOverview> {
    const { timezone } = await this.schoolService.getSettings();
    const today = todayInZone(timezone);
    const from =
      range === AttendanceRange.TODAY
        ? today
        : range === AttendanceRange.WEEK
          ? weekDays(today)[0]
          : `${today.slice(0, 8)}01`;
    // weekDays gives Monday of today's week (on Saturday too), so from ≤ today always
    const counts = await this.statusCounts(from, today);
    return { from, to: today, ...counts };
  }

  /** The school's events and the term starts / ends that touch one month ("YYYY-MM") */
  public async getCalendar(month: string): Promise<CalendarEvent[]> {
    if (!MONTH.test(month)) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'month must be like 2026-10',
      });
    }
    const first = toDbDate(`${month}-01`);
    const next = toDbDate(nextMonth(`${month}-01`));

    const [events, periods] = await Promise.all([
      // Overlaps the month: starts before its end and ends after its start (multi-day holidays)
      this.prismaService.schoolEvent.findMany({
        where: {
          status: 'ACTIVE',
          startsOn: { lt: next },
          endsOn: { gte: first },
        },
        orderBy: [{ startsOn: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prismaService.period.findMany({
        where: {
          academicYear: { isCurrent: true },
          OR: [
            { startsAt: { gte: first, lt: next } },
            { endsAt: { gte: first, lt: next } },
          ],
        },
        select: { id: true, name: true, startsAt: true, endsAt: true },
      }),
    ]);

    const calendar: CalendarEvent[] = events.map((e) => ({
      id: e.id,
      kind: CalendarEventKind[e.kind],
      title: e.title,
      startsOn: fromDbDate(e.startsOn),
      endsOn: fromDbDate(e.endsOn),
      note: e.note,
      schoolEventId: e.id,
      courseId: null,
      assignmentId: null,
    }));
    for (const p of periods) {
      for (const [kind, day] of [
        [CalendarEventKind.TERM_START, p.startsAt],
        [CalendarEventKind.TERM_END, p.endsAt],
      ] as const) {
        if (day >= first && day < next) {
          const date = fromDbDate(day);
          calendar.push({
            id: `${p.id}-${kind}`,
            kind,
            title: p.name,
            startsOn: date,
            endsOn: date,
            note: null,
            schoolEventId: null,
            courseId: null,
            assignmentId: null,
          });
        }
      }
    }
    return calendar.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Marks by status between two days (both included), with one groupBy */
  private async statusCounts(from: string, to: string) {
    const rows = await this.prismaService.attendanceRecord.groupBy({
      by: ['status'],
      where: { session: { date: { gte: toDbDate(from), lte: toDbDate(to) } } },
      _count: { _all: true },
    });
    const count = (s: AttendanceStatus) =>
      rows.find((r) => r.status === s)?._count._all ?? 0;
    const present = count('PRESENT');
    const late = count('LATE');
    const excused = count('EXCUSED');
    const absent = count('ABSENT');
    return {
      present,
      late,
      excused,
      absent,
      total: present + late + excused + absent,
    };
  }

  /** Same rule as everywhere else: an excused absence does not lower the rate */
  private async attendanceRate(from: string, to: string) {
    const c = await this.statusCounts(from, to);
    return c.total
      ? Math.round(((c.total - c.absent) / c.total) * 10_000) / 100
      : null;
  }

  /**
   * The leaf period today is in (same rule as the student overview), with its week number.
   * Public: the teacher dashboard shows the same "Quarter 1 · week 7".
   */
  public async currentPeriod(academicYearId: string, today: string) {
    const day = toDbDate(today);
    const period = await this.prismaService.period.findFirst({
      where: { academicYearId, children: { none: {} }, startsAt: { lte: day } },
      orderBy: { startsAt: 'desc' },
    });
    if (!period) return null;
    const { week, weeks } = periodWeek(period.startsAt, period.endsAt, today);
    const view: DashboardPeriod = {
      id: period.id,
      name: period.name,
      week,
      weeks,
    };
    return { view, startsAt: period.startsAt, endsAt: period.endsAt };
  }

  /** The attention rules (see the top of the file) over this period, up to today */
  private async needsAttention(
    periodStart: Date,
    today: string,
    periodEnd: Date,
  ): Promise<NeedsAttention> {
    const to = toDbDate(today) < periodEnd ? toDbDate(today) : periodEnd;
    const marks = await this.prismaService.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: {
        session: { date: { gte: periodStart, lte: to } },
        student: { status: 'ACTIVE' },
      },
      _count: { _all: true },
    });

    const statuses = new Map<string, AttendanceStatus[]>();
    for (const m of marks) {
      const list = statuses.get(m.studentId) ?? [];
      list.push(...Array<AttendanceStatus>(m._count._all).fill(m.status));
      statuses.set(m.studentId, list);
    }

    const flagged: {
      studentId: string;
      priority: AttentionPriority;
      attendanceRate: number;
      marks: number;
    }[] = [];
    for (const [studentId, list] of statuses) {
      if (list.length < MIN_MARKS) continue;
      const rate = summarizeAttendance(list).rate ?? 100;
      const priority =
        rate < HIGH_BELOW
          ? AttentionPriority.HIGH
          : rate < MEDIUM_BELOW
            ? AttentionPriority.MEDIUM
            : rate < LOW_BELOW
              ? AttentionPriority.LOW
              : null;
      if (priority) {
        flagged.push({
          studentId,
          priority,
          attendanceRate: rate,
          marks: list.length,
        });
      }
    }
    // The lowest rate first (that is also the most urgent priority)
    flagged.sort((a, b) => a.attendanceRate - b.attendanceRate);

    const top = flagged.slice(0, ATTENTION_LIST);
    const users = await this.prismaService.user.findMany({
      where: { id: { in: top.map((f) => f.studentId) } },
      select: {
        id: true,
        loginId: true,
        firstName: true,
        lastName: true,
        groupMemberships: {
          where: { leftAt: null },
          select: { group: { select: { name: true } } },
          take: 1,
        },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const count = (p: AttentionPriority) =>
      flagged.filter((f) => f.priority === p).length;

    return {
      total: flagged.length,
      high: count(AttentionPriority.HIGH),
      medium: count(AttentionPriority.MEDIUM),
      low: count(AttentionPriority.LOW),
      students: top.flatMap((f) => {
        const u = byId.get(f.studentId);
        return u
          ? [
              {
                ...f,
                loginId: u.loginId,
                firstName: u.firstName,
                lastName: u.lastName,
                className: u.groupMemberships[0]?.group.name ?? null,
              },
            ]
          : [];
      }),
    };
  }

  /** The latest audit rows: who did what, when (never before / after) */
  private async recentActivity(): Promise<ActivityItem[]> {
    const rows = await this.prismaService.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIST,
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      createdAt: r.createdAt,
      actorName: r.actor
        ? `${r.actor.firstName} ${r.actor.lastName}`.trim()
        : null,
    }));
  }
}

/** "2026-10-01" → "2026-09-01" */
function previousMonth(first: string): string {
  const [y, m] = first.split('-').map(Number);
  return m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, '0')}-01`;
}

/** "2026-12-01" → "2027-01-01" */
function nextMonth(first: string): string {
  const [y, m] = first.split('-').map(Number);
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}
