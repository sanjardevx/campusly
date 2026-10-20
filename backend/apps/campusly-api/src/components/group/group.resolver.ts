import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Group } from '../../libs/dto/group/group';
import {
  CreateGroupInput,
  MoveStudentInput,
  UpdateGroupInput,
} from '../../libs/dto/group/group.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { GroupService } from './group.service';

// Classes are managed by the admin only; teachers and students see them through their courses
@Roles(Role.ADMIN)
@Resolver()
export class GroupResolver {
  constructor(private readonly groupService: GroupService) {}

  /** Default: the current academic year */
  @Query(() => [Group])
  public groups(
    @Args(
      'academicYearId',
      { nullable: true },
      new ParseUUIDPipe({ optional: true }),
    )
    academicYearId?: string,
  ): Promise<Group[]> {
    return this.groupService.getGroups(academicYearId);
  }

  @Mutation(() => Group)
  public createGroup(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateGroupInput,
  ): Promise<Group> {
    return this.groupService.createGroup(admin, input);
  }

  @Mutation(() => Group)
  public updateGroup(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: UpdateGroupInput,
  ): Promise<Group> {
    return this.groupService.updateGroup(admin, input);
  }

  /** Returns the new class (with its new student count) */
  @Mutation(() => Group)
  public moveStudent(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: MoveStudentInput,
  ): Promise<Group> {
    return this.groupService.moveStudent(admin, input);
  }
}
