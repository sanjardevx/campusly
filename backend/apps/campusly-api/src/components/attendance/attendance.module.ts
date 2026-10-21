import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolModule } from '../school/school.module';
import { AttendanceResolver } from './attendance.resolver';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [AuthModule, SchoolModule],
  providers: [AttendanceResolver, AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
