import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnnouncementResolver } from './announcement.resolver';
import { AnnouncementService } from './announcement.service';

@Module({
  imports: [AuthModule],
  providers: [AnnouncementResolver, AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
