import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Submission } from '../../libs/dto/assignment/submission';
import {
  AddSubmissionCommentInput,
  SubmitAssignmentInput,
} from '../../libs/dto/assignment/submission.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { SubmissionService } from './submission.service';

@Resolver()
export class SubmissionResolver {
  constructor(private readonly submissionService: SubmissionService) {}

  @Roles(Role.STUDENT)
  @Mutation(() => Submission)
  public submitAssignment(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SubmitAssignmentInput,
  ): Promise<Submission> {
    return this.submissionService.submitAssignment(user, input);
  }

  /** Parents reach the service only to get a clear FORBIDDEN for their own child */
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.PARENT)
  @Mutation(() => Submission)
  public addSubmissionComment(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AddSubmissionCommentInput,
  ): Promise<Submission> {
    return this.submissionService.addSubmissionComment(user, input);
  }

  /** Student: own. Parent: a child (studentId optional with one child). Admin: any student. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => Submission, { nullable: true })
  public mySubmission(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<Submission | null> {
    return this.submissionService.getMySubmission(
      user,
      assignmentId,
      studentId,
    );
  }
}
