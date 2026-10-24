import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PeriodAttendance } from '../../libs/dto/overview/overview';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, todayInZone } from '../../libs/utils/date';
import { summarizeAttendance } from '../attendance/attendance.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { SchoolService } from '../school/school.service';
import { yearPeriods } from './periods';

/**
 * The Attendance page (parent, also usable by the student): one period across all the student's
 * active courses — the totals, each course's counts and every marked lesson, newest first.
 * Attendance is per course session (DECISIONS §10), so it counts lessons, not school days.
 */
@Injectable()
export class StudentAttendanceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly schoolService: SchoolService,
  ) {}

  public async getStudentAttendance(
    user: AuthUser,
    periodId?: string,
    studentId?: string,
  ): Promise<PeriodAttendance> {
    // Student → self, parent → own child (else NOT_FOUND), admin → any student
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    const enrollments = await this.prismaService.enrollment.findMany({
      where: { studentId: id, status: 'ACTIVE', course: { status: 'ACTIVE' } },
      orderBy: { course: { title: 'asc' } },
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
    });
    const courses = enrollments.map((e) => e.course);
    const empty = {
      period: null,
      summary: summarizeAttendance([]),
      courses: [],
      lessons: [],
    };
    if (!courses.length) return { periods: [], ...empty };

    const { timezone } = await this.schoolService.getSettings();
    const { periods, period } = await yearPeriods(
      this.prismaService,
      courses[0].academicYearId,
      todayInZone(timezone),
      periodId,
    );
    const periodList = periods.map((p) => ({ id: p.id, name: p.name }));
    if (!period) return { periods: periodList, ...empty };

    const records = await this.prismaService.attendanceRecord.findMany({
      where: {
        studentId: id,
        session: {
          courseId: { in: courses.map((c) => c.id) },
          date: { gte: period.startsAt, lte: period.endsAt },
        },
      },
      select: {
        status: true,
        note: true,
        session: { select: { date: true, courseId: true } },
      },
      // Newest day first; inside a day the course order of the list
      orderBy: [
        { session: { date: 'desc' } },
        { session: { course: { title: 'asc' } } },
      ],
    });

    const teacherOf = (course: (typeof courses)[number]) => {
      const owner = course.teachers[0]?.teacher;
      return owner ? `${owner.firstName} ${owner.lastName}` : null;
    };
    const byId = new Map(courses.map((c) => [c.id, c]));
    return {
      periods: periodList,
      period: { id: period.id, name: period.name },
      summary: summarizeAttendance(records.map((r) => r.status)),
      courses: courses.map((c) => ({
        courseId: c.id,
        title: c.title,
        subjectName: c.subject.name,
        teacherName: teacherOf(c),
        summary: summarizeAttendance(
          records
            .filter((r) => r.session.courseId === c.id)
            .map((r) => r.status),
        ),
      })),
      lessons: records.map((r) => {
        const course = byId.get(r.session.courseId)!;
        return {
          date: fromDbDate(r.session.date),
          courseId: course.id,
          courseTitle: course.title,
          teacherName: teacherOf(course),
          status: r.status,
          note: r.note,
        };
      }),
    };
  }
}
