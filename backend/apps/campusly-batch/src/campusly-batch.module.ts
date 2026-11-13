import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageService } from '../../campusly-api/src/components/media/storage.service';
import { llmProviderFactory } from '../../campusly-api/src/components/tutor/llm/llm.factory';
import { TutorIndexService } from '../../campusly-api/src/components/tutor/tutor-index.service';
import { TutorLimitsService } from '../../campusly-api/src/components/tutor/tutor-limits.service';
import { DatabaseModule } from '../../campusly-api/src/database/database.module';
import { validateEnv } from '../../campusly-api/src/libs/config';
import { BatchCron } from './batch.cron';
import { CampuslyBatchService } from './campusly-batch.service';

// Shares the API's env rules, database, storage and tutor-index code (one codebase, no copies)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  providers: [
    BatchCron,
    CampuslyBatchService,
    StorageService,
    // AI tutor index: the same provider and spend counter as the API
    llmProviderFactory,
    TutorLimitsService,
    TutorIndexService,
  ],
})
export class CampuslyBatchModule {}
