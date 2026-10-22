import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AttendanceJournal,
  CourseAttendance,
  StudentAttendance,
} from '../../libs/dto/attendance/attendance';
import { MarkAttendanceInput } from '../../libs/dto/attendance/attendance.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { AttendanceService } from './attendance.service';

@Resolver()
export class AttendanceResolver {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => CourseAttendance)
  public markAttendance(
    @CurrentUser() user: AuthUser,
    @Args('input') input: MarkAttendanceInput,
  ): Promise<CourseAttendance> {
    return this.attendanceService.markAttendance(user, input);
  }

  /** date: "YYYY-MM-DD" */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Query(() => CourseAttendance)
  public courseAttendance(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args('date') date: string,
  ): Promise<CourseAttendance> {
    return this.attendanceService.getCourseAttendance(user, courseId, date);
  }

  /** from / to: "YYYY-MM-DD", both included (Records page: attendance journal) */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Query(() => AttendanceJournal)
  public attendanceJournal(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args('from') from: string,
    @Args('to') to: string,
  ): Promise<AttendanceJournal> {
    return this.attendanceService.getAttendanceJournal(
      user,
      courseId,
      from,
      to,
    );
  }

  /** Student: own. Parent: a child (studentId optional with one child). Admin: any student. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => StudentAttendance)
  public myAttendance(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<StudentAttendance> {
    return this.attendanceService.getMyAttendance(user, courseId, studentId);
  }
}
