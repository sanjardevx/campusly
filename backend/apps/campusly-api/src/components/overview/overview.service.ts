import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Child, StudentOverview } from '../../libs/dto/overview/overview';
import type { AuthUser } from '../../libs/types/auth';
import { toDbDate, todayInZone } from '../../libs/utils/date';
import { AnnouncementService } from '../announcement/announcement.service';
import { summarizeAttendance } from '../attendance/attendance.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { STUDENT_SELECT } from '../grade/grade.service';
import { PeriodGradeService } from '../grade/period-grade.service';
import { SchoolService } from '../school/school.service';

const DAY_MS = 86_400_000;
/** "Due soon" on the home page */
const UPCOMING_DAYS = 7;
const RECENT_GRADES = 5;

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
    const period = courses.length
      ? await this.currentPeriod(
          courses[0].academicYearId,
          todayInZone(timezone),
        )
      : null;

    const [records, upcoming, graded, announcements] = await Promise.all([
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
      period: period ? { id: period.id, name: period.name } : null,
      courses: courseRows,
      attendance: summarizeAttendance(records.map((r) => r.status)),
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
        };
      }),
      announcements,
    };
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
