import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { TelegramLink, TelegramStatus } from '../../libs/dto/telegram/telegram';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import {
  CurrentUser,
  NotForDemo,
  Roles,
} from '../auth/decorators/auth.decorators';
import { TelegramService } from './telegram.service';

/** Students and parents connect Telegram to reset a forgotten password (DECISIONS §6) */
@Resolver()
export class TelegramResolver {
  constructor(private readonly telegramService: TelegramService) {}

  @Roles(Role.STUDENT, Role.PARENT)
  @Query(() => TelegramStatus)
  public telegramStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<TelegramStatus> {
    return this.telegramService.getStatus(user);
  }

  /** Students only: parents connect by sharing their phone contact with the bot (no portal link) */
  @NotForDemo()
  @Roles(Role.STUDENT)
  @Mutation(() => TelegramLink)
  public createTelegramLink(
    @CurrentUser() user: AuthUser,
  ): Promise<TelegramLink> {
    return this.telegramService.createLink(user);
  }
}
