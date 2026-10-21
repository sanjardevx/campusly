import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolModule } from '../school/school.module';
import { GradeResolver } from './grade.resolver';
import { GradeService } from './grade.service';
import { PeriodGradeResolver } from './period-grade.resolver';
import { PeriodGradeService } from './period-grade.service';

@Module({
  imports: [AuthModule, SchoolModule],
  providers: [
    GradeResolver,
    GradeService,
    PeriodGradeResolver,
    PeriodGradeService,
  ],
  exports: [GradeService, PeriodGradeService],
})
export class GradeModule {}
