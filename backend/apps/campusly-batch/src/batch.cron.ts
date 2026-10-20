import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { errorReason } from '../../campusly-api/src/libs/utils/error-reason';
import { CampuslyBatchService } from './campusly-batch.service';

export const BATCH_STALE_UPLOADS = 'BATCH_STALE_UPLOADS';

// Same idea as Nestar's BatchController: the schedule here, the work in the service,
// and a failing job is logged instead of crashing the worker
@Injectable()
export class BatchCron implements OnApplicationBootstrap {
  private readonly logger = new Logger('BatchCron');

  constructor(private readonly batchService: CampuslyBatchService) {}

  onApplicationBootstrap() {
    this.logger.log('Batch worker is ready');
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
}
