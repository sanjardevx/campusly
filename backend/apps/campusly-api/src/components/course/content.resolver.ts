import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Lesson, Module } from '../../libs/dto/course/content';
import {
  CreateLessonInput,
  CreateModuleInput,
  PublishInput,
  ReorderInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from '../../libs/dto/course/content.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { ContentService } from './content.service';

// Layer 1 (role): teachers and admins. Layer 2 (this course?): ContentService → AccessPolicy.
@Roles(Role.ADMIN, Role.TEACHER)
@Resolver()
export class ContentResolver {
  constructor(private readonly contentService: ContentService) {}

  // ───────────────────────── modules ─────────────────────────

  @Mutation(() => Module)
  public createModule(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateModuleInput,
  ): Promise<Module> {
    return this.contentService.createModule(user, input);
  }

  @Mutation(() => Module)
  public updateModule(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateModuleInput,
  ): Promise<Module> {
    return this.contentService.updateModule(user, input);
  }

  @Mutation(() => Module)
  public publishModule(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PublishInput,
  ): Promise<Module> {
    return this.contentService.publishModule(user, input);
  }

  /** parentId = courseId */
  @Mutation(() => [Module])
  public reorderModules(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ReorderInput,
  ): Promise<Module[]> {
    return this.contentService.reorderModules(user, input);
  }

  // ───────────────────────── lessons ─────────────────────────

  @Mutation(() => Lesson)
  public createLesson(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateLessonInput,
  ): Promise<Lesson> {
    return this.contentService.createLesson(user, input);
  }

  @Mutation(() => Lesson)
  public updateLesson(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateLessonInput,
  ): Promise<Lesson> {
    return this.contentService.updateLesson(user, input);
  }

  @Mutation(() => Lesson)
  public publishLesson(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PublishInput,
  ): Promise<Lesson> {
    return this.contentService.publishLesson(user, input);
  }

  /** parentId = moduleId */
  @Mutation(() => Module)
  public reorderLessons(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ReorderInput,
  ): Promise<Module> {
    return this.contentService.reorderLessons(user, input);
  }
}
