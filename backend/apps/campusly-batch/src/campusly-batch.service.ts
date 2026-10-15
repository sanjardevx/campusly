import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class CampuslyBatchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CampuslyBatchService.name);

  onApplicationBootstrap() {
    this.logger.log('Batch worker is ready');
  }
}
