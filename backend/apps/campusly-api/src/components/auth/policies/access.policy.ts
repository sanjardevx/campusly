import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ErrorCode } from '../../../libs/enums/common.enum';
import type { AuthUser } from '../../../libs/types/auth';

/**
 * Layer 2 of authorization (DECISIONS §8). RolesGuard answers "may this ROLE do this?";
 * AccessPolicy answers "may THIS user touch THIS record?" — always from the database,
 * never from IDs the client sends (that mistake is IDOR, OWASP's #1). Nestar had no such layer.
 *
 * No relation at all → 404 (do not even reveal the record exists).
 * Related but the action is not allowed → 403.
 */
@Injectable()
export class AccessPolicy {
  constructor(private readonly prismaService: PrismaService) {}

  /** Prisma `where` for course lists. Combine with filters as `{ AND: [scope, filters] }`. */
  public courseScope(user: AuthUser): Prisma.CourseWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return {};
      case 'TEACHER':
        return { teachers: { some: { teacherId: user.id } } };
      case 'STUDENT':
        return {
          enrollments: { some: { studentId: user.id, status: 'ACTIVE' } },
        };
      case 'PARENT':
        // Courses of the parent's children (active link and active enrollment)
        return {
          enrollments: {
            some: {
              status: 'ACTIVE',
              student: {
                parents: { some: { parentId: user.id, revokedAt: null } },
              },
            },
          },
        };
    }
  }

  public async assertCanViewCourse(
    user: AuthUser,
    courseId: string,
  ): Promise<void> {
    if (!(await this.canViewCourse(user, courseId)))
      throw notFound('Course not found');
  }

  /**
   * One lesson (video, files, later assignments). Teachers and admins see drafts; students and
   * parents only a lesson that is published in a published, not hidden week of a non-draft course.
   * Returns the lesson so the caller does not load it again.
   */
  public async assertCanViewLesson(user: AuthUser, lessonId: string) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            courseId: true,
            isHidden: true,
            publishedAt: true,
            course: { select: { status: true } },
          },
        },
      },
    });
    if (!lesson) throw notFound('Lesson not found');
    await this.assertCanViewCourse(user, lesson.module.courseId);

    if (user.role === 'STUDENT' || user.role === 'PARENT') {
      const now = new Date();
      const { module } = lesson;
      const visible =
        module.course.status !== 'DRAFT' &&
        !module.isHidden &&
        !!module.publishedAt &&
        module.publishedAt <= now &&
        !!lesson.publishedAt &&
        lesson.publishedAt <= now;
      // A draft is "not found", the same as a lesson of another course
      if (!visible) throw notFound('Lesson not found');
    }
    return lesson;
  }

  /** Change the course (lessons, assignments, grades, attendance): its teachers and admins */
  public async assertTeacherOf(
    user: AuthUser,
    courseId: string,
  ): Promise<void> {
    if (user.role === 'ADMIN') {
      if (!(await this.courseExists(courseId)))
        throw notFound('Course not found');
      return;
    }
    const isTeacher =
      user.role === 'TEACHER' &&
      (await this.prismaService.courseTeacher.count({
        where: { courseId, teacherId: user.id },
      })) > 0;
    if (isTeacher) return;
    // A student or parent of this course is related: 403. A stranger: 404.
    if (await this.canViewCourse(user, courseId)) {
      throw forbidden('Only the teachers of this course can do this');
    }
    throw notFound('Course not found');
  }

  /** A teacher (or admin) looks at one student of the course: the student must be enrolled */
  public async assertCanViewStudentInCourse(
    user: AuthUser,
    courseId: string,
    studentId: string,
  ): Promise<void> {
    await this.assertTeacherOf(user, courseId);
    const enrolled = await this.prismaService.enrollment.count({
      where: { courseId, studentId, status: 'ACTIVE' },
    });
    if (!enrolled) throw notFound('Student not found in this course');
  }

  /**
   * Which student the request is about (studentOverview, grades, attendance):
   * STUDENT → always themselves (a studentId from the client is ignored),
   * PARENT → one of their linked children, ADMIN → any student.
   */
  public async resolveStudentScope(
    user: AuthUser,
    studentId?: string,
  ): Promise<string> {
    switch (user.role) {
      case 'STUDENT':
        return user.id;
      case 'PARENT': {
        const links = await this.prismaService.parentStudent.findMany({
          where: { parentId: user.id, revokedAt: null },
          select: { studentId: true },
        });
        const children = links.map((l) => l.studentId);
        // One child and no choice made: that child (the "child switcher" sends an id for 2+)
        if (!studentId && children.length === 1) return children[0];
        if (studentId && children.includes(studentId)) return studentId;
        throw notFound('Student not found');
      }
      case 'ADMIN': {
        const exists =
          !!studentId &&
          (await this.prismaService.user.count({
            where: { id: studentId, role: 'STUDENT' },
          })) > 0;
        if (!exists) throw notFound('Student not found');
        return studentId;
      }
      case 'TEACHER':
        // Teachers see students only through their courses (assertCanViewStudentInCourse)
        throw forbidden('Use the course view to see a student');
    }
  }

  // ───────────────────────── helpers ─────────────────────────

  private async canViewCourse(
    user: AuthUser,
    courseId: string,
  ): Promise<boolean> {
    const count = await this.prismaService.course.count({
      where: { AND: [{ id: courseId }, this.courseScope(user)] },
    });
    return count > 0;
  }

  private async courseExists(courseId: string): Promise<boolean> {
    return (
      (await this.prismaService.course.count({ where: { id: courseId } })) > 0
    );
  }
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}

function forbidden(message: string) {
  return new ForbiddenException({ code: ErrorCode.FORBIDDEN, message });
}
