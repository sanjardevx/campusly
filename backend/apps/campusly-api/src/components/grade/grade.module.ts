import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolModule } from '../school/school.module';
import { GradeResolver } from './grade.resolver';
import { GradeService } from './grade.service';

@Module({
  imports: [AuthModule, SchoolModule],
  providers: [GradeResolver, GradeService],
  exports: [GradeService],
})
export class GradeModule {}
