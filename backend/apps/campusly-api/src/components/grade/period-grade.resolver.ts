import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MyPeriodGrades, PeriodGradeRow } from '../../libs/dto/grade/grade';
import {
  PublishPeriodGradesInput,
  SetPeriodFinalScoreInput,
} from '../../libs/dto/grade/grade.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { PeriodGradeService } from './period-grade.service';

@Resolver()
export class PeriodGradeResolver {
  constructor(private readonly periodGradeService: PeriodGradeService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Query(() => [PeriodGradeRow])
  public coursePeriodGrades(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args('periodId', ParseUUIDPipe) periodId: string,
  ): Promise<PeriodGradeRow[]> {
    return this.periodGradeService.getCoursePeriodGrades(
      user,
      courseId,
      periodId,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => [PeriodGradeRow])
  public publishPeriodGrades(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PublishPeriodGradesInput,
  ): Promise<PeriodGradeRow[]> {
    return this.periodGradeService.publishPeriodGrades(user, input);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => PeriodGradeRow)
  public setPeriodFinalScore(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetPeriodFinalScoreInput,
  ): Promise<PeriodGradeRow> {
    return this.periodGradeService.setPeriodFinalScore(user, input);
  }

  /** Student: own. Parent: a child (studentId optional with one child). Admin: any student. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => MyPeriodGrades)
  public myPeriodGrades(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<MyPeriodGrades> {
    return this.periodGradeService.getMyPeriodGrades(user, courseId, studentId);
  }
}
