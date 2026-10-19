import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CreateStudentResult,
  LoginSlip,
  Users,
} from '../../libs/dto/user/user';
import {
  CreateStudentInput,
  CreateTeacherInput,
  ParentInput,
  UsersInquiry,
} from '../../libs/dto/user/user.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { UserAdminService } from './user-admin.service';

// @Roles on the class: every operation here is admin-only, a new one cannot "forget" it
@Roles(Role.ADMIN)
@Resolver()
export class UserAdminResolver {
  constructor(private readonly userAdminService: UserAdminService) {}

  /** Users page: Students / Teachers / Parents tabs with filters and paging */
  @Query(() => Users)
  public users(@Args('input') input: UsersInquiry): Promise<Users> {
    return this.userAdminService.getUsers(input);
  }

  @Mutation(() => CreateStudentResult)
  public createStudent(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateStudentInput,
  ): Promise<CreateStudentResult> {
    return this.userAdminService.createStudent(admin, input);
  }

  @Mutation(() => LoginSlip)
  public createTeacher(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateTeacherInput,
  ): Promise<LoginSlip> {
    return this.userAdminService.createTeacher(admin, input);
  }

  @Mutation(() => LoginSlip)
  public linkParent(
    @CurrentUser() admin: AuthUser,
    @Args('studentId', ParseUUIDPipe) studentId: string,
    @Args('input') input: ParentInput,
  ): Promise<LoginSlip> {
    return this.userAdminService.linkParent(admin, studentId, input);
  }

  @Mutation(() => Boolean)
  public unlinkParent(
    @CurrentUser() admin: AuthUser,
    @Args('studentId', ParseUUIDPipe) studentId: string,
    @Args('parentId', ParseUUIDPipe) parentId: string,
  ): Promise<boolean> {
    return this.userAdminService.unlinkParent(admin, studentId, parentId);
  }
}
