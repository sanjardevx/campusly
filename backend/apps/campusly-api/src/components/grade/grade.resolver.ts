import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { StudentGrade } from '../../libs/dto/grade/grade';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { GradeService } from './grade.service';

@Resolver()
export class GradeResolver {
  constructor(private readonly gradeService: GradeService) {}

  /** The teacher's view of the whole class for one period */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Query(() => [StudentGrade])
  public courseGrades(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args('periodId', ParseUUIDPipe) periodId: string,
  ): Promise<StudentGrade[]> {
    return this.gradeService.getCourseGrades(user, courseId, periodId);
  }

  /** Student: own. Parent: a child (studentId optional with one child). Admin: any student. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => StudentGrade)
  public myCourseGrade(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args('periodId', ParseUUIDPipe) periodId: string,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<StudentGrade> {
    return this.gradeService.getMyCourseGrade(
      user,
      courseId,
      periodId,
      studentId,
    );
  }
}
