import { Module } from '@nestjs/common';
import { SchoolEventResolver } from './school-event.resolver';
import { SchoolEventService } from './school-event.service';
import { SchoolResolver } from './school.resolver';
import { SchoolService } from './school.service';

@Module({
  providers: [
    SchoolResolver,
    SchoolService,
    SchoolEventResolver,
    SchoolEventService,
  ],
  exports: [SchoolService],
})
export class SchoolModule {}
