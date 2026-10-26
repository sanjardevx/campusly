import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DEMO_RESET_CRON,
  DEMO_RESET_TIMEZONE,
  type Env,
} from '../../campusly-api/src/libs/config';
import { errorReason } from '../../campusly-api/src/libs/utils/error-reason';
import { CampuslyBatchService } from './campusly-batch.service';

export const BATCH_STALE_UPLOADS = 'BATCH_STALE_UPLOADS';
export const BATCH_DEMO_RESET = 'BATCH_DEMO_RESET';
export const BATCH_QUIZ_DEADLINES = 'BATCH_QUIZ_DEADLINES';

// Same idea as Nestar's BatchController: the schedule here, the work in the service,
// and a failing job is logged instead of crashing the worker
@Injectable()
export class BatchCron implements OnApplicationBootstrap {
  private readonly logger = new Logger('BatchCron');

  constructor(
    private readonly batchService: CampuslyBatchService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Batch worker is ready');
    if (this.config.get('DEMO_MODE', { infer: true })) {
      this.logger.log(
        `${BATCH_DEMO_RESET}: on (${DEMO_RESET_CRON}, ${DEMO_RESET_TIMEZONE})`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR, { name: BATCH_STALE_UPLOADS })
  public async failStaleUploads() {
    try {
      const count = await this.batchService.failStaleUploads();
      if (count)
        this.logger.log(`${BATCH_STALE_UPLOADS}: ${count} marked FAILED`);
    } catch (err) {
      this.logger.error(`${BATCH_STALE_UPLOADS} failed: ${errorReason(err)}`);
    }
  }

  // A real school server has DEMO_MODE=false: the job runs on schedule but never touches data
  @Cron(DEMO_RESET_CRON, {
    name: BATCH_DEMO_RESET,
    timeZone: DEMO_RESET_TIMEZONE,
  })
  public async resetDemo() {
    if (!this.config.get('DEMO_MODE', { infer: true })) return;
    const started = Date.now();
    try {
      const { shiftedWeeks } = await this.batchService.resetDemo();
      this.logger.log(
        `${BATCH_DEMO_RESET}: demo data restored, +${shiftedWeeks} weeks (${Date.now() - started} ms)`,
      );
    } catch (err) {
      this.logger.error(`${BATCH_DEMO_RESET} failed: ${errorReason(err)}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: BATCH_QUIZ_DEADLINES })
  public async closeExpiredQuizAttempts() {
    try {
      const count = await this.batchService.closeExpiredQuizAttempts();
      if (count) this.logger.log(`${BATCH_QUIZ_DEADLINES}: ${count} graded`);
    } catch (err) {
      this.logger.error(`${BATCH_QUIZ_DEADLINES} failed: ${errorReason(err)}`);
    }
  }
}
