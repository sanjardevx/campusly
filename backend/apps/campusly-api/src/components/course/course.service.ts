import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Course } from '../../libs/dto/course/course';
import {
  CreateCourseInput,
  SetCourseStudentsInput,
  SetCourseTeachersInput,
  UpdateCourseInput,
} from '../../libs/dto/course/course.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { EnrollmentService } from '../group/enrollment.service';
import { SchoolService } from '../school/school.service';

const COURSE_INCLUDE = {
  group: { select: { name: true } },
  subject: { select: { name: true } },
  // OWNER before ASSISTANT (enum order), then by the date they were added
  teachers: {
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: {
      role: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.CourseInclude;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof COURSE_INCLUDE }>;

/** Course setup: subject × class, its teachers, students and grade categories */
@Injectable()
export class CourseService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly enrollmentService: EnrollmentService,
    private readonly schoolService: SchoolService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  /** Call only after an AccessPolicy check (or for the admin) */
  public async getCourse(id: string): Promise<Course> {
    const course = await this.prismaService.course.findUnique({
      where: { id },
      include: COURSE_INCLUDE,
    });
    if (!course) throw notFound('Course not found');
    return toCourse(course);
  }

  /**
   * One transaction: the course, its teachers, the school's default grade categories and the
   * students (whole class automatically, a split group by hand).
   */
  public async createCourse(
    admin: AuthUser,
    input: CreateCourseInput,
  ): Promise<Course> {
    const group = await this.prismaService.group.findUnique({
      where: { id: input.groupId },
    });
    if (!group || group.status !== 'ACTIVE') throw notFound('Class not found');
    const subject = await this.prismaService.subject.findUnique({
      where: { id: input.subjectId },
    });
    if (!subject || subject.status !== 'ACTIVE') {
      throw notFound('Subject not found');
    }
    if (input.periodId) {
      await this.assertPeriodOfYear(input.periodId, group.academicYearId);
    }
    await this.assertTeachers(input.teacherIds);

    const isSplitGroup = input.isSplitGroup ?? false;
    if (!isSplitGroup && input.studentIds?.length) {
      throw badRequest('Students are picked only for a split-group course');
    }
    const studentIds = input.studentIds ?? [];
    await this.assertClassMembers(group.id, studentIds);
    const settings = await this.schoolService.getSettings();

    const id = await this.prismaService.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          academicYearId: group.academicYearId,
          groupId: group.id,
          subjectId: subject.id,
          periodId: input.periodId,
          title: input.title?.trim() || `${subject.name} · ${group.name}`,
          isSplitGroup,
          teachers: { create: teacherRows(input.teacherIds) },
          gradeCategories: {
            create: [
              { name: 'Homework', weight: settings.defaultHomeworkWeight },
              { name: 'Quizzes', weight: settings.defaultQuizWeight },
              { name: 'Exams', weight: settings.defaultExamWeight },
            ].map((c, order) => ({ ...c, order })),
          },
        },
      });

      if (isSplitGroup) {
        await this.enrollmentService.enroll(
          tx,
          studentIds.map((studentId) => ({ courseId: course.id, studentId })),
        );
      } else {
        await this.enrollmentService.enrollClass(tx, course.id, group.id);
      }

      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.COURSE_CREATE,
        entityType: 'Course',
        entityId: course.id,
        after: { ...course, teacherIds: input.teacherIds },
      });
      return course.id;
    });
    return this.getCourse(id);
  }

  public async updateCourse(
    admin: AuthUser,
    input: UpdateCourseInput,
  ): Promise<Course> {
    const before = await this.prismaService.course.findUnique({
      where: { id: input.id },
    });
    if (!before) throw notFound('Course not found');
    if (input.periodId) {
      await this.assertPeriodOfYear(input.periodId, before.academicYearId);
    }

    await this.prismaService.$transaction(async (tx) => {
      const after = await tx.course.update({
        where: { id: input.id },
        data: {
          title: input.title?.trim(),
          status: input.status,
          periodId: input.periodId,
        },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.COURSE_UPDATE,
        entityType: 'Course',
        entityId: after.id,
        before,
        after,
      });
    });
    return this.getCourse(input.id);
  }

  /** Replaces the teachers (the first one is the OWNER) */
  public async setCourseTeachers(
    admin: AuthUser,
    input: SetCourseTeachersInput,
  ): Promise<Course> {
    const course = await this.prismaService.course.findUnique({
      where: { id: input.courseId },
      include: { teachers: { select: { teacherId: true } } },
    });
    if (!course) throw notFound('Course not found');
    await this.assertTeachers(input.teacherIds);

    // A join row has no history of its own: the audit row keeps the old list
    await this.prismaService.$transaction(async (tx) => {
      await tx.courseTeacher.deleteMany({ where: { courseId: course.id } });
      await tx.courseTeacher.createMany({
        data: teacherRows(input.teacherIds).map((t) => ({
          ...t,
          courseId: course.id,
        })),
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.COURSE_TEACHERS,
        entityType: 'Course',
        entityId: course.id,
        before: { teacherIds: course.teachers.map((t) => t.teacherId) },
        after: { teacherIds: input.teacherIds },
      });
    });
    return this.getCourse(course.id);
  }

  /** Split group: the admin or a teacher of the course picks students of the class */
  public async setCourseStudents(
    user: AuthUser,
    input: SetCourseStudentsInput,
  ): Promise<Course> {
    await this.accessPolicy.assertTeacherOf(user, input.courseId);
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: input.courseId },
    });
    if (!course.isSplitGroup) {
      throw badRequest('A whole-class course follows its class automatically');
    }
    await this.assertClassMembers(course.groupId, input.studentIds);

    await this.prismaService.$transaction(async (tx) => {
      const before = await tx.enrollment.findMany({
        where: { courseId: course.id, status: 'ACTIVE' },
        select: { studentId: true },
      });
      // Not on the new list: DROPPED (the row and its grades stay)
      await tx.enrollment.updateMany({
        where: {
          courseId: course.id,
          status: 'ACTIVE',
          studentId: { notIn: input.studentIds },
        },
        data: { status: 'DROPPED', droppedAt: new Date() },
      });
      await this.enrollmentService.enroll(
        tx,
        input.studentIds.map((studentId) => ({
          courseId: course.id,
          studentId,
        })),
      );
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.COURSE_STUDENTS,
        entityType: 'Course',
        entityId: course.id,
        before: { studentIds: before.map((e) => e.studentId) },
        after: { studentIds: input.studentIds },
      });
    });
    return this.getCourse(course.id);
  }

  // ───────────────────────── checks ─────────────────────────

  private async assertTeachers(teacherIds: string[]) {
    const found = await this.prismaService.user.count({
      where: { id: { in: teacherIds }, role: 'TEACHER', status: 'ACTIVE' },
    });
    if (found !== teacherIds.length) {
      throw badRequest('Every teacher must be an active teacher account');
    }
  }

  private async assertClassMembers(groupId: string, studentIds: string[]) {
    if (studentIds.length === 0) return;
    const found = await this.prismaService.groupMember.count({
      where: { groupId, studentId: { in: studentIds }, leftAt: null },
    });
    if (found !== studentIds.length) {
      throw badRequest('Every student must be in the course’s class');
    }
  }

  private async assertPeriodOfYear(periodId: string, academicYearId: string) {
    const period = await this.prismaService.period.count({
      where: { id: periodId, academicYearId },
    });
    if (!period) throw notFound('Period not found in this academic year');
  }
}

function teacherRows(teacherIds: string[]) {
  return teacherIds.map((teacherId, i) => ({
    teacherId,
    role: i === 0 ? ('OWNER' as const) : ('ASSISTANT' as const),
  }));
}

function toCourse(course: CourseRow): Course {
  return {
    id: course.id,
    title: course.title,
    status: course.status,
    isSplitGroup: course.isSplitGroup,
    academicYearId: course.academicYearId,
    periodId: course.periodId,
    groupId: course.groupId,
    groupName: course.group.name,
    subjectId: course.subjectId,
    subjectName: course.subject.name,
    teachers: course.teachers.map((t) => ({ ...t.teacher, role: t.role })),
    studentCount: course._count.enrollments,
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
