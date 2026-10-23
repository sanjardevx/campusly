import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolModule } from '../school/school.module';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';
import { TeacherDashboardResolver } from './teacher-dashboard.resolver';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Module({
  imports: [AuthModule, SchoolModule],
  providers: [
    DashboardResolver,
    DashboardService,
    TeacherDashboardResolver,
    TeacherDashboardService,
  ],
  // The student calendar shows the same school dates
  exports: [DashboardService],
})
export class DashboardModule {}
