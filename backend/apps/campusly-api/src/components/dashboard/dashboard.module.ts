import { Module } from '@nestjs/common';
import { SchoolModule } from '../school/school.module';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [SchoolModule],
  providers: [DashboardResolver, DashboardService],
})
export class DashboardModule {}
