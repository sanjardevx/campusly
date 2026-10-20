import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { GroupResolver } from './group.resolver';
import { GroupService } from './group.service';

@Module({
  providers: [GroupResolver, GroupService, EnrollmentService],
  exports: [EnrollmentService],
})
export class GroupModule {}
