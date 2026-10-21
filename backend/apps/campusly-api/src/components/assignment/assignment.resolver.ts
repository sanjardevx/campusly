import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Assignment } from '../../libs/dto/assignment/assignment';
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '../../libs/dto/assignment/assignment.input';
import { PublishInput } from '../../libs/dto/course/content.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { AssignmentService } from './assignment.service';

@Resolver()
export class AssignmentResolver {
  constructor(private readonly assignmentService: AssignmentService) {}

  // ───────────── reading: every role, AccessPolicy decides ─────────────

  @Query(() => [Assignment])
  public courseAssignments(
    @CurrentUser() user: AuthUser,
    @Args('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Assignment[]> {
    return this.assignmentService.getCourseAssignments(user, courseId);
  }

  @Query(() => Assignment)
  public assignment(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<Assignment> {
    return this.assignmentService.getAssignment(user, id);
  }

  // ───────────── changes: the course's teachers (and admins) ─────────────

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Assignment)
  public createAssignment(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateAssignmentInput,
  ): Promise<Assignment> {
    return this.assignmentService.createAssignment(user, input);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Assignment)
  public updateAssignment(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateAssignmentInput,
  ): Promise<Assignment> {
    return this.assignmentService.updateAssignment(user, input);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Assignment)
  public publishAssignment(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PublishInput,
  ): Promise<Assignment> {
    return this.assignmentService.publishAssignment(user, input);
  }
}
