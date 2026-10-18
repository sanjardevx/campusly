import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { ErrorCode } from '../../libs/enums/common.enum';
import { AccessToken, User } from '../../libs/dto/user/user';
import { ChangePasswordInput } from '../../libs/dto/user/user.input';
import type { AuthUser } from '../../libs/types/auth';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** The id comes from the access token, never from the client, so nobody can ask for another user */
  public async getMe(userId: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }
    return user;
  }

  /**
   * Sets a permanent password: clears the temporary-password state, keeps this session,
   * and signs every other device out (DECISIONS §7).
   */
  public async changePassword(
    authUser: AuthUser,
    input: ChangePasswordInput,
  ): Promise<AccessToken> {
    const user = await this.prismaService.user.findUnique({
      where: { id: authUser.id },
      select: { passwordHash: true, role: true },
    });
    if (
      !user ||
      !(await bcrypt.compare(input.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Current password is wrong',
      });
    }
    if (input.newPassword === input.currentPassword) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'The new password must be different',
      });
    }

    await this.prismaService.user.update({
      where: { id: authUser.id },
      data: {
        passwordHash: await bcrypt.hash(input.newPassword, 10),
        tempPasswordUsesLeft: null,
        tempPasswordExpiresAt: null,
        mustChangePassword: false,
      },
    });
    await this.authService.revokeOtherSessions(authUser.id, authUser.sessionId);

    // The old access token may carry `pwc`; give one without it so the user can continue
    return {
      accessToken: await this.authService.signAccessToken({
        userId: authUser.id,
        role: user.role,
        sessionId: authUser.sessionId,
        mustChangePassword: false,
      }),
    };
  }
}
