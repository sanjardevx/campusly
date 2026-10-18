import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '../../../libs/enums/common.enum';
import type { JwtPayload } from '../../../libs/types/auth';
import {
  ALLOW_PASSWORD_CHANGE,
  IS_PUBLIC,
} from '../decorators/auth.decorators';
import { getRequest } from './request.util';

/**
 * Global guard (APP_GUARD): every endpoint needs a valid access token unless it is @Public().
 * Nestar put @UseGuards(AuthGuard) on each resolver by hand; forgetting one left it open.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) {
      return true;
    }

    const request = getRequest(context);
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw this.unauthenticated();

    let payload: JwtPayload;
    try {
      // Checks the signature and the 15-minute expiry; no DB call
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw this.unauthenticated();
    }

    request.user = {
      id: payload.sub,
      role: payload.role,
      sessionId: payload.sid,
      mustChangePassword: payload.pwc === true,
    };

    // Temporary password limit reached: only "set a new password" related calls work
    if (
      payload.pwc &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE, targets)
    ) {
      throw new ForbiddenException({
        code: ErrorCode.PASSWORD_CHANGE_REQUIRED,
        message: 'Please set a new password first',
      });
    }
    return true;
  }

  private unauthenticated() {
    // The frontend refreshes the access token once and retries on this code
    return new UnauthorizedException({
      code: ErrorCode.UNAUTHENTICATED,
      message: 'Please sign in',
    });
  }
}
