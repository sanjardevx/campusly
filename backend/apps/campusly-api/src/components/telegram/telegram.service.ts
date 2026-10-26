import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import {
  type Env,
  PASSWORD_RESET_TTL_MIN,
  RESET_LIMIT,
  TELEGRAM_LINK_TTL_MIN,
} from '../../libs/config';
import type {
  TelegramLink,
  TelegramStatus,
} from '../../libs/dto/telegram/telegram';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { normalizeUzPhone, parentLoginId } from '../../libs/utils/phone';
import { AuditService } from '../audit/audit.service';
import { consumeOneTimeToken, issueOneTimeToken } from '../auth/one-time-token';
import { TelegramClient } from './telegram.client';
import { BOT_MESSAGES, type BotLang, botLang } from './telegram.messages';

/** The parts of a Telegram update the bot reads (https://core.telegram.org/bots/api#update) */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; language_code?: string };
    text?: string;
    contact?: { phone_number: string; user_id?: number };
  };
}

interface Chat {
  id: string;
  /** The Telegram user who wrote */
  fromId?: number;
  lang: BotLang;
}

/** Who is linked to a chat (telegramChatId is omitted from results everywhere else) */
const LINKED_SELECT = {
  id: true,
  firstName: true,
  role: true,
  status: true,
  isDemo: true,
  locale: true,
} as const;

/**
 * The Telegram bot (DECISIONS §6): it links a Campusly account to a Telegram chat and sends
 * one-time password-reset links. Parents prove who they are with their own phone contact
 * (Telegram has verified that number); students with a one-time link from the portal.
 */
