import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CreateStudentResult,
  ImportPreview,
  ImportResult,
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
import {
  CurrentUser,
  NotForDemo,
  Roles,
} from '../auth/decorators/auth.decorators';
import { StudentImportService } from './student-import.service';
import { UserAdminService } from './user-admin.service';

// @Roles on the class: every operation here is admin-only, a new one cannot "forget" it.
// Every mutation is @NotForDemo: the public demo admin may look at users, not create or lock them.
@Roles(Role.ADMIN)
@Resolver()
export class UserAdminResolver {
  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly studentImportService: StudentImportService,
  ) {}

  /** Users page: Students / Teachers / Parents tabs with filters and paging */
  @Query(() => Users)
  public users(@Args('input') input: UsersInquiry): Promise<Users> {
    return this.userAdminService.getUsers(input);
  }

  @NotForDemo()
  @Mutation(() => CreateStudentResult)
  public createStudent(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateStudentInput,
  ): Promise<CreateStudentResult> {
    return this.userAdminService.createStudent(admin, input);
  }

  @NotForDemo()
  @Mutation(() => LoginSlip)
  public createTeacher(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateTeacherInput,
  ): Promise<LoginSlip> {
    return this.userAdminService.createTeacher(admin, input);
  }

  @NotForDemo()
  @Mutation(() => LoginSlip)
  public linkParent(
    @CurrentUser() admin: AuthUser,
    @Args('studentId', ParseUUIDPipe) studentId: string,
    @Args('input') input: ParentInput,
  ): Promise<LoginSlip> {
    return this.userAdminService.linkParent(admin, studentId, input);
  }

  /** New temporary password; the user is signed out everywhere */
  @NotForDemo()
  @Mutation(() => LoginSlip)
  public resetPassword(
    @CurrentUser() admin: AuthUser,
    @Args('userId', ParseUUIDPipe) userId: string,
  ): Promise<LoginSlip> {
    return this.userAdminService.resetPassword(admin, userId);
  }

  @NotForDemo()
  @Mutation(() => Boolean)
  public blockUser(
    @CurrentUser() admin: AuthUser,
    @Args('userId', ParseUUIDPipe) userId: string,
  ): Promise<boolean> {
    return this.userAdminService.blockUser(admin, userId);
  }

  @NotForDemo()
  @Mutation(() => Boolean)
  public unblockUser(
    @CurrentUser() admin: AuthUser,
    @Args('userId', ParseUUIDPipe) userId: string,
  ): Promise<boolean> {
    return this.userAdminService.unblockUser(admin, userId);
  }

  @NotForDemo()
  @Mutation(() => Boolean)
  public unlinkParent(
    @CurrentUser() admin: AuthUser,
    @Args('studentId', ParseUUIDPipe) studentId: string,
    @Args('parentId', ParseUUIDPipe) parentId: string,
  ): Promise<boolean> {
    return this.userAdminService.unlinkParent(admin, studentId, parentId);
  }

  /** "Check data" step: READY / LINK_PARENT / ERROR per row; writes nothing */
  @NotForDemo()
  @Mutation(() => ImportPreview)
  public previewStudentImport(
    @Args('csv') csv: string,
  ): Promise<ImportPreview> {
    return this.studentImportService.preview(csv);
  }

  /** "Import & login slips": all rows in one transaction; returns the slips to print */
  @NotForDemo()
  @Mutation(() => ImportResult)
  public importStudents(
    @CurrentUser() admin: AuthUser,
    @Args('csv') csv: string,
    @Args('skipErrors', { defaultValue: false }) skipErrors: boolean,
  ): Promise<ImportResult> {
    return this.studentImportService.import(admin, csv, skipErrors);
  }
}
