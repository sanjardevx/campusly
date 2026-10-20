import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LessonProgress } from '../../libs/dto/progress/progress';
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

  @Mutation(() => LessonProgress)
  public completeLesson(
    @CurrentUser() user: AuthUser,
    @Args('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonProgress> {
    return this.progressService.completeLesson(user, lessonId);
  }
}
