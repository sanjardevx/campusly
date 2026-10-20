import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Course, CourseDetail } from '../../libs/dto/course/course';
import {
  CoursesFilter,
  CreateCourseInput,
  SetCourseStudentsInput,
  SetCourseTeachersInput,
  UpdateCourseInput,
} from '../../libs/dto/course/course.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { CourseService } from './course.service';

@Resolver()
export class CourseResolver {
  constructor(private readonly courseService: CourseService) {}

  // ───────────────────────── reading ─────────────────────────

  /** Student: own courses. Parent: a child's (studentId optional with one child). Admin: any student. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => [Course])
  public myCourses(
    @CurrentUser() user: AuthUser,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<Course[]> {
    return this.courseService.getMyCourses(user, studentId);
  }

  @Roles(Role.TEACHER)
  @Query(() => [Course])
  public teachingCourses(@CurrentUser() user: AuthUser): Promise<Course[]> {
    return this.courseService.getTeachingCourses(user);
  }

  @Roles(Role.ADMIN)
  @Query(() => [Course])
  public courses(
    @Args('filter', { nullable: true }) filter?: CoursesFilter,
  ): Promise<Course[]> {
    return this.courseService.getCourses(filter);
  }

  /** Every role; AccessPolicy decides (no relation → NOT_FOUND) */
  @Query(() => CourseDetail)
  public courseDetail(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseDetail> {
    return this.courseService.getCourseDetail(user, courseId);
  }

  // ───────────────────── setup (admin) ─────────────────────

  @Roles(Role.ADMIN)
  @Mutation(() => Course)
  public createCourse(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateCourseInput,
  ): Promise<Course> {
    return this.courseService.createCourse(admin, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Course)
  public updateCourse(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: UpdateCourseInput,
  ): Promise<Course> {
    return this.courseService.updateCourse(admin, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Course)
  public setCourseTeachers(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SetCourseTeachersInput,
  ): Promise<Course> {
    return this.courseService.setCourseTeachers(admin, input);
  }

  /** The course's own teachers may pick their split group too (AccessPolicy checks) */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Course)
  public setCourseStudents(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetCourseStudentsInput,
  ): Promise<Course> {
    return this.courseService.setCourseStudents(user, input);
  }
}
