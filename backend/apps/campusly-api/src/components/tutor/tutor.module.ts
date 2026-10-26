import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { llmProviderFactory } from './llm/llm.factory';
import { TutorController } from './tutor.controller';
import { TutorLimitsService } from './tutor-limits.service';
import { TutorResolver } from './tutor.resolver';
import { TutorService } from './tutor.service';

// The index (TutorIndexService) is built by the batch app; the API only reads it
@Module({
  imports: [AuthModule],
  controllers: [TutorController],
  providers: [
    llmProviderFactory,
    TutorLimitsService,
    TutorService,
    TutorResolver,
  ],
})
export class TutorModule {}
