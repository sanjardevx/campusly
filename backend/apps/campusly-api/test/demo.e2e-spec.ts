import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { RedisService } from '../src/database/redis.service';
import { PrismaService } from '../src/database/prisma.service';
import { REFRESH_COOKIE } from '../src/libs/config';

// Needs Docker Postgres + Redis. Two demo-flagged accounts (student, admin — there is no admin demo
// login since demo v2, but the guard still protects such an account); DEMO_MODE is switched by a
// spy on ConfigService, so the real .env (DEMO_MODE=false) stays as it is.
const TAG = 'E2E Demo';

interface GqlBody {
  data: unknown;
  errors?: { extensions: { code: string } }[];
}

describe('Demo login (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  let demoOn = true;

  const demo = (role: string) =>
    request(app.getHttpServer()).post('/auth/demo').send({ role });
  const gql = async (query: string, token: string) =>
    (
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({ query })
    ).body as GqlBody;
  const code = (body: GqlBody) => body.errors?.[0].extensions.code ?? 'OK';

  let seededDemoIds: string[] = [];

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const keys = await redis.keys('demo:ip:*');
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

    // DEMO_MODE comes from the spy; every other setting from the real config
    const config = app.get<{ get(key: string): unknown }>(ConfigService);
    const get = config.get.bind(config);
    jest
      .spyOn(config, 'get')
      .mockImplementation((key) => (key === 'DEMO_MODE' ? demoOn : get(key)));

    await cleanUp();
    // The seeded school's demo accounts would win the role (an e2e run may have seeded it):
    // only this file's accounts are demo while it runs, the others get their flag back after
    const seeded = await prisma.user.findMany({
      where: { isDemo: true },
      select: { id: true },
    });
    seededDemoIds = seeded.map((u) => u.id);
    await prisma.user.updateMany({
      where: { id: { in: seededDemoIds } },
      data: { isDemo: false },
    });
    const passwordHash = await bcrypt.hash('E2e-Demo-Password-1', 10);
    await prisma.user.createMany({
      data: [
        {
          loginId: 'e2e-demo-student',
          role: 'STUDENT',
          passwordHash,
          firstName: 'Demo',
          lastName: TAG,
          isDemo: true,
          // A temporary password must not show up in the demo
          tempPasswordUsesLeft: 1,
          tempPasswordExpiresAt: new Date(Date.now() + 86_400_000),
        },
        {
          loginId: 'e2e-demo-admin',
          role: 'ADMIN',
          passwordHash,
          firstName: 'Demo',
          lastName: TAG,
          isDemo: true,
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.user.updateMany({
      where: { id: { in: seededDemoIds } },
      data: { isDemo: true },
    });
    await app.close();
  });

  it('signs in as the demo account of the role: token + httpOnly refresh cookie, no temp-password banner', async () => {
    const res = await demo('STUDENT').expect(200);
    const body = res.body as {
      accessToken: string;
      user: { loginId: string; mustChangePassword: boolean; isDemo: boolean };
      tempPasswordWarning?: unknown;
    };
    expect(body.user).toMatchObject({
      loginId: 'e2e-demo-student',
      mustChangePassword: false,
      isDemo: true,
    });
    expect(body.tempPasswordWarning).toBeUndefined();
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find(
      (c) => c.startsWith(`${REFRESH_COOKIE}=`),
    );
    expect(cookie).toContain('HttpOnly');
    expect(code(await gql('{ me { loginId } }', body.accessToken))).toBe('OK');
  });

  it('demo accounts may look, not change a password or manage users', async () => {
    const student = (await demo('STUDENT')).body as { accessToken: string };
    const change = `mutation { changePassword(input: { currentPassword: "E2e-Demo-Password-1", newPassword: "Another-Password-2" }) { accessToken } }`;
    expect(code(await gql(change, student.accessToken))).toBe('DEMO_READ_ONLY');

    // No admin demo login (DECISIONS §12, demo v2); a demo-flagged admin signed in with a password
    // is still kept away from user management by the guard
    const admin = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: 'e2e-demo-admin', password: 'E2e-Demo-Password-1' })
    ).body as { accessToken: string };
    const block = `mutation { blockUser(userId: "01a00000-0000-7000-8000-000000000000") }`;
    expect(code(await gql(block, admin.accessToken))).toBe('DEMO_READ_ONLY');
    // Reading is fine
    expect(
      code(
        await gql(
          '{ users(input: { page: 1, limit: 1, search: { role: STUDENT } }) { metaCounter { total } } }',
          admin.accessToken,
        ),
      ),
    ).toBe('OK');
  });

  it('no demo account for the role → 404; ADMIN or an unknown role → 400', async () => {
    expect((await demo('PARENT').expect(404)).body).toMatchObject({
      code: 'NOT_FOUND',
    });
    await demo('ADMIN').expect(400);
    await demo('ROOT').expect(400);
  });

  it('limited per IP (20 in 15 minutes)', async () => {
    const [key] = await redis.keys('demo:ip:*');
    await redis.set(key, '20');
    expect((await demo('STUDENT').expect(429)).body).toMatchObject({
      code: 'RATE_LIMITED',
    });
    await redis.del(key);
  });

  it('off unless DEMO_MODE=true: the endpoint "does not exist"', async () => {
    demoOn = false;
    await demo('STUDENT').expect(404);
    demoOn = true;
  });
});
