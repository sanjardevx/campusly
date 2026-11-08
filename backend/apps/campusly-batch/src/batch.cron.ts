import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DEMO_RESET_CRON,
  DEMO_RESET_TIMEZONE,
  type Env,
} from '../../campusly-api/src/libs/config';
import { TutorIndexService } from '../../campusly-api/src/components/tutor/tutor-index.service';
import { errorReason } from '../../campusly-api/src/libs/utils/error-reason';
import { CampuslyBatchService } from './campusly-batch.service';

export const BATCH_STALE_UPLOADS = 'BATCH_STALE_UPLOADS';
export const BATCH_DEMO_RESET = 'BATCH_DEMO_RESET';
export const BATCH_QUIZ_DEADLINES = 'BATCH_QUIZ_DEADLINES';
export const BATCH_TUTOR_INDEX = 'BATCH_TUTOR_INDEX';

// Same idea as Nestar's BatchController: the schedule here, the work in the service,
// and a failing job is logged instead of crashing the worker
@Injectable()
export class BatchCron implements OnApplicationBootstrap {
  private readonly logger = new Logger('BatchCron');
  /** The first full index can take longer than the interval: never two runs at once */
  private indexing = false;

  constructor(
    private readonly batchService: CampuslyBatchService,
    private readonly tutorIndex: TutorIndexService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Batch worker is ready');
    if (this.config.get('DEMO_MODE', { infer: true })) {
      this.logger.log(
        `${BATCH_DEMO_RESET}: on (${DEMO_RESET_CRON}, ${DEMO_RESET_TIMEZONE})`,
      );
    }
    if (this.tutorIndex.isEnabled) {
      this.logger.log(`${BATCH_TUTOR_INDEX}: on (every 10 minutes)`);
      // Right after a deploy, not 10 minutes later
      void this.syncTutorIndex();
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
      const { today } = await this.batchService.resetDemo();
      this.logger.log(
        `${BATCH_DEMO_RESET}: demo data restored up to ${today} (${Date.now() - started} ms)`,
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

  /** AI tutor: embed new or changed course material (TUTOR_PROVIDER=off → nothing to do) */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: BATCH_TUTOR_INDEX })
  public async syncTutorIndex() {
    if (!this.tutorIndex.isEnabled || this.indexing) return;
    this.indexing = true;
    try {
      const { indexed, removed } = await this.tutorIndex.sync();
      if (indexed || removed) {
        this.logger.log(
          `${BATCH_TUTOR_INDEX}: ${indexed} sources indexed, ${removed} removed`,
        );
      }
    } catch (err) {
      this.logger.error(`${BATCH_TUTOR_INDEX} failed: ${errorReason(err)}`);
    } finally {
      this.indexing = false;
    }
  }
}
