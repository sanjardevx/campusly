import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  AdminDashboard,
  AttendanceOverview,
  CalendarEvent,
} from '../../libs/dto/dashboard/dashboard';
import { AttendanceRange } from '../../libs/enums/dashboard.enum';
import { Role } from '../../libs/enums/user.enum';
import { Roles } from '../auth/decorators/auth.decorators';
import { DashboardService } from './dashboard.service';

// School-wide numbers: admins only (teachers get their own dashboard on day 11)
@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(Role.ADMIN)
  @Query(() => AdminDashboard)
  public adminDashboard(): Promise<AdminDashboard> {
    return this.dashboardService.getAdminDashboard();
  }

  /** The donut: its own query, so switching Today / Week / Month reloads only that card */
  @Roles(Role.ADMIN)
  @Query(() => AttendanceOverview)
  public attendanceOverview(
    @Args('range', { type: () => AttendanceRange }) range: AttendanceRange,
  ): Promise<AttendanceOverview> {
    return this.dashboardService.getAttendanceOverview(range);
  }

  /** month: "YYYY-MM" */
  @Roles(Role.ADMIN)
  @Query(() => [CalendarEvent])
  public dashboardCalendar(
    @Args('month') month: string,
  ): Promise<CalendarEvent[]> {
    return this.dashboardService.getCalendar(month);
  }
}
