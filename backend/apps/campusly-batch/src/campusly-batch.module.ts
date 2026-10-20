import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageService } from '../../campusly-api/src/components/media/storage.service';
import { DatabaseModule } from '../../campusly-api/src/database/database.module';
import { validateEnv } from '../../campusly-api/src/libs/config';
import { BatchCron } from './batch.cron';
import { CampuslyBatchService } from './campusly-batch.service';

// Shares the API's env rules, database and storage code (like Nestar's batch imported the API schemas)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  providers: [BatchCron, CampuslyBatchService, StorageService],
})
export class CampuslyBatchModule {}
