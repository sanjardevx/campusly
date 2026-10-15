import { Module } from '@nestjs/common';
import { CampuslyBatchService } from './campusly-batch.service';

@Module({
  imports: [],
  providers: [CampuslyBatchService],
})
export class CampuslyBatchModule {}
