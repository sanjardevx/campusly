import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../libs/config';
import { errorReason } from '../../libs/utils/error-reason';

/** A reply keyboard with one "share my phone" button, or a request to remove the keyboard */
export type ReplyMarkup =
  | {
      keyboard: { text: string; request_contact?: boolean }[][];
      resize_keyboard: true;
      one_time_keyboard: true;
    }
  | { remove_keyboard: true };

/**
 * The only Telegram call the bot needs (sendMessage), with plain fetch — no bot library.
 * The bot token is part of the URL, so the URL is never logged.
 */
@Injectable()
export class TelegramClient {
  private readonly logger = new Logger('Telegram');
  private readonly token?: string;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('TELEGRAM_BOT_TOKEN', { infer: true });
  }

  get isEnabled(): boolean {
    return !!this.token;
  }

  /** Never throws: a failed reply is logged, the webhook still answers 200 (or Telegram retries forever) */
  public async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: ReplyMarkup,
  ): Promise<void> {
    if (!this.token) return;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: replyMarkup,
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!res.ok) {
        this.logger.warn(`sendMessage failed: HTTP ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`sendMessage failed: ${errorReason(err)}`);
    }
  }
}
