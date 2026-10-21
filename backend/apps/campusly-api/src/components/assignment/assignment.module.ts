import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AssignmentResolver } from './assignment.resolver';
import { AssignmentService } from './assignment.service';
import { SubmissionResolver } from './submission.resolver';
import { SubmissionService } from './submission.service';

@Module({
  imports: [AuthModule, MediaModule],
  providers: [
    AssignmentResolver,
    AssignmentService,
    SubmissionResolver,
    SubmissionService,
  ],
  exports: [AssignmentService, SubmissionService],
})
export class AssignmentModule {}
