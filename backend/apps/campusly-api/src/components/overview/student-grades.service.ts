import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  MyCourseGrades,
  MyGradeItem,
  MyGrades,
} from '../../libs/dto/overview/overview';
import { SubmissionStatus } from '../../libs/enums/assignment.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import { GradeItemState } from '../../libs/enums/grade.enum';
import type { AuthUser } from '../../libs/types/auth';
import { toDbDate, todayInZone } from '../../libs/utils/date';
import {
  hidesGrades,
  visibleSubmissionStatus,
} from '../assignment/submission.service';
import { summarizeAttendance } from '../attendance/attendance.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { STUDENT_SELECT, periodWindow } from '../grade/grade.service';
import { PeriodGradeService } from '../grade/period-grade.service';
import { SchoolService } from '../school/school.service';

const DAY_MS = 86_400_000;
/** "Due soon" in the gradebook */
const DUE_SOON_DAYS = 3;

/**
 * The student's gradebook (Grades page, DECISIONS §10) for one period in one query: per course the
 * quarter grade (the same snapshot-or-live rule as the home page), attendance, missing work and
 * every assignment of the period. Scores and feedback only once the grades are published.
 */
@Injectable()
export class StudentGradesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly periodGradeService: PeriodGradeService,
    private readonly schoolService: SchoolService,
  ) {}

  public async getMyGrades(
    user: AuthUser,
    periodId?: string,
    studentId?: string,
  ): Promise<MyGrades> {
    // Student → self, parent → own child, admin → any student
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    const student = await this.prismaService.user.findUniqueOrThrow({
      where: { id },
      select: STUDENT_SELECT,
    });
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
    if (!courses.length) {
      return {
        periods: [],
        period: null,
        attendanceRate: null,
        attendance: summarizeAttendance([]),
        missing: 0,
        courses: [],
      };
    }

    const { timezone } = await this.schoolService.getSettings();
    const today = todayInZone(timezone);
    // The year's quarters (leaf periods), like the teacher's gradebook tabs
    const periods = await this.prismaService.period.findMany({
      where: {
        academicYearId: courses[0].academicYearId,
        children: { none: {} },
      },
      orderBy: [{ startsAt: 'asc' }, { order: 'asc' }],
    });
    const period = periodId
      ? periods.find((p) => p.id === periodId)
      : ([...periods].reverse().find((p) => p.startsAt <= toDbDate(today)) ??
        periods[0]);
    if (periodId && !period) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Period not found in this academic year',
      });
    }
    const periodList = periods.map((p) => ({ id: p.id, name: p.name }));
    if (!period) {
      return {
        periods: periodList,
        period: null,
        attendanceRate: null,
        attendance: summarizeAttendance([]),
        missing: 0,
        courses: [],
      };
    }

    const courseIds = courses.map((c) => c.id);
    const { from, until } = periodWindow(period, timezone);
    const now = new Date();
    const [assignments, records] = await Promise.all([
      this.prismaService.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          publishedAt: { lte: now },
          dueAt: { gte: from, lt: until },
        },
        orderBy: [{ dueAt: 'asc' }, { title: 'asc' }],
        include: {
          submissions: {
            where: { studentId: id },
            select: {
              status: true,
              score: true,
              feedback: true,
              _count: { select: { attempts: true } },
            },
          },
        },
      }),
      this.prismaService.attendanceRecord.findMany({
        where: {
          studentId: id,
          session: {
            courseId: { in: courseIds },
            date: { gte: period.startsAt, lte: period.endsAt },
          },
        },
        select: { status: true, session: { select: { courseId: true } } },
      }),
    ]);

    const rows: MyCourseGrades[] = [];
    for (const course of courses) {
      const grade = await this.periodGradeService.getStudentPeriodGrade(
        course.id,
        period,
        student,
      );
      const items = assignments
        .filter((a) => a.courseId === course.id)
        .map((a) => toItem(a, user, now));
      const owner = course.teachers[0]?.teacher;
      rows.push({
        courseId: course.id,
        title: course.title,
        subjectName: course.subject.name,
        teacherName: owner ? `${owner.firstName} ${owner.lastName}` : null,
        percent: grade.score,
        mark: grade.mark,
        isFinal: grade.isPublished,
        attendanceRate: summarizeAttendance(
          records
            .filter((r) => r.session.courseId === course.id)
            .map((r) => r.status),
        ).rate,
        missing: items.filter(isMissing).length,
        items,
      });
    }

    const attendance = summarizeAttendance(records.map((r) => r.status));
    return {
      periods: periodList,
      period: { id: period.id, name: period.name },
      attendanceRate: attendance.rate,
      attendance,
      missing: rows.reduce((n, r) => n + r.missing, 0),
      courses: rows,
    };
  }
}

type AssignmentRow = {
  id: string;
  title: string;
  type: MyGradeItem['type'];
  dueAt: Date | null;
  maxScore: { toString(): string };
  gradesPublishedAt: Date | null;
  submissions: {
    status: SubmissionStatus;
    score: { toString(): string } | null;
    feedback: string | null;
    _count: { attempts: number };
  }[];
};

/** One gradebook row: published → score / missing; otherwise what the student did and when it is due */
function toItem(a: AssignmentRow, viewer: AuthUser, now: Date): MyGradeItem {
  const sub = a.submissions[0];
  const hidden = hidesGrades(viewer, a.gradesPublishedAt);
  const base = {
    assignmentId: a.id,
    title: a.title,
    type: a.type,
    dueAt: a.dueAt,
    maxScore: Number(a.maxScore),
    score: null,
    feedback: null,
  };
  if (!hidden) {
    if (sub?.score != null) {
      return {
        ...base,
        state:
          sub.status === 'MISSING'
            ? GradeItemState.MISSING
            : GradeItemState.GRADED,
        score: Number(sub.score),
        feedback: sub.feedback,
      };
    }
    return { ...base, state: GradeItemState.NOT_GRADED };
  }
  // The same rule as every submission the API returns: a hidden GRADED / MISSING says only what the
  // student did (a teacher's score on work never handed in must not show as "submitted")
  const visible = sub
    ? visibleSubmissionStatus(
        sub.status,
        sub._count.attempts ? { isLate: false } : undefined,
        true,
      )
    : null;
  if (visible === 'SUBMITTED' || visible === 'LATE') {
    return { ...base, state: GradeItemState.SUBMITTED };
  }
  const due = a.dueAt!.getTime();
  if (due < now.getTime())
    return { ...base, state: GradeItemState.NOT_SUBMITTED };
  return {
    ...base,
    state:
      due - now.getTime() <= DUE_SOON_DAYS * DAY_MS
        ? GradeItemState.DUE_SOON
        : GradeItemState.UPCOMING,
  };
}

/** Counted in "N missing": an exam has nothing to hand in, so only a published zero counts */
function isMissing(item: MyGradeItem): boolean {
  if (item.state === GradeItemState.MISSING) return true;
  return item.state === GradeItemState.NOT_SUBMITTED && item.type !== 'EXAM';
}
