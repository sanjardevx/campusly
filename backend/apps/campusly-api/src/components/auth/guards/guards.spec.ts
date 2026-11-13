import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../../../libs/types/auth';
import {
  AllowPasswordChange,
  Public,
  Roles,
} from '../decorators/auth.decorators';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthRequest } from './request.util';
import { RolesGuard } from './roles.guard';

// A fake controller: the decorators put metadata on its methods, like on real resolvers.
// `this: void`: the methods are passed around as plain functions (handler references).
class TestController {
  @Public() open(this: void) {}
  closed(this: void) {}
  @AllowPasswordChange() me(this: void) {}
  @Roles('TEACHER', 'ADMIN') teachersOnly(this: void) {}
}
const controller = new TestController();

function fakeContext(handler: () => void, authorization?: string) {
  const request = { headers: { authorization } } as unknown as AuthRequest;
  const context = {
    getType: () => 'http',
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

/** The `{ code }` body of the HttpException a guard threw */
async function errorCode(run: () => Promise<boolean> | boolean) {
  try {
    await run();
  } catch (err) {
    return ((err as HttpException).getResponse() as { code: string }).code;
  }
  return 'NO_ERROR';
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret-that-is-long-enough-123' });
  const guard = new JwtAuthGuard(new Reflector(), jwt);
  const bearer = (payload: JwtPayload, expiresIn: number | string = '15m') =>
    `Bearer ${jwt.sign(payload, { expiresIn: expiresIn as number })}`;

  it('lets @Public() endpoints through without a token', async () => {
    const { context } = fakeContext(controller.open);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a missing, forged or expired token with UNAUTHENTICATED', async () => {
    const forged = `Bearer ${new JwtService({ secret: 'another-secret-xxxxxxxxxxxxxxxxxx' }).sign({ sub: 'u1', role: 'ADMIN', sid: 's1' })}`;
    const expired = bearer({ sub: 'u1', role: 'STUDENT', sid: 's1' }, -10);

    for (const header of [undefined, 'Bearer', 'Basic abc', forged, expired]) {
      const { context } = fakeContext(controller.closed, header);
      expect(await errorCode(() => guard.canActivate(context))).toBe(
        'UNAUTHENTICATED',
      );
    }
  });

  it('puts the user on req.user, not on req.body', async () => {
    const { context, request } = fakeContext(
      controller.closed,
      bearer({ sub: 'u1', role: 'STUDENT', sid: 's1' }),
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'u1',
      role: 'STUDENT',
      sessionId: 's1',
      mustChangePassword: false,
      isDemo: false,
    });
  });

  it('with a pending password change allows only @AllowPasswordChange() endpoints', async () => {
    const token = bearer({ sub: 'u1', role: 'STUDENT', sid: 's1', pwc: true });

    const closed = fakeContext(controller.closed, token);
    expect(await errorCode(() => guard.canActivate(closed.context))).toBe(
      'PASSWORD_CHANGE_REQUIRED',
    );

    const me = fakeContext(controller.me, token);
    await expect(guard.canActivate(me.context)).resolves.toBe(true);
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const withUser = (handler: () => void, role: JwtPayload['role']) => {
    const { context, request } = fakeContext(handler);
    request.user = {
      id: 'u1',
      role,
      sessionId: 's1',
      mustChangePassword: false,
      isDemo: false,
    };
    return context;
  };

  it('allows any signed-in role when the endpoint has no @Roles()', () => {
    expect(guard.canActivate(withUser(controller.closed, 'PARENT'))).toBe(true);
  });

  it('allows listed roles and rejects others with FORBIDDEN', async () => {
    expect(
      guard.canActivate(withUser(controller.teachersOnly, 'TEACHER')),
    ).toBe(true);
    expect(
      await errorCode(() =>
        guard.canActivate(withUser(controller.teachersOnly, 'STUDENT')),
      ),
    ).toBe('FORBIDDEN');
  });
});
