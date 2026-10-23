import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CalendarEvent } from '../../libs/dto/dashboard/dashboard';
import { Child, StudentOverview } from '../../libs/dto/overview/overview';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { OverviewService } from './overview.service';

@Resolver()
export class OverviewResolver {
  constructor(private readonly overviewService: OverviewService) {}

  /** Student: own. Parent: a child (required with 2+ children). Admin: any student. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => StudentOverview)
  public studentOverview(
    @CurrentUser() user: AuthUser,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<StudentOverview> {
    return this.overviewService.getStudentOverview(user, studentId);
  }

  /** month: "YYYY-MM". Same student rule as studentOverview. */
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN)
  @Query(() => [CalendarEvent])
  public studentCalendar(
    @CurrentUser() user: AuthUser,
    @Args('month') month: string,
    @Args(
      'studentId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    studentId?: string,
  ): Promise<CalendarEvent[]> {
    return this.overviewService.getStudentCalendar(user, month, studentId);
  }

  @Roles(Role.PARENT)
  @Query(() => [Child])
  public myChildren(@CurrentUser() user: AuthUser): Promise<Child[]> {
    return this.overviewService.getMyChildren(user);
  }
}
