import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Child, StudentOverview } from '../../libs/dto/overview/overview';
import type { AuthUser } from '../../libs/types/auth';
import {
  fromDbDate,
  periodWeek,
  startOfDayInZone,
  toDbDate,
  todayInZone,
} from '../../libs/utils/date';
import { CalendarEvent } from '../../libs/dto/dashboard/dashboard';
import { CalendarEventKind } from '../../libs/enums/dashboard.enum';
import { AnnouncementService } from '../announcement/announcement.service';
import { summarizeAttendance } from '../attendance/attendance.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { DashboardService } from '../dashboard/dashboard.service';
import { STUDENT_SELECT } from '../grade/grade.service';
import { PeriodGradeService } from '../grade/period-grade.service';
import { SchoolService } from '../school/school.service';

const DAY_MS = 86_400_000;
/** "Due soon" on the home page */
const UPCOMING_DAYS = 7;
const RECENT_GRADES = 5;
/** "New" on a course card: published in the last 7 days */
const NEW_DAYS = 7;
const CONTINUE_LESSONS = 3;

/**
 * The student / parent home page in one query. One access check (resolveStudentScope), then
 * the rules that already exist are reused: period grade, attendance rate, announcement scope.
 */
@Injectable()
export class OverviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly periodGradeService: PeriodGradeService,
    private readonly announcementService: AnnouncementService,
    private readonly schoolService: SchoolService,
    private readonly dashboardService: DashboardService,
  ) {}

  public async getStudentOverview(
    user: AuthUser,
    studentId?: string,
  ): Promise<StudentOverview> {
    // Student → always themselves; parent → own child; admin → any student
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    const student = await this.prismaService.user.findUniqueOrThrow({
      where: { id },
      select: {
        ...STUDENT_SELECT,
        groupMemberships: {
          where: { leftAt: null },
          select: { group: { select: { name: true } } },
          take: 1,
        },
      },
    });

    const enrollments = await this.prismaService.enrollment.findMany({
      where: { studentId: id, status: 'ACTIVE', course: { status: 'ACTIVE' } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            academicYearId: true,
            subject: { select: { name: true } },
            teachers: {
              where: { role: 'OWNER' },
              take: 1,
              select: {
                teacher: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { course: { title: 'asc' } },
    });
    const courses = enrollments.map((e) => e.course);
    const courseIds = courses.map((c) => c.id);
    const now = new Date();

    const { timezone } = await this.schoolService.getSettings();
    const today = todayInZone(timezone);
    const period = courses.length
      ? await this.currentPeriod(courses[0].academicYearId, today)
      : null;

    // What a learner may open: a published lesson in a visible, published week
    const visibleLesson: Prisma.LessonWhereInput = {
      publishedAt: { lte: now },
      module: {
        courseId: { in: courseIds },
        isHidden: false,
        publishedAt: { lte: now },
      },
    };
    const newSince = new Date(now.getTime() - NEW_DAYS * DAY_MS);

    const [
      records,
      upcoming,
      graded,
      announcements,
      started,
      lessons,
      newAssignments,
      unread,
      overdue,
    ] = await Promise.all([
      this.prismaService.attendanceRecord.findMany({
        where: { studentId: id, session: { courseId: { in: courseIds } } },
        select: { status: true, session: { select: { courseId: true } } },
      }),
      this.prismaService.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          publishedAt: { lte: now },
          dueAt: {
            gte: now,
            lt: new Date(now.getTime() + UPCOMING_DAYS * DAY_MS),
          },
        },
        // Same due time: a stable order, so the list does not jump between reloads
        orderBy: [
          { dueAt: 'asc' },
          { course: { title: 'asc' } },
          { title: 'asc' },
        ],
        include: {
          course: { select: { title: true } },
          submissions: {
            where: { studentId: id },
            select: { status: true, _count: { select: { attempts: true } } },
          },
        },
      }),
      // Published grades only: an unpublished score never reaches this page
      this.prismaService.submission.findMany({
        where: {
          studentId: id,
          score: { not: null },
          assignment: {
            courseId: { in: courseIds },
            gradesPublishedAt: { not: null },
          },
        },
        orderBy: { assignment: { gradesPublishedAt: 'desc' } },
        take: RECENT_GRADES,
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              maxScore: true,
              gradesPublishedAt: true,
              course: { select: { title: true } },
            },
          },
        },
      }),
      this.announcementService.getAnnouncements(user, { limit: 3 }),
      this.prismaService.lessonProgress.findMany({
        where: { studentId: id, status: 'IN_PROGRESS', lesson: visibleLesson },
        orderBy: { updatedAt: 'desc' },
        take: CONTINUE_LESSONS,
        select: {
          maxPositionSec: true,
          lesson: {
            select: {
              id: true,
              title: true,
              type: true,
              videoAsset: { select: { durationSec: true } },
              module: {
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      subject: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // Progress and "new lessons": every visible lesson with this student's status
      this.prismaService.lesson.findMany({
        where: visibleLesson,
        select: {
          publishedAt: true,
          module: { select: { courseId: true } },
          progress: { where: { studentId: id }, select: { status: true } },
        },
      }),
      // New and not handed in yet (a returned redo counts as handed in: it is not new)
      this.prismaService.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          publishedAt: { gte: newSince, lte: now },
          submissions: {
            none: {
              studentId: id,
              OR: [{ attempts: { some: {} } }, { status: 'GRADED' }],
            },
          },
        },
        select: { courseId: true },
      }),
      // The viewer's own reads: a parent reading does not mark it for the child
      this.prismaService.announcement.findMany({
        where: {
          courseId: { in: courseIds },
          status: 'ACTIVE',
          publishedAt: { lte: now },
          reads: { none: { userId: user.id } },
        },
        select: { courseId: true },
      }),
      this.prismaService.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          publishedAt: { lte: now },
          dueAt: { lt: now },
          allowLate: true,
          gradesPublishedAt: null,
          submissions: {
            none: {
              studentId: id,
              OR: [{ attempts: { some: {} } }, { status: 'GRADED' }],
            },
          },
        },
        orderBy: [{ dueAt: 'asc' }, { title: 'asc' }],
        include: { course: { select: { title: true } } },
      }),
    ]);

    const courseRows = [];
    for (const course of courses) {
      const grade = period
        ? await this.periodGradeService.getStudentPeriodGrade(
            course.id,
            period,
            student,
          )
        : null;
      const owner = course.teachers[0]?.teacher;
      const own = lessons.filter((l) => l.module.courseId === course.id);
      const completed = own.filter(
        (l) => l.progress[0]?.status === 'COMPLETED',
      ).length;
      const newLessons = own.filter(
        (l) =>
          l.publishedAt! >= newSince &&
          (l.progress[0]?.status ?? 'NOT_STARTED') === 'NOT_STARTED',
      ).length;
      courseRows.push({
        courseId: course.id,
        title: course.title,
        subjectName: course.subject.name,
        teacherName: owner ? `${owner.firstName} ${owner.lastName}` : null,
        score: grade?.score ?? null,
        mark: grade?.mark ?? null,
        isPublished: grade?.isPublished ?? false,
        attendanceRate: summarizeAttendance(
          records
            .filter((r) => r.session.courseId === course.id)
            .map((r) => r.status),
        ).rate,
        progress: own.length
          ? Math.round((completed / own.length) * 100)
          : null,
        newCount:
          newLessons +
          newAssignments.filter((a) => a.courseId === course.id).length +
          unread.filter((a) => a.courseId === course.id).length,
      });
    }

    return {
      student: {
        id: student.id,
        loginId: student.loginId,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.groupMemberships[0]?.group.name ?? null,
      },
      period: period
        ? {
            id: period.id,
            name: period.name,
            week: periodWeek(period.startsAt, period.endsAt, today).week,
          }
        : null,
      courses: courseRows,
      attendance: summarizeAttendance(records.map((r) => r.status)),
      continueLessons: started.map(({ lesson, maxPositionSec }) => {
        const { course } = lesson.module;
        const durationSec = lesson.videoAsset?.durationSec ?? null;
        return {
          lessonId: lesson.id,
          courseId: course.id,
          courseTitle: course.title,
          subjectName: course.subject.name,
          title: lesson.title,
          type: lesson.type,
          durationSec,
          percent: durationSec
            ? Math.min(100, Math.round((maxPositionSec / durationSec) * 100))
            : null,
        };
      }),
      upcoming: upcoming.map((a) => {
        const sub = a.submissions[0];
        return {
          assignmentId: a.id,
          courseId: a.courseId,
          courseTitle: a.course.title,
          title: a.title,
          type: a.type,
          dueAt: a.dueAt!,
          // Handed in (and not sent back for a redo)
          isDone:
            !!sub &&
            sub.status !== 'RETURNED' &&
            (sub._count.attempts > 0 || sub.status === 'GRADED'),
        };
      }),
      overdue: overdue.map((a) => ({
        assignmentId: a.id,
        courseId: a.courseId,
        courseTitle: a.course.title,
        title: a.title,
        type: a.type,
        dueAt: a.dueAt!,
        isDone: false,
      })),
      recentGrades: graded.map((s) => {
        const score = Number(s.score);
        const maxScore = Number(s.assignment.maxScore);
        return {
          assignmentId: s.assignment.id,
          courseTitle: s.assignment.course.title,
          title: s.assignment.title,
          score,
          maxScore,
          percent: Math.round((score / maxScore) * 10_000) / 100,
          publishedAt: s.assignment.gradesPublishedAt!,
          feedback: s.feedback,
        };
      }),
      announcements,
    };
  }

  /**
   * The student's month (month: "YYYY-MM"): the school calendar (holidays, events, term dates, the
   * same rows admins see) plus the due days of the student's own published assignments.
   */
  public async getStudentCalendar(
    user: AuthUser,
    month: string,
    studentId?: string,
  ): Promise<CalendarEvent[]> {
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    // Checks the month format too
    const school = await this.dashboardService.getCalendar(month);

    const { timezone } = await this.schoolService.getSettings();
    const [y, m] = month.split('-').map(Number);
    const next = fromDbDate(new Date(Date.UTC(y, m, 1)));
    const assignments = await this.prismaService.assignment.findMany({
      where: {
        course: {
          status: 'ACTIVE',
          enrollments: { some: { studentId: id, status: 'ACTIVE' } },
        },
        publishedAt: { lte: new Date() },
        // The month's days in the school timezone
        dueAt: {
          gte: startOfDayInZone(`${month}-01`, timezone),
          lt: startOfDayInZone(next, timezone),
        },
      },
      orderBy: [{ dueAt: 'asc' }, { title: 'asc' }],
      include: { course: { select: { title: true } } },
    });

    const due: CalendarEvent[] = assignments.map((a) => {
      const day = todayInZone(timezone, a.dueAt!);
      return {
        id: a.id,
        kind: CalendarEventKind.ASSIGNMENT,
        title: a.title,
        startsOn: day,
        endsOn: day,
        note: a.course.title,
        schoolEventId: null,
        courseId: a.courseId,
        assignmentId: a.id,
      };
    });
    return [...school, ...due].sort((a, b) =>
      a.startsOn.localeCompare(b.startsOn),
    );
  }

  /** A parent's children (active links), for the child switcher */
  public async getMyChildren(user: AuthUser): Promise<Child[]> {
    const links = await this.prismaService.parentStudent.findMany({
      where: { parentId: user.id, revokedAt: null },
      include: {
        student: {
          select: {
            ...STUDENT_SELECT,
            groupMemberships: {
              where: { leftAt: null },
              select: { group: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { student: { firstName: 'asc' } },
    });
    return links.map(({ student, relation }) => ({
      id: student.id,
      loginId: student.loginId,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.groupMemberships[0]?.group.name ?? null,
      relation,
    }));
  }

  /** The leaf period today is in; in a break, the latest that has started */
  private async currentPeriod(academicYearId: string, today: string) {
    const day = toDbDate(today);
    return this.prismaService.period.findFirst({
      where: { academicYearId, children: { none: {} }, startsAt: { lte: day } },
      orderBy: { startsAt: 'desc' },
    });
  }
}