@Injectable()
export class TelegramService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    private readonly telegram: TelegramClient,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ─────────────────────────── portal (GraphQL) ───────────────────────────

  public async getStatus(user: AuthUser): Promise<TelegramStatus> {
    const row = await this.prismaService.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { telegramChatId: true },
    });
    return {
      enabled: this.telegram.isEnabled,
      linked: !!row.telegramChatId,
      botUsername:
        this.config.get('TELEGRAM_BOT_USERNAME', { infer: true }) ?? null,
    };
  }

  /** "Connect Telegram": a t.me deep link that opens the bot with a one-time code */
  public async createLink(user: AuthUser): Promise<TelegramLink> {
    const bot = this.config.get('TELEGRAM_BOT_USERNAME', { infer: true });
    if (!this.telegram.isEnabled || !bot) {
      throw new BadRequestException({
        code: ErrorCode.TELEGRAM_DISABLED,
        message: 'The Telegram bot is not set up on this server',
      });
    }
    const { token, expiresAt } = await issueOneTimeToken(
      this.prismaService,
      user.id,
      'TELEGRAM_LINK',
      TELEGRAM_LINK_TTL_MIN,
    );
    return { url: `https://t.me/${bot}?start=${token}`, expiresAt };
  }

  // ─────────────────────────── bot (webhook) ───────────────────────────

  /** One update from the webhook. Only private chats; everything else is ignored. */
  public async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message || message.chat.type !== 'private') return;

    const chatId = String(message.chat.id);
    const linked = await this.linkedUser(chatId);
    const chat: Chat = {
      id: chatId,
      fromId: message.from?.id,
      lang: botLang(linked?.locale ?? message.from?.language_code),
    };

    if (message.contact) {
      return this.linkByContact(chat, message.contact);
    }
    const [command, payload] = (message.text ?? '').trim().split(/\s+/, 2);
    switch (command) {
      case '/start':
        return payload ? this.linkByCode(chat, payload) : this.welcome(chat);
      case '/reset':
        return this.sendResetLink(chat);
      case '/unlink':
        return this.unlink(chat);
      default:
        return this.reply(chat, linked ? 'help' : 'welcome');
    }
  }

  private welcome(chat: Chat) {
    const text = BOT_MESSAGES[chat.lang];
    return this.telegram.sendMessage(chat.id, text.welcome, {
      keyboard: [[{ text: text.shareButton, request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
  }

  /**
   * A parent shared a contact. It must be their OWN contact (contact.user_id = the sender):
   * a forwarded contact of someone else would otherwise link a stranger to that parent.
   */
  private async linkByContact(
    chat: Chat,
    contact: { phone_number: string; user_id?: number },
  ) {
    if (!chat.fromId || contact.user_id !== chat.fromId) {
      return this.reply(chat, 'notOwnContact');
    }
    const phone = normalizeUzPhone(contact.phone_number);
    const parent = phone
      ? await this.prismaService.user.findFirst({
          where: {
            loginId: parentLoginId(phone),
            role: 'PARENT',
            status: 'ACTIVE',
            isDemo: false,
          },
          select: LINKED_SELECT,
        })
      : null;
    if (!parent) return this.reply(chat, 'phoneNotFound');
    await this.link(chat, parent);
  }

  /** /start <code> from the portal's "Connect Telegram" link */
  private async linkByCode(chat: Chat, code: string) {
    const userId = /^[\w-]{20,64}$/.test(code)
      ? await consumeOneTimeToken(this.prismaService, 'TELEGRAM_LINK', code)
      : null;
    const user = userId
      ? await this.prismaService.user.findFirst({
          where: { id: userId, status: 'ACTIVE', isDemo: false },
          select: LINKED_SELECT,
        })
      : null;
    if (!user) return this.reply(chat, 'linkInvalid');
    await this.link(chat, user);
  }

  /** One chat ↔ one account: the chat is taken away from any other account first */
  private async link(
    chat: Chat,
    user: { id: string; firstName: string; locale: string },
  ) {
    await this.prismaService.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { telegramChatId: chat.id, NOT: { id: user.id } },
        data: { telegramChatId: null },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { telegramChatId: chat.id },
      });
      await this.auditService.log(tx, {
        actor: { id: user.id },
        action: AuditAction.USER_TELEGRAM_LINK,
        entityType: 'User',
        entityId: user.id,
      });
    });
    const text = BOT_MESSAGES[botLang(user.locale)];
    await this.telegram.sendMessage(chat.id, text.linked(user.firstName), {
      remove_keyboard: true,
    });
  }

  /** /reset: a one-time link to the new-password page (3 per chat per hour) */
  private async sendResetLink(chat: Chat) {
    const user = await this.linkedUser(chat.id);
    if (!user) return this.reply(chat, 'notLinked');
    if (
      user.status !== 'ACTIVE' ||
      user.isDemo ||
      (user.role !== 'PARENT' && user.role !== 'STUDENT')
    ) {
      return this.reply(chat, 'resetUnavailable');
    }
    const key = `reset:chat:${chat.id}`;
    const [count] = (await this.redisService
      .multi()
      .incr(key)
      .expire(key, RESET_LIMIT.windowSec, 'NX')
      .exec()) as [[Error | null, number]];
    if (count[1] > RESET_LIMIT.perChat)
      return this.reply(chat, 'tooManyResets');

    const { token } = await issueOneTimeToken(
      this.prismaService,
      user.id,
      'PASSWORD_RESET',
      PASSWORD_RESET_TTL_MIN,
    );
    const url = `${this.config.get('FRONTEND_URL', { infer: true })}/reset-password?token=${token}`;
    await this.telegram.sendMessage(
      chat.id,
      BOT_MESSAGES[chat.lang].resetLink(url, PASSWORD_RESET_TTL_MIN),
    );
  }

  /** /unlink: the account forgets this chat (no hard delete: the column becomes null, audited) */
  private async unlink(chat: Chat) {
    const user = await this.linkedUser(chat.id);
    if (!user) return this.reply(chat, 'notLinked');
    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { telegramChatId: null },
      });
      await this.auditService.log(tx, {
        actor: { id: user.id },
        action: AuditAction.USER_TELEGRAM_UNLINK,
        entityType: 'User',
        entityId: user.id,
      });
    });
    await this.reply(chat, 'unlinked');
  }

  private linkedUser(chatId: string) {
    return this.prismaService.user.findFirst({
      where: { telegramChatId: chatId },
      select: LINKED_SELECT,
    });
  }

  private reply(
    chat: Chat,
    key:
      | 'notOwnContact'
      | 'phoneNotFound'
      | 'linkInvalid'
      | 'notLinked'
      | 'resetUnavailable'
      | 'tooManyResets'
      | 'unlinked'
      | 'help'
      | 'welcome',
  ) {
    if (key === 'welcome') return this.welcome(chat);
    return this.telegram.sendMessage(chat.id, BOT_MESSAGES[chat.lang][key]);
  }

  /** Webhook guard: the bot must be configured, or the endpoint does not exist */
  public assertEnabled() {
    if (!this.telegram.isEnabled) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Not found',
      });
    }
  }
}
