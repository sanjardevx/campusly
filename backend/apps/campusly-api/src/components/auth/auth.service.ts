import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { LOGIN_LIMIT, REFRESH_TTL_DAYS } from '../../libs/config';
import { LoginInput } from '../../libs/dto/auth/login.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import { Role } from '../../libs/enums/user.enum';
import type { AuthResult, JwtPayload } from '../../libs/types/auth';

/** Compared against when the login ID does not exist, so both cases take the same time */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 10);

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/** Who is signing in (stored with the refresh token: "your sessions" list later) */
export interface ClientInfo {
  ip: string;
  userAgent?: string;
}

/** login() result: JSON for the client + the refresh token the controller puts in a cookie */
export interface SignInResult {
  result: AuthResult;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  public async login(
    input: LoginInput,
    client: ClientInfo,
  ): Promise<SignInResult> {
    await this.assertNotRateLimited(input.loginId, client.ip);

    // Global omit hides these fields; login is the one place that needs them
    const user = await this.prismaService.user.findUnique({
      where: { loginId: input.loginId },
      omit: {
        passwordHash: false,
        tempPasswordUsesLeft: false,
        tempPasswordExpiresAt: false,
      },
    });

    const isMatch = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !isMatch) {
      await this.recordFailure(input.loginId, client.ip);
      // Same answer for "no such ID" and "wrong password" (Nestar told which one was wrong)
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Wrong login ID or password',
      });
    }
    await this.redisService.del(this.failKey('id', input.loginId));

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: ErrorCode.ACCOUNT_BLOCKED,
        message: 'This account is blocked. Please contact the school.',
      });
    }

    const temp = await this.applyTempPasswordRule(user);
    const { refreshToken, expiresAt } = await this.createRefreshToken(
      user.id,
      user.role,
      uuidv7(),
      client,
    );

    return {
      result: {
        accessToken: await this.signAccessToken(
          user.id,
          user.role,
          temp.mustChangePassword,
        ),
        user: {
          id: user.id,
          loginId: user.loginId,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          mustChangePassword: temp.mustChangePassword,
        },
        ...(temp.warning && { tempPasswordWarning: temp.warning }),
      },
      refreshToken,
      refreshExpiresAt: expiresAt,
    };
  }

  // ─────────────────────────── tokens ───────────────────────────

  private signAccessToken(
    userId: string,
    role: Role,
    mustChangePassword: boolean,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      role,
      ...(mustChangePassword && { pwc: true as const }),
    };
    return this.jwtService.signAsync(payload);
  }

  /** Random 32-byte token for the cookie; only its sha256 hash is stored (a DB leak gives no usable tokens) */
  private async createRefreshToken(
    userId: string,
    role: Role,
    familyId: string,
    client: ClientInfo,
  ) {
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + REFRESH_TTL_DAYS[role] * 24 * 60 * 60 * 1000,
    );
    await this.prismaService.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt,
        ip: client.ip,
        userAgent: client.userAgent?.slice(0, 255),
      },
    });
    return { refreshToken, expiresAt };
  }

  // ───────────────────── temporary password ─────────────────────

  /**
   * DECISIONS §6: a temporary password works for 3 sign-ins or 14 days. Each sign-in uses one;
   * after the limit only "Set a new password" is allowed (mustChangePassword).
   */
  private async applyTempPasswordRule(user: {
    id: string;
    mustChangePassword: boolean;
    tempPasswordUsesLeft: number | null;
    tempPasswordExpiresAt: Date | null;
  }): Promise<{
    mustChangePassword: boolean;
    warning?: AuthResult['tempPasswordWarning'];
  }> {
    if (user.mustChangePassword) return { mustChangePassword: true };
    if (user.tempPasswordUsesLeft === null)
      return { mustChangePassword: false };

    const isExpired =
      !user.tempPasswordExpiresAt || user.tempPasswordExpiresAt <= new Date();
    if (isExpired || user.tempPasswordUsesLeft <= 0) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { mustChangePassword: true },
      });
      return { mustChangePassword: true };
    }

    const updated = await this.prismaService.user.update({
      where: { id: user.id },
      data: { tempPasswordUsesLeft: { decrement: 1 } },
      select: { tempPasswordUsesLeft: true, tempPasswordExpiresAt: true },
    });
    return {
      mustChangePassword: false,
      warning: {
        usesLeft: updated.tempPasswordUsesLeft ?? 0,
        expiresAt: user.tempPasswordExpiresAt!.toISOString(),
      },
    };
  }

  // ───────────────────────── rate limit ─────────────────────────

  private failKey(kind: 'id' | 'ip', value: string) {
    return `login:fail:${kind}:${value}`;
  }

  /** 5 failed attempts per login ID and 30 per IP in 15 minutes (DECISIONS §6) */
  private async assertNotRateLimited(loginId: string, ip: string) {
    const [byId, byIp] = await this.redisService.mget(
      this.failKey('id', loginId),
      this.failKey('ip', ip),
    );
    if (
      Number(byId ?? 0) >= LOGIN_LIMIT.perLoginId ||
      Number(byIp ?? 0) >= LOGIN_LIMIT.perIp
    ) {
      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many attempts. Try again in 15 minutes.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordFailure(loginId: string, ip: string) {
    const window = LOGIN_LIMIT.windowSec;
    // INCR + EXPIRE NX: the 15-minute window starts at the first failure
    await this.redisService
      .multi()
      .incr(this.failKey('id', loginId))
      .expire(this.failKey('id', loginId), window, 'NX')
      .incr(this.failKey('ip', ip))
      .expire(this.failKey('ip', ip), window, 'NX')
      .exec();
  }
}
