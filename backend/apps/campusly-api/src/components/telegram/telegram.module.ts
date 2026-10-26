import { Module } from '@nestjs/common';
import { TelegramClient } from './telegram.client';
import { TelegramController } from './telegram.controller';
import { TelegramResolver } from './telegram.resolver';
import { TelegramService } from './telegram.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramClient, TelegramService, TelegramResolver],
})
export class TelegramModule {}
