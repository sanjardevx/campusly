import { Module } from '@nestjs/common';
import { AnnouncementModule } from './announcement/announcement.module';
import { AssignmentModule } from './assignment/assignment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GradeModule } from './grade/grade.module';
import { GroupModule } from './group/group.module';
import { MediaModule } from './media/media.module';
import { OverviewModule } from './overview/overview.module';
import { ProgressModule } from './progress/progress.module';
import { QuestionModule } from './question/question.module';
import { SchoolModule } from './school/school.module';
import { SiteModule } from './site/site.module';
import { TelegramModule } from './telegram/telegram.module';
import { TutorModule } from './tutor/tutor.module';
import { UserModule } from './user/user.module';

// Every feature module is registered here (same as Nestar's ComponentsModule)
@Module({
  imports: [
    AnnouncementModule,
    AssignmentModule,
    AttendanceModule,
    AuditModule,
    AuthModule,
    CourseModule,
    DashboardModule,
    GradeModule,
    GroupModule,
    MediaModule,
    OverviewModule,
    ProgressModule,
    QuestionModule,
    SchoolModule,
    SiteModule,
    TelegramModule,
    TutorModule,
    UserModule,
  ],
})
export class ComponentsModule {}
