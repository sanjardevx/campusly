import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../libs/config';
import { errorReason } from '../libs/utils/error-reason';

// One shared Redis connection (login rate limit, health). BullMQ opens its own connections.
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  private isDown = false;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('REDIS_URL', { infer: true });
    // Fail a command quickly instead of waiting forever when Redis is down
    super(url, { maxRetriesPerRequest: 1 });
    const { host } = new URL(url);

    // Logged on start and after every reconnect
    this.on('ready', () => {
      this.isDown = false;
      this.logger.log(`Redis is connected (${host})`);
    });
    // ioredis retries every few seconds: log the outage once, not on every retry
    this.on('error', (err) => {
      if (this.isDown) return;
      this.isDown = true;
      this.logger.error(
        `Redis is NOT connected (${host}): ${errorReason(err)}`,
      );
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
