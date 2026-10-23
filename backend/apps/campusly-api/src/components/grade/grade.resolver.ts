import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GradeCategory } from '../../libs/dto/course/course';
import { StudentGrade } from '../../libs/dto/grade/grade';
import { SetGradeCategoriesInput } from '../../libs/dto/grade/grade.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { GradeCategoryService } from './grade-category.service';
import { GradeService } from './grade.service';

@Resolver()
export class GradeResolver {
  constructor(
    private readonly gradeService: GradeService,
    private readonly gradeCategoryService: GradeCategoryService,
  ) {}

  /** The gradebook's weights modal: the course's teachers (AccessPolicy), not archived */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => [GradeCategory])
  public setGradeCategories(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetGradeCategoriesInput,
  ): Promise<GradeCategory[]> {
    return this.gradeCategoryService.setGradeCategories(user, input);
  }

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
