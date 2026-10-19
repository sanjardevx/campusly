import { Module } from '@nestjs/common';
import { SchoolResolver } from './school.resolver';
import { SchoolService } from './school.service';

@Module({
  providers: [SchoolResolver, SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
