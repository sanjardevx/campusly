import { NestFactory } from '@nestjs/core';
import { CampuslyBatchModule } from './campusly-batch.module';

// The worker opens no HTTP port: it only runs queue jobs (BullMQ) and cron
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CampuslyBatchModule);
  app.enableShutdownHooks();
}
void bootstrap();
