import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CourseQuestion,
  CourseQuestions,
  CourseQuestionThread,
} from '../../libs/dto/question/question';
import {
  AnswerQuestionInput,
  AskQuestionInput,
  CourseQuestionsInquiry,
} from '../../libs/dto/question/question.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { QuestionService } from './question.service';

/** Course Q&A: students and staff only — parents never see it (DECISIONS §14) */
@Resolver()
export class QuestionResolver {
  constructor(private readonly questionService: QuestionService) {}

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Query(() => CourseQuestions)
  public courseQuestions(
    @CurrentUser() user: AuthUser,
    @Args('input', { nullable: true }) input?: CourseQuestionsInquiry,
  ): Promise<CourseQuestions> {
    return this.questionService.getQuestions(user, input);
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Query(() => CourseQuestionThread)
  public courseQuestion(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<CourseQuestionThread> {
    return this.questionService.getThread(user, id);
  }

  @Roles(Role.STUDENT)
  @Mutation(() => CourseQuestion)
  public askQuestion(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AskQuestionInput,
  ): Promise<CourseQuestion> {
    return this.questionService.ask(user, input);
  }

  /** The question's teachers and the classmates who can see it */
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Mutation(() => CourseQuestionThread)
  public answerQuestion(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AnswerQuestionInput,
  ): Promise<CourseQuestionThread> {
    return this.questionService.answer(user, input);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => CourseQuestionThread)
  public setQuestionResolved(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
    @Args('resolved') resolved: boolean,
  ): Promise<CourseQuestionThread> {
    return this.questionService.setResolved(user, id, resolved);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => CourseQuestionThread)
  public setQuestionPinned(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
    @Args('pinned') pinned: boolean,
  ): Promise<CourseQuestionThread> {
    return this.questionService.setPinned(user, id, pinned);
  }

  /** Hidden for everyone; audited */
  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => Boolean)
  public hideQuestion(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.questionService.hideQuestion(user, id);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => CourseQuestionThread)
  public hideAnswer(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<CourseQuestionThread> {
    return this.questionService.hideAnswer(user, id);
  }
}
