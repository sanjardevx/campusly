import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import {
  DEMO_LIMIT,
  Env,
  LOGIN_LIMIT,
  REFRESH_GRACE_SEC,
  REFRESH_TTL_DAYS,
} from '../../libs/config';
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

/** JSON for the client + (optionally) a new refresh token for the controller to put in the cookie */
export interface SignInResult {
  result: AuthResult;
  refresh?: { token: string; expiresAt: Date };
}

/** The user fields needed to build the auth response */
interface SessionUser {
  id: string;
  loginId: string;
  role: Role;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  isDemo: boolean;
  tempPasswordUsesLeft: number | null;
  tempPasswordExpiresAt: Date | null;
}

/** Another request rotated the same token a moment earlier (two tabs) */
class LostRotationRace extends Error {}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ─────────────────────────── login ───────────────────────────

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

    if (user.status !== 'ACTIVE') throw this.accountBlocked();

    const temp = await this.applyTempPasswordRule(user);
    const sessionId = uuidv7(); // a new sign-in starts a new token family = session
    const refresh = await this.createRefreshToken(
      this.prismaService,
      user.id,
      user.role,
      sessionId,
      client,
    );

    return {
      result: await this.buildResult(
        { ...user, ...temp.user },
        sessionId,
        temp.warning,
      ),
      refresh,
    };
  }

  // ──────────────────────── demo login ────────────────────────

  /**
   * "Demo login" on the landing page (DECISIONS §12): signs in as the seeded demo account of that
   * role, no password. Off unless DEMO_MODE=true (then it "does not exist": 404). Limited per IP.
   */
  public async demoLogin(
    role: Role,
    client: ClientInfo,
  ): Promise<SignInResult> {
    if (!this.config.get('DEMO_MODE', { infer: true })) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Demo is off',
      });
    }
    const key = `demo:ip:${client.ip}`;
    // The window starts at the first demo sign-in from this IP
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, DEMO_LIMIT.windowSec);
    if (count > DEMO_LIMIT.perIp) {
      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many demo sign-ins. Try again in 15 minutes.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prismaService.user.findFirst({
      where: { role, isDemo: true, status: 'ACTIVE' },
      orderBy: { loginId: 'asc' },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No demo account for this role',
      });
    }
    const sessionId = uuidv7();
    const refresh = await this.createRefreshToken(
      this.prismaService,
      user.id,
      user.role,
      sessionId,
      client,
    );
    // No temporary-password banner or forced change in the demo
    const demo = {
      ...user,
      mustChangePassword: false,
      tempPasswordUsesLeft: null,
      tempPasswordExpiresAt: null,
    };
    return { result: await this.buildResult(demo, sessionId), refresh };
  }

  // ────────────────────────── refresh ──────────────────────────

  /**
   * Rotation: every refresh revokes the old token and issues a new one in the same family.
   * A revoked token used again (after the grace window) means it was stolen → revoke the whole family.
   */
  public async refresh(
    rawToken: string | undefined,
    client: ClientInfo,
  ): Promise<SignInResult> {
    if (!rawToken) throw this.notSignedIn();

    const token = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: {
        user: {
          omit: { tempPasswordUsesLeft: false, tempPasswordExpiresAt: false },
        },
      },
    });
    if (!token || token.expiresAt <= new Date()) throw this.notSignedIn();

    if (token.revokedAt) {
      const ageMs = Date.now() - token.revokedAt.getTime();
      if (token.replacedBy && ageMs < REFRESH_GRACE_SEC * 1000) {
        // Second tab, same moment: give an access token, keep the cookie the first tab received
        return { result: await this.buildResult(token.user, token.familyId) };
      }
      await this.revokeFamily(token.familyId);
      this.logger.warn(
        `Refresh token reuse: family ${token.familyId} of user ${token.userId} revoked`,
      );
      throw this.notSignedIn();
    }

    // Checked on every refresh, so a blocked user is out within 15 minutes
    if (token.user.status !== 'ACTIVE') {
      await this.revokeFamily(token.familyId);
      throw this.accountBlocked();
    }

    try {
      const refresh = await this.prismaService.$transaction(async (tx) => {
        const next = await this.createRefreshToken(
          tx,
          token.userId,
          token.user.role,
          token.familyId,
          client,
        );
        // Conditional update: only one of two parallel requests can revoke the old token
        const { count } = await tx.refreshToken.updateMany({
          where: { id: token.id, revokedAt: null },
          data: { revokedAt: new Date(), replacedBy: next.id },
        });
        if (count === 0) throw new LostRotationRace(); // rolls back the new token
        return { token: next.token, expiresAt: next.expiresAt };
      });
      return {
        result: await this.buildResult(token.user, token.familyId),
        refresh,
      };
    } catch (err) {
      if (err instanceof LostRotationRace) {
        return { result: await this.buildResult(token.user, token.familyId) };
      }
      throw err;
    }
  }

  // ────────────────────────── logout ──────────────────────────

  /** Signs out this device: its token family is revoked (other devices stay signed in) */
  public async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const token = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      select: { familyId: true },
    });
    if (token) await this.revokeFamily(token.familyId);
  }

  /** After a password change: every session except the current one has to sign in again */
  /** Password reset and blocking: the user is signed out on every device */
  public async revokeAllSessions(
    userId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prismaService,
  ) {
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** After a reset the login ID may be rate-limited from earlier failures: unlock it */
  public async clearLoginFailures(loginId: string) {
    await this.redisService.del(this.failKey('id', loginId));
  }

  public async revokeOtherSessions(userId: string, sessionId: string) {
    await this.prismaService.refreshToken.updateMany({
      where: { userId, familyId: { not: sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─────────────────────────── tokens ───────────────────────────

  private async buildResult(
    user: SessionUser,
    sessionId: string,
    warning?: AuthResult['tempPasswordWarning'],
  ): Promise<AuthResult> {
    // On refresh the warning is rebuilt from the user row (no sign-in is used up)
    const tempPasswordWarning =
      warning ??
      (!user.mustChangePassword &&
      user.tempPasswordUsesLeft !== null &&
      user.tempPasswordExpiresAt
        ? {
            usesLeft: user.tempPasswordUsesLeft,
            expiresAt: user.tempPasswordExpiresAt.toISOString(),
          }
        : undefined);

    return {
      accessToken: await this.signAccessToken({
        userId: user.id,
        role: user.role,
        sessionId,
        mustChangePassword: user.mustChangePassword,
        isDemo: user.isDemo,
      }),
      user: {
        id: user.id,
        loginId: user.loginId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        mustChangePassword: user.mustChangePassword,
        className: await this.currentClass(user),
      },
      ...(tempPasswordWarning && { tempPasswordWarning }),
    };
  }

  /** "Grade 9A · ID …" in the top bar: the class a student is in now */
  private async currentClass(user: SessionUser): Promise<string | null> {
    if (user.role !== 'STUDENT') return null;
    const membership = await this.prismaService.groupMember.findFirst({
      where: { studentId: user.id, leftAt: null },
      select: { group: { select: { name: true } } },
    });
    return membership?.group.name ?? null;
  }

  /** Also used after a password change, to replace a token that still has the `pwc` flag */
  public signAccessToken(session: {
    userId: string;
    role: Role;
    sessionId: string;
    mustChangePassword: boolean;
    isDemo?: boolean;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: session.userId,
      role: session.role,
      sid: session.sessionId,
      ...(session.mustChangePassword && { pwc: true as const }),
      ...(session.isDemo && { demo: true as const }),
    };
    return this.jwtService.signAsync(payload);
  }

  /** Random 32-byte token for the cookie; only its sha256 hash is stored (a DB leak gives no usable tokens) */
  private async createRefreshToken(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    role: Role,
    familyId: string,
    client: ClientInfo,
  ) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + REFRESH_TTL_DAYS[role] * 24 * 60 * 60 * 1000,
    );
    const row = await db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(token),
        expiresAt,
        ip: client.ip,
        userAgent: client.userAgent?.slice(0, 255),
      },
      select: { id: true },
    });
    return { id: row.id, token, expiresAt };
  }

  private async revokeFamily(familyId: string) {
    await this.prismaService.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private notSignedIn() {
    return new UnauthorizedException({
      code: ErrorCode.UNAUTHENTICATED,
      message: 'Please sign in again',
    });
  }

  private accountBlocked() {
    return new ForbiddenException({
      code: ErrorCode.ACCOUNT_BLOCKED,
      message: 'This account is blocked. Please contact the school.',
    });
  }

  // ───────────────────── temporary password ─────────────────────

  /**
   * DECISIONS §6: a temporary password works for 3 sign-ins or 14 days. Each sign-in uses one;
   * after the limit only "Set a new password" is allowed (mustChangePassword).
   */
  private async applyTempPasswordRule(user: SessionUser): Promise<{
    user: Pick<SessionUser, 'mustChangePassword' | 'tempPasswordUsesLeft'>;
    warning?: AuthResult['tempPasswordWarning'];
  }> {
    const unchanged = {
      mustChangePassword: user.mustChangePassword,
      tempPasswordUsesLeft: user.tempPasswordUsesLeft,
    };
    if (user.mustChangePassword || user.tempPasswordUsesLeft === null) {
      return { user: unchanged };
    }

    const isExpired =
      !user.tempPasswordExpiresAt || user.tempPasswordExpiresAt <= new Date();
    if (isExpired || user.tempPasswordUsesLeft <= 0) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { mustChangePassword: true },
      });
      return { user: { ...unchanged, mustChangePassword: true } };
    }

    const updated = await this.prismaService.user.update({
      where: { id: user.id },
      data: { tempPasswordUsesLeft: { decrement: 1 } },
      select: { tempPasswordUsesLeft: true },
    });
    const usesLeft = updated.tempPasswordUsesLeft ?? 0;
    return {
      user: { ...unchanged, tempPasswordUsesLeft: usesLeft },
      warning: {
        usesLeft,
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
