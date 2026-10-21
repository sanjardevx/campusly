import { Module } from '@nestjs/common';
import { AnnouncementModule } from '../announcement/announcement.module';
import { AuthModule } from '../auth/auth.module';
import { GradeModule } from '../grade/grade.module';
import { SchoolModule } from '../school/school.module';
import { OverviewResolver } from './overview.resolver';
import { OverviewService } from './overview.service';

@Module({
  imports: [AuthModule, GradeModule, AnnouncementModule, SchoolModule],
  providers: [OverviewResolver, OverviewService],
})
export class OverviewModule {}
