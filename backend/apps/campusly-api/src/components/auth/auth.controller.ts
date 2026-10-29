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
import type { CookieOptions, Request, Response } from 'express';
import { Env, REFRESH_COOKIE } from '../../libs/config';
import { DemoLoginInput } from '../../libs/dto/auth/demo-login.input';
import { LoginInput } from '../../libs/dto/auth/login.input';
import { ResetPasswordInput } from '../../libs/dto/auth/reset-password.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthResult } from '../../libs/types/auth';
import { AuthService, ClientInfo, SignInResult } from './auth.service';
import { Public } from './decorators/auth.decorators';

// REST, not GraphQL: these endpoints read and write the httpOnly refresh cookie (DECISIONS §7).
// The controller only handles HTTP details (origin, cookie); the logic lives in AuthService.
// Public: these endpoints work with the cookie, not with an access token
@Public()
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
    const signIn = await this.authService.login(input, this.client(req));
    return this.respond(res, signIn);
  }

  /** Landing page "Demo login" (only with DEMO_MODE=true): the same cookie + token as a real login */
  @Post('demo')
  @HttpCode(200)
  public async demo(
    @Body() input: DemoLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    this.assertTrustedOrigin(req);
    const signIn = await this.authService.demoLogin(input, this.client(req));
    return this.respond(res, signIn);
  }

  /** Called by the frontend on page load and when the access token expires */
  @Post('refresh')
  @HttpCode(200)
  public async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    this.assertTrustedOrigin(req);
    const signIn = await this.authService.refresh(
      this.readCookie(req),
      this.client(req),
    );
    return this.respond(res, signIn);
  }

  @Post('logout')
  @HttpCode(204)
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    this.assertTrustedOrigin(req);
    await this.authService.logout(this.readCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  /** The new-password page opened from the Telegram bot's one-time link */
  @Post('reset-password')
  @HttpCode(204)
  public async resetPassword(
    @Body() input: ResetPasswordInput,
    @Req() req: Request,
  ): Promise<void> {
    this.assertTrustedOrigin(req);
    await this.authService.resetPassword(
      input.token,
      input.newPassword,
      this.client(req),
    );
  }

  // ───────────────────────── helpers ─────────────────────────

  private respond(res: Response, { result, refresh }: SignInResult) {
    // No new token in the grace case: the browser already has the cookie from the parallel request
    if (refresh) {
      res.cookie(REFRESH_COOKIE, refresh.token, {
        ...this.cookieOptions(),
        expires: refresh.expiresAt,
      });
    }
    return result;
  }

  /** httpOnly: JavaScript cannot read it (XSS). Path=/auth: sent only to these endpoints. No Domain: API host only. */
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/auth',
    };
  }

  private readCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }

  private client(req: Request): ClientInfo {
    return { ip: req.ip ?? '', userAgent: req.headers['user-agent'] };
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
