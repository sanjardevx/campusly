import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupModule } from '../group/group.module';
import { SchoolModule } from '../school/school.module';
import { CourseResolver } from './course.resolver';
import { CourseService } from './course.service';

@Module({
  imports: [AuthModule, GroupModule, SchoolModule],
  providers: [CourseResolver, CourseService],
})
export class CourseModule {}
