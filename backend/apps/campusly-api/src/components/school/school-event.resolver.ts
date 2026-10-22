import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SchoolEvent } from '../../libs/dto/school/school-event';
import {
  CreateSchoolEventInput,
  UpdateSchoolEventInput,
} from '../../libs/dto/school/school-event.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { SchoolEventService } from './school-event.service';

// The school calendar: admins only (it is read through dashboardCalendar)
@Roles(Role.ADMIN)
@Resolver()
export class SchoolEventResolver {
  constructor(private readonly schoolEventService: SchoolEventService) {}

  @Mutation(() => SchoolEvent)
  public createSchoolEvent(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateSchoolEventInput,
  ): Promise<SchoolEvent> {
    return this.schoolEventService.create(admin, input);
  }

  @Mutation(() => SchoolEvent)
  public updateSchoolEvent(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: UpdateSchoolEventInput,
  ): Promise<SchoolEvent> {
    return this.schoolEventService.update(admin, input);
  }

  @Mutation(() => SchoolEvent)
  public archiveSchoolEvent(
    @CurrentUser() admin: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<SchoolEvent> {
    return this.schoolEventService.archive(admin, id);
  }
}
