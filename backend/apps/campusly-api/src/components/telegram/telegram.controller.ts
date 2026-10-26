import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Env } from '../../libs/config';
import { ErrorCode } from '../../libs/enums/common.enum';
import { errorReason } from '../../libs/utils/error-reason';
import { Public } from '../auth/decorators/auth.decorators';
import { type TelegramUpdate, TelegramService } from './telegram.service';

/**
 * Telegram calls this URL for every message to the bot (setWebhook, deploy README §13).
 * Public (Telegram has no user token), so it checks the secret Telegram sends in a header.
 */
@Public()
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger('Telegram');

  constructor(
    private readonly telegramService: TelegramService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  public async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ): Promise<void> {
    this.telegramService.assertEnabled();
    if (!this.isTrusted(secret)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Wrong secret',
      });
    }
    try {
      await this.telegramService.handleUpdate(update);
    } catch (err) {
      // Answer 200 anyway: Telegram would resend the same update again and again
      this.logger.error(
        `Update ${update?.update_id} failed: ${errorReason(err)}`,
      );
    }
  }

  /** Constant-time compare, so the secret cannot be guessed from response times */
  private isTrusted(secret: string | undefined): boolean {
    const expected = this.config.get('TELEGRAM_WEBHOOK_SECRET', {
      infer: true,
    });
    if (!secret || !expected) return false;
    const a = Buffer.from(secret);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
