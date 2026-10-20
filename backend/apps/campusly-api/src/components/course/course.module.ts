import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupModule } from '../group/group.module';
import { SchoolModule } from '../school/school.module';
import { ContentResolver } from './content.resolver';
import { ContentService } from './content.service';
import { CourseResolver } from './course.resolver';
import { CourseService } from './course.service';

@Module({
  imports: [AuthModule, GroupModule, SchoolModule],
  providers: [CourseResolver, CourseService, ContentResolver, ContentService],
})
export class CourseModule {}
