import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CourseProgress,
  LessonProgress,
} from '../../libs/dto/progress/progress';
import { LessonProgressInput } from '../../libs/dto/progress/progress.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { ProgressService } from './progress.service';

// Only students have progress: a parent or teacher watching does not count
@Roles(Role.STUDENT)
@Resolver()
export class ProgressResolver {
  constructor(private readonly progressService: ProgressService) {}

  @Mutation(() => LessonProgress)
  public updateLessonProgress(
    @CurrentUser() user: AuthUser,
    @Args('input') input: LessonProgressInput,
  ): Promise<LessonProgress> {
    return this.progressService.updateLessonProgress(user, input);
  }

  /** The course page's state (lessons, assignments). Same student rule as studentOverview. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => CourseProgress)
  public courseProgress(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<CourseProgress> {
    return this.progressService.getCourseProgress(user, courseId, studentId);
  }

  @Mutation(() => LessonProgress)
  public completeLesson(
    @CurrentUser() user: AuthUser,
    @Args('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonProgress> {
    return this.progressService.completeLesson(user, lessonId);
  }
}
