import { Module } from '@nestjs/common';
import { AnnouncementModule } from '../announcement/announcement.module';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { GradeModule } from '../grade/grade.module';
import { SchoolModule } from '../school/school.module';
import { OverviewResolver } from './overview.resolver';
import { OverviewService } from './overview.service';
import { StudentAttendanceService } from './student-attendance.service';
import { StudentGradesService } from './student-grades.service';

@Module({
  imports: [
    AuthModule,
    GradeModule,
    AnnouncementModule,
    SchoolModule,
    DashboardModule,
  ],
  providers: [
    OverviewResolver,
    OverviewService,
    StudentGradesService,
    StudentAttendanceService,
  ],
})
export class OverviewModule {}
