import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AccessToken, User } from '../../libs/dto/user/user';
import { ChangePasswordInput } from '../../libs/dto/user/user.input';
import type { AuthUser } from '../../libs/types/auth';
import {
  AllowPasswordChange,
  CurrentUser,
} from '../auth/decorators/auth.decorators';
import { UserService } from './user.service';

// Thin resolver (Nestar style): guards and arguments here, logic in UserService.
// No @UseGuards needed: JwtAuthGuard and RolesGuard are global.
@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  /** Who am I? Works for every role, also while a new password is required */
  @AllowPasswordChange()
  @Query(() => User)
  public me(@CurrentUser() user: AuthUser): Promise<User> {
    return this.userService.getMe(user.id);
  }

  @AllowPasswordChange()
  @Mutation(() => AccessToken)
  public changePassword(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ChangePasswordInput,
  ): Promise<AccessToken> {
    return this.userService.changePassword(user, input);
  }
}
