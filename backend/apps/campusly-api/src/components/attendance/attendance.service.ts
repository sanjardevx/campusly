import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AttendanceSummary,
  CourseAttendance,
  StudentAttendance,
} from '../../libs/dto/attendance/attendance';
import { MarkAttendanceInput } from '../../libs/dto/attendance/attendance.input';
import { AttendanceStatus } from '../../libs/enums/attendance.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, toDbDate, todayInZone } from '../../libs/utils/date';
import { AccessPolicy } from '../auth/policies/access.policy';
import { SchoolService } from '../school/school.service';

/**
 * Attendance per course session (one per course and day, DECISIONS §10). The teacher sends only
 * the exceptions: every other active student of the course is PRESENT.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly schoolService: SchoolService,
  ) {}

  public async markAttendance(
    user: AuthUser,
    input: MarkAttendanceInput,
  ): Promise<CourseAttendance> {
    await this.accessPolicy.assertCanEditCourse(user, input.courseId);
    const date = toDbDate(input.date);

    // "Today" in the school's timezone: the server runs in UTC
    const { timezone } = await this.schoolService.getSettings();
    if (input.date > todayInZone(timezone)) {
      throw badRequest('Attendance cannot be taken for a future day');
    }
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: input.courseId },
      select: { academicYear: { select: { startsAt: true, endsAt: true } } },
    });
    if (
      date < course.academicYear.startsAt ||
      date > course.academicYear.endsAt
    ) {
      throw badRequest('The day is outside the course’s academic year');
    }
    if (input.lessonId) {
      const lesson = await this.prismaService.lesson.count({
        where: { id: input.lessonId, module: { courseId: input.courseId } },
      });
      if (!lesson) throw notFound('Lesson not found in this course');
    }

    // Every id inside the array is checked in the database, with one query
    const enrolled = await this.prismaService.enrollment.findMany({
      where: { courseId: input.courseId, status: 'ACTIVE' },
      select: { studentId: true },
    });
    const roster = new Set(enrolled.map((e) => e.studentId));
    const foreign = input.records.filter((r) => !roster.has(r.studentId));
    if (foreign.length) {
      // Nothing is saved: half-taken attendance is worse than none
      throw badRequest(`${foreign.length} student(s) are not in this course`);
    }
    const marks = new Map(input.records.map((r) => [r.studentId, r]));

    await this.prismaService.$transaction(async (tx) => {
      // One session per course and day: sending again updates it
      const session = await tx.classSession.upsert({
        where: { courseId_date: { courseId: input.courseId, date } },
        create: {
          courseId: input.courseId,
          date,
          lessonId: input.lessonId,
          title: input.title,
          createdById: user.id,
        },
        update: { lessonId: input.lessonId, title: input.title },
      });
      const markedAt = new Date();
      for (const studentId of roster) {
        const mark = marks.get(studentId);
        const data = {
          status: mark?.status ?? AttendanceStatus.PRESENT,
          note: mark?.note ?? null,
          markedById: user.id,
          markedAt,
        };
        await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId } },
          create: { sessionId: session.id, studentId, ...data },
          update: data,
        });
      }
    });
    return this.getCourseAttendance(user, input.courseId, input.date);
  }

  /** The teacher's screen for one day; not taken yet → everyone PRESENT, isMarked false */
  public async getCourseAttendance(
    user: AuthUser,
    courseId: string,
    day: string,
  ): Promise<CourseAttendance> {
    await this.accessPolicy.assertTeacherOf(user, courseId);
    const date = toDbDate(day);
    const [session, enrollments] = await Promise.all([
      this.prismaService.classSession.findUnique({
        where: { courseId_date: { courseId, date } },
        include: { records: true },
      }),
      this.prismaService.enrollment.findMany({
        where: { courseId, status: 'ACTIVE' },
        include: {
          student: {
            select: {
              id: true,
              loginId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { student: { lastName: 'asc' } },
          { student: { firstName: 'asc' } },
        ],
      }),
    ]);
    const records = new Map(
      (session?.records ?? []).map((r) => [r.studentId, r]),
    );

    return {
      courseId,
      date: day,
      isMarked: records.size > 0,
      lessonId: session?.lessonId ?? null,
      rows: enrollments.map(({ student }) => ({
        studentId: student.id,
        loginId: student.loginId,
        firstName: student.firstName,
        lastName: student.lastName,
        status: records.get(student.id)?.status ?? AttendanceStatus.PRESENT,
        note: records.get(student.id)?.note ?? null,
      })),
    };
  }

  /** Student: own. Parent: a child. Admin: any student of the course. */
  public async getMyAttendance(
    user: AuthUser,
    courseId: string,
    studentId?: string,
  ): Promise<StudentAttendance> {
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    await this.accessPolicy.assertCanViewCourse(user, courseId);
    const enrolled = await this.prismaService.enrollment.count({
      where: { courseId, studentId: id },
    });
    if (!enrolled) throw notFound('Course not found');

    const records = await this.prismaService.attendanceRecord.findMany({
      where: { studentId: id, session: { courseId } },
      include: { session: { select: { date: true } } },
      orderBy: { session: { date: 'desc' } },
    });
    return {
      studentId: id,
      courseId,
      summary: summarizeAttendance(records.map((r) => r.status)),
      entries: records.map((r) => ({
        date: fromDbDate(r.session.date),
        status: r.status,
        note: r.note,
      })),
    };
  }
}

/** Counts and the attendance rate; an excused absence does not lower the rate */
export function summarizeAttendance(
  statuses: AttendanceStatus[],
): AttendanceSummary {
  const count = (s: AttendanceStatus) => statuses.filter((x) => x === s).length;
  const present = count('PRESENT');
  const late = count('LATE');
  const absent = count('ABSENT');
  const excused = count('EXCUSED');
  const total = statuses.length;
  return {
    total,
    present,
    late,
    absent,
    excused,
    rate: total
      ? Math.round(((present + late + excused) / total) * 10_000) / 100
      : null,
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
