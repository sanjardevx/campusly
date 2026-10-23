import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  GradingItem,
  TeacherAnnouncement,
  TeacherCourse,
  TeacherDashboard,
  TeacherDeadline,
  TodayCourse,
} from '../../libs/dto/dashboard/teacher-dashboard';
import { DeadlineKind } from '../../libs/enums/dashboard.enum';
import type { AuthUser } from '../../libs/types/auth';
import {
  fromDbDate,
  startOfDayInZone,
  toDbDate,
  todayInZone,
} from '../../libs/utils/date';
import { AccessPolicy } from '../auth/policies/access.policy';
import { SchoolService } from '../school/school.service';
import { DashboardService } from './dashboard.service';

const DAY_MS = 86_400_000;
const GRADING_LIST = 5;
const DEADLINE_DAYS = 14;
const DEADLINE_LIST = 5;
const ANNOUNCEMENT_LIST = 3;

/**
 * Teacher home page (Stitch "Teacher Dashboard"). No IDs come from the client: the courses are
 * the teacher's own (AccessPolicy.courseScope), and every count is limited to them.
 * There is no timetable (DECISIONS §1): "attendance today" lists every active course.
 */
@Injectable()
export class TeacherDashboardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly schoolService: SchoolService,
    private readonly dashboardService: DashboardService,
  ) {}

  public async getTeacherDashboard(user: AuthUser): Promise<TeacherDashboard> {
    const [{ timezone }, year] = await Promise.all([
      this.schoolService.getSettings(),
      this.schoolService.getCurrentAcademicYear(),
    ]);
    const today = todayInZone(timezone);
    const day = toDbDate(today);
    const now = new Date();

    // This year's courses of this teacher (archived ones are gone from the dashboard)
    const courses = await this.prismaService.course.findMany({
      where: {
        AND: [
          this.accessPolicy.courseScope(user),
          { status: { not: 'ARCHIVED' }, academicYear: { isCurrent: true } },
        ],
      },
      select: { id: true, title: true, status: true },
      orderBy: { title: 'asc' },
    });
    const ids = courses.map((c) => c.id);
    const inMyCourses = { courseId: { in: ids } };
    // Assignments whose grades students cannot see yet
    const openAssignments = {
      ...inMyCourses,
      publishedAt: { not: null },
      gradesPublishedAt: null,
    };

    const [
      period,
      holiday,
      enrollments,
      sessions,
      weeks,
      assignments,
      statusCounts,
      deadlines,
      announcements,
    ] = await Promise.all([
      year ? this.dashboardService.currentPeriod(year.id, today) : null,
      this.prismaService.schoolEvent.findFirst({
        where: {
          kind: 'HOLIDAY',
          status: 'ACTIVE',
          startsOn: { lte: day },
          endsOn: { gte: day },
        },
        select: { title: true },
      }),
      this.prismaService.enrollment.groupBy({
        by: ['courseId'],
        where: { ...inMyCourses, status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prismaService.classSession.findMany({
        where: { ...inMyCourses, date: day },
        select: { courseId: true, _count: { select: { records: true } } },
      }),
      // The week (module) each course is in today
      this.prismaService.module.findMany({
        where: { ...inMyCourses, startsAt: { lte: day }, endsAt: { gte: day } },
        select: { courseId: true, order: true },
      }),
      this.prismaService.assignment.findMany({
        where: openAssignments,
        select: {
          id: true,
          courseId: true,
          title: true,
          type: true,
          dueAt: true,
          allowLate: true,
        },
      }),
      this.prismaService.submission.groupBy({
        by: ['assignmentId', 'status'],
        where: { assignment: openAssignments },
        _count: { _all: true },
      }),
      this.deadlines(ids, today, timezone, now),
      this.announcements(user),
    ]);

    const title = new Map(courses.map((c) => [c.id, c.title]));
    const students = new Map(
      enrollments.map((e) => [e.courseId, e._count._all]),
    );
    const marked = new Map(sessions.map((s) => [s.courseId, s._count.records]));
    const week = new Map(weeks.map((w) => [w.courseId, w.order]));

    const todayCourses: TodayCourse[] = courses
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => ({
        courseId: c.id,
        title: c.title,
        students: students.get(c.id) ?? 0,
        marked: marked.get(c.id) ?? 0,
      }));

    const myCourses: TeacherCourse[] = courses.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      students: students.get(c.id) ?? 0,
      week: week.get(c.id) ?? null,
    }));

    // Submissions by status, per assignment
    const counts = new Map<string, Record<string, number>>();
    for (const row of statusCounts) {
      const byStatus = counts.get(row.assignmentId) ?? {};
      byStatus[row.status] = row._count._all;
      counts.set(row.assignmentId, byStatus);
    }

    const grading: GradingItem[] = [];
    let toGradeTotal = 0;
    for (const a of assignments) {
      const c = counts.get(a.id) ?? {};
      const n = (status: string) => c[status] ?? 0;
      const courseStudents = students.get(a.courseId) ?? 0;
      const graded = n('GRADED') + n('MISSING');
      const submitted =
        n('SUBMITTED') + n('LATE') + n('GRADED') + n('RETURNED');
      const pastDue = !a.dueAt || a.dueAt < now;
      // An exam has no submissions: once its date has passed, every student without a score waits
      const toGrade =
        a.type === 'EXAM'
          ? pastDue
            ? Math.max(0, courseStudents - graded)
            : 0
          : n('SUBMITTED') + n('LATE');
      const readyToPublish = toGrade === 0 && graded > 0 && pastDue;
      toGradeTotal += toGrade;
      if (toGrade > 0 || readyToPublish) {
        grading.push({
          assignmentId: a.id,
          courseId: a.courseId,
          courseTitle: title.get(a.courseId) ?? '',
          title: a.title,
          type: a.type,
          toGrade,
          submitted,
          graded,
          students: courseStudents,
          dueAt: a.dueAt,
          allowLate: a.allowLate,
          readyToPublish,
        });
      }
    }
    // The oldest deadline first; no deadline at the end
    grading.sort(
      (a, b) =>
        (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity),
    );

    return {
      today,
      period: period?.view ?? null,
      holiday: holiday?.title ?? null,
      todayCourses,
      toGradeTotal,
      grading: grading.slice(0, GRADING_LIST),
      courses: myCourses,
      deadlines,
      announcements,
    };
  }

  // ───────────────────────── helpers ─────────────────────────

  /**
   * The next two weeks: the teacher's assignments (the same homework given to 9A and 9B is one
   * row), the school's deadlines / starts / events and term starts and ends (DECISIONS §13).
   */
  private async deadlines(
    courseIds: string[],
    today: string,
    timezone: string,
    now: Date,
  ): Promise<TeacherDeadline[]> {
    const first = toDbDate(today);
    const end = toDbDate(
      fromDbDate(new Date(first.getTime() + DEADLINE_DAYS * DAY_MS)),
    );
    const [assignments, events, periods] = await Promise.all([
      this.prismaService.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          publishedAt: { not: null },
          dueAt: { gte: now, lt: startOfDayInZone(fromDbDate(end), timezone) },
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          course: { select: { title: true } },
        },
        orderBy: [{ dueAt: 'asc' }, { course: { title: 'asc' } }],
      }),
      this.prismaService.schoolEvent.findMany({
        where: {
          kind: { in: ['DEADLINE', 'START', 'EVENT'] },
          status: 'ACTIVE',
          startsOn: { gte: first, lt: end },
        },
        select: { id: true, kind: true, title: true, startsOn: true },
        orderBy: { startsOn: 'asc' },
        take: DEADLINE_LIST,
      }),
      this.prismaService.period.findMany({
        where: {
          academicYear: { isCurrent: true },
          OR: [
            { startsAt: { gte: first, lt: end } },
            { endsAt: { gte: first, lt: end } },
          ],
        },
        select: { id: true, name: true, startsAt: true, endsAt: true },
      }),
    ]);

    // Same title and the same moment → one row with every course
    const grouped = new Map<string, TeacherDeadline>();
    for (const a of assignments) {
      const key = `${a.title}|${a.dueAt!.getTime()}`;
      const row = grouped.get(key);
      if (row) row.courseTitles.push(a.course.title);
      else
        grouped.set(key, {
          id: a.id,
          kind: DeadlineKind.ASSIGNMENT,
          title: a.title,
          courseTitles: [a.course.title],
          date: todayInZone(timezone, a.dueAt!),
          dueAt: a.dueAt,
        });
    }

    const school = (
      id: string,
      kind: DeadlineKind,
      title: string,
      day: Date,
    ): TeacherDeadline => ({
      id,
      kind,
      title,
      courseTitles: [],
      date: fromDbDate(day),
      dueAt: null,
    });
    const rows: TeacherDeadline[] = [
      ...grouped.values(),
      ...events.map((e) =>
        school(
          e.id,
          DeadlineKind[e.kind as 'DEADLINE' | 'START' | 'EVENT'],
          e.title,
          e.startsOn,
        ),
      ),
      ...periods.flatMap((p) =>
        (
          [
            [DeadlineKind.TERM_START, p.startsAt],
            [DeadlineKind.TERM_END, p.endsAt],
          ] as const
        )
          .filter(([, day]) => day >= first && day < end)
          .map(([kind, day]) => school(`${p.id}-${kind}`, kind, p.name, day)),
      ),
    ];
    // By day; on the same day the school's dates first (they have no time)
    rows.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0),
    );
    return rows.slice(0, DEADLINE_LIST);
  }

  /** The teacher's latest announcements: how many of the course's students opened each one */
  private async announcements(user: AuthUser): Promise<TeacherAnnouncement[]> {
    const rows = await this.prismaService.announcement.findMany({
      where: { authorId: user.id },
      select: {
        id: true,
        title: true,
        courseId: true,
        publishedAt: true,
        course: { select: { title: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: ANNOUNCEMENT_LIST,
    });

    return Promise.all(
      rows.map(async (a) => {
        if (!a.courseId) {
          const reads = await this.prismaService.announcementRead.count({
            where: { announcementId: a.id },
          });
          return { ...base(a), reads, audience: null };
        }
        // Only the course's current students count (a parent or a dropped student does not)
        const student = {
          enrollments: { some: { courseId: a.courseId, status: 'ACTIVE' } },
        } as const;
        const [reads, audience] = await Promise.all([
          this.prismaService.announcementRead.count({
            where: { announcementId: a.id, user: student },
          }),
          this.prismaService.enrollment.count({
            where: { courseId: a.courseId, status: 'ACTIVE' },
          }),
        ]);
        return { ...base(a), reads, audience };
      }),
    );
  }
}

function base(a: {
  id: string;
  title: string;
  publishedAt: Date;
  course: { title: string } | null;
}) {
  return {
    id: a.id,
    title: a.title,
    courseTitle: a.course?.title ?? null,
    publishedAt: a.publishedAt,
  };
}
