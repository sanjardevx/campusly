import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import {
  TUTOR_DAILY_BUDGET_USD,
  TUTOR_DAILY_LIMIT,
  TUTOR_PRICES,
  TUTOR_TIMEZONE,
} from '../../libs/config';
import { ErrorCode } from '../../libs/enums/common.enum';
import { todayInZone } from '../../libs/utils/date';

/** Counters live two days: long enough for "today" in any timezone, then Redis forgets them */
const TTL_SEC = 2 * 24 * 60 * 60;
/** The budget is counted in millionths of a dollar: Redis INCRBY takes integers */
const MICRO = 1_000_000;

/**
 * The tutor's two limits (DECISIONS §14), in Redis because every request checks them:
 * - per student: TUTOR_DAILY_LIMIT requests a day (INCR is atomic, so two tabs cannot both
 *   take the last one);
 * - per school: TUTOR_DAILY_BUDGET_USD of model spend a day, so a bug or a busy day cannot
 *   run up the AWS bill. A request already running may finish over it; the next one waits.
 * "Today" is the school's day (Asia/Tashkent): both reset at local midnight.
 */
@Injectable()
export class TutorLimitsService {
  constructor(private readonly redis: RedisService) {}

  private day(now = new Date()) {
    return todayInZone(TUTOR_TIMEZONE, now);
  }
  private questionKey(studentId: string) {
    return `tutor:questions:${this.day()}:${studentId}`;
  }
  private budgetKey() {
    return `tutor:spend:${this.day()}`;
  }

  public async used(studentId: string): Promise<number> {
    return Number((await this.redis.get(this.questionKey(studentId))) ?? 0);
  }

  /** Takes one of today's requests, or refuses when none are left */
  public async reserve(studentId: string): Promise<number> {
    const key = this.questionKey(studentId);
    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, TTL_SEC);
    if (used > TUTOR_DAILY_LIMIT) {
      await this.redis.decr(key);
      throw new HttpException(
        {
          code: ErrorCode.TUTOR_LIMIT,
          message: 'No tutor questions left today',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return used;
  }

  /** The request failed before the model answered: it does not count */
  public async refund(studentId: string): Promise<void> {
    await this.redis.decr(this.questionKey(studentId));
  }

  public async assertBudget(): Promise<void> {
    const spent = Number((await this.redis.get(this.budgetKey())) ?? 0);
    if (spent >= TUTOR_DAILY_BUDGET_USD * MICRO) {
      throw new ServiceUnavailableException({
        code: ErrorCode.TUTOR_BUDGET,
        message: "Today's tutor budget is used up",
      });
    }
  }

  /** Adds the cost of one model call (chat or embeddings) to today's spend */
  public async addCost(usage: {
    inputTokens?: number;
    outputTokens?: number;
    embedTokens?: number;
  }): Promise<void> {
    const usd =
      ((usage.inputTokens ?? 0) * TUTOR_PRICES.input +
        (usage.outputTokens ?? 0) * TUTOR_PRICES.output +
        (usage.embedTokens ?? 0) * TUTOR_PRICES.embed) /
      1_000_000;
    const micro = Math.ceil(usd * MICRO);
    if (micro === 0) return;
    const key = this.budgetKey();
    await this.redis.incrby(key, micro);
    await this.redis.expire(key, TTL_SEC);
  }
}
