import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

// Needs Docker Postgres + Redis. Creates its own users ("e2e-audit-…") and one audit row,
// removes them afterwards, so it works on the empty CI database.
const PASSWORD = 'E2e-Audit-Password-1';
const USERS = [
  { loginId: 'e2e-audit-admin', role: 'ADMIN' },
  { loginId: 'e2e-audit-teacher', role: 'TEACHER' },
  { loginId: 'e2e-audit-student', role: 'STUDENT' },
  { loginId: 'e2e-audit-parent', role: 'PARENT' },
] as const;

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface AuditLogsData {
  auditLogs: {
    metaCounter: { total: number };
    list: {
      action: string;
      target: string | null;
      actor: { loginId: string } | null;
      changes: { field: string; before: string | null; after: string | null }[];
    }[];
  };
}

const AUDIT_LOGS = `query($input: AuditLogsInquiry!) {
  auditLogs(input: $input) {
    metaCounter { total }
    list { action target actor { loginId } changes { field before after } }
  }
}`;

describe('Activity log (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};

  async function gql<T>(token: string, variables: object) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: AUDIT_LOGS, variables });
    return res.body as GqlBody<T>;
  }

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { loginId: { startsWith: 'e2e-audit-' } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const redis = app.get(RedisService);
    const keys = await redis.keys('login:fail:*');
    if (keys.length) await redis.del(...keys);

    await cleanUp();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const u of USERS) {
      const user = await prisma.user.create({
        data: {
          loginId: u.loginId,
          role: u.role,
          passwordHash,
          firstName: 'E2e',
          lastName: u.role,
        },
      });
      ids[u.role] = user.id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: u.loginId, password: PASSWORD });
      tokens[u.role] = (res.body as { accessToken: string }).accessToken;
    }

    // What an admin action leaves behind: the admin blocked the student
    await prisma.auditLog.create({
      data: {
        actorId: ids.ADMIN,
        action: 'user.block',
        entityType: 'User',
        entityId: ids.STUDENT,
        before: { firstName: 'E2e', lastName: 'STUDENT', status: 'ACTIVE' },
        after: { firstName: 'E2e', lastName: 'STUDENT', status: 'BLOCKED' },
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('the admin sees who changed what, with only the changed fields', async () => {
    const res = await gql<AuditLogsData>(tokens.ADMIN, {
      input: { page: 1, limit: 10, actorId: ids.ADMIN },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data?.auditLogs.metaCounter.total).toBe(1);
    expect(res.data?.auditLogs.list[0]).toEqual({
      action: 'user.block',
      target: 'E2e STUDENT',
      actor: { loginId: 'e2e-audit-admin' },
      changes: [{ field: 'status', before: 'ACTIVE', after: 'BLOCKED' }],
    });
  });

  it('filters by action', async () => {
    const res = await gql<AuditLogsData>(tokens.ADMIN, {
      input: { page: 1, limit: 10, actorId: ids.ADMIN, action: 'user.unblock' },
    });
    expect(res.data?.auditLogs.metaCounter.total).toBe(0);
  });

  it('rejects an unknown action instead of searching for it', async () => {
    const res = await gql<AuditLogsData>(tokens.ADMIN, {
      input: { page: 1, limit: 10, action: 'user.drop' },
    });
    expect(res.errors?.[0].extensions.code).toBe('BAD_REQUEST');
  });

  it.each(['TEACHER', 'STUDENT', 'PARENT'])(
    'a %s cannot read the activity log (foreign user)',
    async (role) => {
      const res = await gql<AuditLogsData>(tokens[role], {
        input: { page: 1, limit: 10 },
      });
      expect(res.data).toBeNull();
      expect(res.errors?.[0].extensions.code).toBe('FORBIDDEN');
    },
  );
});
