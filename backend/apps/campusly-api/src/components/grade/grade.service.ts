import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StudentGrade } from '../../libs/dto/grade/grade';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { fromDbDate, nextDay, startOfDayInZone } from '../../libs/utils/date';
import { calculateGrade } from '../../libs/utils/grade';
import { AccessPolicy } from '../auth/policies/access.policy';
import { SchoolService } from '../school/school.service';

export interface StudentRef {
  id: string;
  loginId: string;
  firstName: string;
  lastName: string;
}

export const STUDENT_SELECT = {
  id: true,
  loginId: true,
  firstName: true,
  lastName: true,
} as const;

/**
 * Period (quarter) grades of a course, computed live from PUBLISHED grades only.
 * An assignment belongs to the period its dueAt falls into, in the school's timezone.
 */
@Injectable()
export class GradeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly schoolService: SchoolService,
  ) {}

  /** Teacher (or admin): every active student of the course */
  public async getCourseGrades(
    user: AuthUser,
    courseId: string,
    periodId: string,
  ): Promise<StudentGrade[]> {
    await this.accessPolicy.assertTeacherOf(user, courseId);
    const enrollments = await this.prismaService.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      include: { student: { select: STUDENT_SELECT } },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });
    return this.compute(
      courseId,
      periodId,
      enrollments.map((e) => e.student),
    );
  }

  /** Student: own. Parent: a child. Admin: any student of the course. */
  public async getMyCourseGrade(
    user: AuthUser,
    courseId: string,
    periodId: string,
    studentId?: string,
  ): Promise<StudentGrade> {
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    await this.accessPolicy.assertCanViewCourse(user, courseId);
    // The chosen student must be (or have been) in this course; a draft course does not exist yet
    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: id } },
      include: {
        student: { select: STUDENT_SELECT },
        course: { select: { status: true } },
      },
    });
    if (!enrollment || enrollment.course.status === 'DRAFT') {
      throw notFound('Course not found');
    }
    const [grade] = await this.compute(courseId, periodId, [
      enrollment.student,
    ]);
    return grade;
  }

  /** Live grades of the given students (also used by period-grade snapshots) */
  public async compute(
    courseId: string,
    periodId: string,
    students: StudentRef[],
  ): Promise<StudentGrade[]> {
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { academicYearId: true },
    });
    const period = await this.prismaService.period.findFirst({
      where: { id: periodId, academicYearId: course.academicYearId },
    });
    if (!period) throw notFound('Period not found in this academic year');

    // Period days are calendar days in the school's timezone; dueAt is a UTC moment
    const settings = await this.schoolService.getSettings();
    const from = startOfDayInZone(
      fromDbDate(period.startsAt),
      settings.timezone,
    );
    const until = startOfDayInZone(
      nextDay(fromDbDate(period.endsAt)),
      settings.timezone,
    );

    const [categories, assignments] = await Promise.all([
      this.prismaService.gradeCategory.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, weight: true },
      }),
      this.prismaService.assignment.findMany({
        where: {
          courseId,
          gradesPublishedAt: { not: null },
          dueAt: { gte: from, lt: until },
        },
        orderBy: { dueAt: 'asc' },
        include: { category: { select: { name: true } } },
      }),
    ]);
    const submissions = await this.prismaService.submission.findMany({
      where: {
        assignmentId: { in: assignments.map((a) => a.id) },
        studentId: { in: students.map((s) => s.id) },
        score: { not: null },
      },
      select: {
        assignmentId: true,
        studentId: true,
        score: true,
        status: true,
      },
    });

    return students.map((student) => {
      const items = assignments.flatMap((a) => {
        const sub = submissions.find(
          (s) => s.assignmentId === a.id && s.studentId === student.id,
        );
        if (!sub) return [];
        return [
          {
            assignmentId: a.id,
            title: a.title,
            type: a.type,
            categoryId: a.categoryId,
            categoryName: a.category.name,
            score: Number(sub.score),
            maxScore: Number(a.maxScore),
            dueAt: a.dueAt,
            status: sub.status,
          },
        ];
      });
      const result = calculateGrade(categories, items, settings);
      return {
        studentId: student.id,
        loginId: student.loginId,
        firstName: student.firstName,
        lastName: student.lastName,
        percent: result.percent,
        mark: result.mark,
        categories: result.categories,
        items: items.map((i) => ({
          assignmentId: i.assignmentId,
          title: i.title,
          type: i.type,
          categoryName: i.categoryName,
          score: i.score,
          maxScore: i.maxScore,
          dueAt: i.dueAt,
          status: i.status,
        })),
      };
    });
  }
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
