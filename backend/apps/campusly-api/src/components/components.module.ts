import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { GroupModule } from './group/group.module';
import { MediaModule } from './media/media.module';
import { ProgressModule } from './progress/progress.module';
import { SchoolModule } from './school/school.module';
import { UserModule } from './user/user.module';

// Every feature module is registered here (same as Nestar's ComponentsModule)
@Module({
  imports: [
    AuditModule,
    AuthModule,
    CourseModule,
    GroupModule,
    MediaModule,
    ProgressModule,
    SchoolModule,
    UserModule,
  ],
})
export class ComponentsModule {}
