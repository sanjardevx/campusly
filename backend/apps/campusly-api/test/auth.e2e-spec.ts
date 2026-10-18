import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { REFRESH_COOKIE } from '../src/libs/config';

// Needs Docker Postgres + Redis. The test creates its own users (prefix "e2e-") and removes them
// afterwards, so it does not depend on the seed and works on the empty CI database.
const PASSWORD = 'E2e-Password-123';
const ID = {
  student: 'e2e-student',
  rateLimited: 'e2e-rate-limited',
  blocked: 'e2e-blocked',
  temp: 'e2e-temp',
} as const;

type Res = request.Response;

/** Value of our refresh cookie in a Set-Cookie header (undefined when not set) */
function refreshCookie(res: Res): string | undefined {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = header?.find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
  return cookie?.split(';')[0].split('=')[1] || undefined;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;

  const login = (loginId: string, password = PASSWORD) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ loginId, password });
  const refresh = (token: string) =>
    request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE}=${token}`);
  const graphql = (query: string, accessToken: string, variables = {}) =>
    request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query, variables });

  async function cleanUp() {
    const users = { loginId: { startsWith: 'e2e-' } };
    await prisma.refreshToken.deleteMany({ where: { user: users } });
    await prisma.user.deleteMany({ where: users });
    const keys = await redis.keys('login:fail:*');
    if (keys.length) await redis.del(...keys);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);

    await cleanUp();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = (loginId: string) => ({
      loginId,
      role: 'STUDENT' as const,
      passwordHash,
      firstName: 'E2e',
      lastName: loginId,
    });
    await prisma.user.createMany({
      data: [
        user(ID.student),
        user(ID.rateLimited),
        { ...user(ID.blocked), status: 'BLOCKED' },
        {
          ...user(ID.temp),
          tempPasswordUsesLeft: 1,
          tempPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  describe('login', () => {
    it('returns an access token and sets the refresh token as an httpOnly cookie', async () => {
      const res = await login(ID.student).expect(200);
      const body = res.body as {
        accessToken: string;
        user: { loginId: string };
      };

      expect(body.accessToken.split('.')).toHaveLength(3); // header.payload.signature
      expect(body.user.loginId).toBe(ID.student);
      expect(body).not.toHaveProperty('user.passwordHash');

      const setCookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(setCookie).toMatch(/HttpOnly/);
      expect(setCookie).toMatch(/Path=\/auth/);
      expect(setCookie).toMatch(/SameSite=Lax/);
    });

    it('answers a wrong password and an unknown ID in exactly the same way', async () => {
      const wrongPassword = await login(ID.student, 'wrong-password').expect(
        401,
      );
      const unknownId = await login('e2e-nobody', 'wrong-password').expect(401);

      expect(wrongPassword.body).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Wrong login ID or password',
      });
      expect(unknownId.body).toEqual(wrongPassword.body);
    });

    it('blocks the login ID for 15 minutes after 5 wrong passwords', async () => {
      for (let i = 0; i < 5; i++) {
        await login(ID.rateLimited, 'wrong-password').expect(401);
      }
      const res = await login(ID.rateLimited).expect(429); // even the correct password
      expect((res.body as { code: string }).code).toBe('RATE_LIMITED');
    });

    it('tells a blocked user only after the correct password', async () => {
      await login(ID.blocked, 'wrong-password').expect(401);
      const res = await login(ID.blocked).expect(403);
      expect((res.body as { code: string }).code).toBe('ACCOUNT_BLOCKED');
    });
  });

  describe('refresh and logout', () => {
    it('rotates the refresh token: new cookie, old token revoked', async () => {
      const first = refreshCookie(await login(ID.student).expect(200))!;
      const res = await refresh(first).expect(200);
      const second = refreshCookie(res);

      expect(second).toBeDefined();
      expect(second).not.toBe(first);
      const old = await prisma.refreshToken.findFirstOrThrow({
        where: { user: { loginId: ID.student }, replacedBy: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      expect(old.revokedAt).not.toBeNull();
    });

    it('detects reuse of an old token and revokes the whole family', async () => {
      const first = refreshCookie(await login(ID.student).expect(200))!;
      const second = refreshCookie(await refresh(first).expect(200))!;

      // Within 10 s the old token is accepted once more (a second browser tab)...
      await refresh(first).expect(200);
      // ...after the grace window it means theft. Move "revoked at" back instead of waiting.
      await prisma.refreshToken.updateMany({
        where: { user: { loginId: ID.student }, replacedBy: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      const reused = await refresh(first).expect(401);
      expect((reused.body as { code: string }).code).toBe('UNAUTHENTICATED');
      // The valid token of the same family no longer works either
      await refresh(second).expect(401);
    });

    it('logout revokes the session and clears the cookie', async () => {
      const token = refreshCookie(await login(ID.student).expect(200))!;
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', `${REFRESH_COOKIE}=${token}`)
        .expect(204);

      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(
        new RegExp(`^${REFRESH_COOKIE}=;`),
      );
      await refresh(token).expect(401);
    });
  });

  describe('temporary password', () => {
    it('uses up the sign-ins, then only allows setting a new password', async () => {
      const firstBody = (await login(ID.temp).expect(200)).body as {
        tempPasswordWarning: { usesLeft: number };
      };
      expect(firstBody.tempPasswordWarning.usesLeft).toBe(0);

      // Limit reached: the next sign-in must set a new password
      const second = (await login(ID.temp).expect(200)).body as {
        accessToken: string;
        user: { mustChangePassword: boolean };
      };
      expect(second.user.mustChangePassword).toBe(true);

      const changed = await graphql(
        'mutation($i: ChangePasswordInput!) { changePassword(input: $i) { accessToken } }',
        second.accessToken,
        {
          i: { currentPassword: PASSWORD, newPassword: 'E2e-New-Password-456' },
        },
      ).expect(200);
      const newToken = (
        changed.body as { data: { changePassword: { accessToken: string } } }
      ).data.changePassword.accessToken;

      const me = await graphql('{ me { mustChangePassword } }', newToken);
      expect(me.body).toEqual({ data: { me: { mustChangePassword: false } } });
      await login(ID.temp, 'E2e-New-Password-456').expect(200);
    });
  });
});
