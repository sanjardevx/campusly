import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MyQuiz, QuizEditor, QuizResult } from '../../libs/dto/quiz/quiz';
import {
  SaveQuizAnswerInput,
  SetQuizQuestionsInput,
} from '../../libs/dto/quiz/quiz.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { QuizService } from './quiz.service';

@Resolver()
export class QuizResolver {
  constructor(private readonly quizService: QuizService) {}

  // ───────────── teachers (and admins) of the course ─────────────

  @Roles(Role.ADMIN, Role.TEACHER)
  @Query(() => QuizEditor)
  public quizEditor(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<QuizEditor> {
    return this.quizService.getEditor(user, assignmentId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => QuizEditor)
  public setQuizQuestions(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetQuizQuestionsInput,
  ): Promise<QuizEditor> {
    return this.quizService.setQuestions(user, input);
  }

  // ───────────── the student's own attempt ─────────────

  @Roles(Role.STUDENT)
  @Query(() => MyQuiz)
  public myQuiz(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<MyQuiz> {
    return this.quizService.getMyQuiz(user, assignmentId);
  }

  @Roles(Role.STUDENT)
  @Mutation(() => MyQuiz)
  public startQuiz(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<MyQuiz> {
    return this.quizService.startQuiz(user, assignmentId);
  }

  @Roles(Role.STUDENT)
  @Mutation(() => Boolean)
  public saveQuizAnswer(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SaveQuizAnswerInput,
  ): Promise<boolean> {
    return this.quizService.saveAnswer(user, input);
  }

  @Roles(Role.STUDENT)
  @Mutation(() => MyQuiz)
  public submitQuiz(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<MyQuiz> {
    return this.quizService.submitQuiz(user, assignmentId);
  }

  // ───────────── results: every role, the service decides ─────────────

  /** Students / parents after grades are published; teachers any enrolled student (studentId) */
  @Query(() => QuizResult)
  public quizResult(
    @CurrentUser() user: AuthUser,
    @Args('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Args(
      'studentId',
      { nullable: true, type: () => String },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<QuizResult> {
    return this.quizService.getResult(user, assignmentId, studentId);
  }
}
