import { Query, Resolver } from '@nestjs/graphql';
import { TeacherDashboard } from '../../libs/dto/dashboard/teacher-dashboard';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { TeacherDashboardService } from './teacher-dashboard.service';

// Separate from DashboardResolver, which stays admin-only (school-wide numbers)
@Resolver()
export class TeacherDashboardResolver {
  constructor(
    private readonly teacherDashboardService: TeacherDashboardService,
  ) {}

  /** No arguments: the teacher comes from the token, the courses from AccessPolicy */
  @Roles(Role.TEACHER)
  @Query(() => TeacherDashboard)
  public teacherDashboard(
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherDashboard> {
    return this.teacherDashboardService.getTeacherDashboard(user);
  }
}
