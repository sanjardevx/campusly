import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  TutorConversation,
  TutorMessage,
  TutorStatus,
  TutorThread,
} from '../../libs/dto/tutor/tutor';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { TutorService } from './tutor.service';

/**
 * AI Study Tutor reads (the answer itself streams from POST /tutor/chat).
 * STUDENT only: parents never see tutor conversations (CLAUDE.md), staff see nothing yet.
 */
@Resolver()
export class TutorResolver {
  constructor(private readonly tutorService: TutorService) {}

  @Roles(Role.STUDENT)
  @Query(() => TutorStatus)
  public tutorStatus(@CurrentUser() user: AuthUser): Promise<TutorStatus> {
    return this.tutorService.getStatus(user);
  }

  @Roles(Role.STUDENT)
  @Query(() => [TutorConversation])
  public tutorConversations(
    @CurrentUser() user: AuthUser,
  ): Promise<TutorConversation[]> {
    return this.tutorService.getConversations(user);
  }

  @Roles(Role.STUDENT)
  @Query(() => TutorThread)
  public tutorConversation(
    @CurrentUser() user: AuthUser,
    @Args('conversationId', { type: () => String }) conversationId: string,
  ): Promise<TutorThread> {
    return this.tutorService.getThread(user, conversationId);
  }

  /** "I solved it": back to help level 1 for the next problem */
  @Roles(Role.STUDENT)
  @Mutation(() => TutorMessage)
  public markTutorSolved(
    @CurrentUser() user: AuthUser,
    @Args('conversationId', { type: () => String }) conversationId: string,
  ): Promise<TutorMessage> {
    return this.tutorService.markSolved(user, conversationId);
  }
}
