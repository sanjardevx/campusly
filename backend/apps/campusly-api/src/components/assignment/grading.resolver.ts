import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Assignment } from '../../libs/dto/assignment/assignment';
import { GradebookRow, Submission } from '../../libs/dto/assignment/submission';
import {
  GradeSubmissionInput,
  PublishGradesInput,
  ReturnSubmissionInput,
} from '../../libs/dto/assignment/submission.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { GradingService } from './grading.service';

// Layer 1: teachers and admins. Layer 2: GradingService → AccessPolicy (this course's teachers).
@Roles(Role.ADMIN, Role.TEACHER)
@Resolver()
export class GradingResolver {
  constructor(private readonly gradingService: GradingService) {}

  @Query(() => [GradebookRow])
  public assignmentSubmissions(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<GradebookRow[]> {
    return this.gradingService.getGradebook(user, assignmentId);
  }

  @Mutation(() => Submission)
  public gradeSubmission(
    @CurrentUser() user: AuthUser,
    @Args('input') input: GradeSubmissionInput,
  ): Promise<Submission> {
    return this.gradingService.gradeSubmission(user, input);
  }

  @Mutation(() => Submission)
  public returnSubmission(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ReturnSubmissionInput,
  ): Promise<Submission> {
    return this.gradingService.returnSubmission(user, input);
  }

  /** Returns how many students got a zero */
  @Mutation(() => Int)
  public giveZeroToMissing(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<number> {
    return this.gradingService.giveZeroToMissing(user, assignmentId);
  }

  @Mutation(() => Assignment)
  public publishGrades(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PublishGradesInput,
  ): Promise<Assignment> {
    return this.gradingService.publishGrades(user, input);
  }
}
