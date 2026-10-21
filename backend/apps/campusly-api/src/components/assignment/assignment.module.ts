import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssignmentResolver } from './assignment.resolver';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [AuthModule],
  providers: [AssignmentResolver, AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
