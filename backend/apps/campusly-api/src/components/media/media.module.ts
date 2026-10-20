import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaResolver } from './media.resolver';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

@Module({
  imports: [AuthModule],
  providers: [MediaResolver, MediaService, StorageService],
  exports: [MediaService, StorageService],
})
export class MediaModule {}
