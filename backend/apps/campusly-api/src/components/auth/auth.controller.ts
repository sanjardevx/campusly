import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Env, REFRESH_COOKIE } from '../../libs/config';
import { LoginInput } from '../../libs/dto/auth/login.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthResult } from '../../libs/types/auth';
import { AuthService } from './auth.service';

// REST, not GraphQL: these endpoints read and write the httpOnly refresh cookie (DECISIONS §7).
// The controller only handles HTTP details (origin, cookie); the logic lives in AuthService.
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('login')
  @HttpCode(200)
  public async login(
    @Body() input: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    this.assertTrustedOrigin(req);
    const { result, refreshToken, refreshExpiresAt } =
      await this.authService.login(input, {
        ip: req.ip ?? '',
        userAgent: req.headers['user-agent'],
      });
    this.setRefreshCookie(res, refreshToken, refreshExpiresAt);
    return result;
  }

  /** httpOnly: JavaScript cannot read it (XSS). Path=/auth: sent only to these endpoints. No Domain: API host only. */
  private setRefreshCookie(res: Response, token: string, expires: Date) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/auth',
      expires,
    });
  }

  /** CSRF guard for cookie endpoints: a browser request must come from our frontend (Postman sends no Origin) */
  private assertTrustedOrigin(req: Request) {
    const origin = req.headers.origin;
    if (origin && origin !== this.config.get('FRONTEND_URL', { infer: true })) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Untrusted origin',
      });
    }
  }
}
