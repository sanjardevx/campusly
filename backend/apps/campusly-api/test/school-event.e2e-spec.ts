import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Events are tagged by title and removed afterwards.
const PASSWORD = 'E2e-Events-Password-1';
const TAG = 'E2E Events';

type Key = 'admin' | 'teacher' | 'parent';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Event {
  id: string;
  kind: string;
  title: string;
  startsOn: string;
  endsOn: string;
  note: string | null;
  status: string;
}

const FIELDS = 'id kind title startsOn endsOn note status';
const CREATE = `mutation($i: CreateSchoolEventInput!) { createSchoolEvent(input: $i) { ${FIELDS} } }`;
const UPDATE = `mutation($i: UpdateSchoolEventInput!) { updateSchoolEvent(input: $i) { ${FIELDS} } }`;
const ARCHIVE = `mutation($id: String!) { archiveSchoolEvent(id: $id) { ${FIELDS} } }`;

describe('School calendar events (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const token = {} as Record<Key, string>;

  async function gql<T>(query: string, variables: object, as: Key = 'admin') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;
  const create = (i: object, as: Key = 'admin') =>
    gql<{ createSchoolEvent: Event }>(
      CREATE,
      {
        i: { title: `${TAG} day`, kind: 'EVENT', startsOn: '2026-11-10', ...i },
      },
      as,
    );

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.schoolEvent.deleteMany({
      where: { title: { startsWith: TAG } },
    });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanUp();

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const [key, role] of [
      ['admin', 'ADMIN'],
      ['teacher', 'TEACHER'],
      ['parent', 'PARENT'],
    ] as const) {
      await prisma.user.create({
        data: {
          loginId: `e2e-events-${key}`,
          role,
          passwordHash,
          firstName: key,
          lastName: TAG,
        },
      });
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-events-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('creates a one-day event (no end = the same day) and audits it', async () => {
    const res = await create({ note: '  Main hall  ' });
    expect(res.data!.createSchoolEvent).toMatchObject({
      kind: 'EVENT',
      startsOn: '2026-11-10',
      endsOn: '2026-11-10',
      note: 'Main hall',
      status: 'ACTIVE',
    });
    const id = res.data!.createSchoolEvent.id;
    expect(
      await prisma.auditLog.count({
        where: { action: 'schoolEvent.create', entityId: id },
      }),
    ).toBe(1);
  });

  it('a multi-day holiday; the end may not be before the start; at most 92 days', async () => {
    const holiday = await create({
      kind: 'HOLIDAY',
      startsOn: '2026-12-30',
      endsOn: '2027-01-08',
    });
    expect(holiday.data!.createSchoolEvent.endsOn).toBe('2027-01-08');
    expect(
      code(await create({ startsOn: '2026-11-10', endsOn: '2026-11-09' })),
    ).toBe('DATES_ORDER');
    expect(
      code(await create({ startsOn: '2026-09-01', endsOn: '2026-12-31' })),
    ).toBe('BAD_REQUEST');
    expect(code(await create({ startsOn: '10.11.2026' }))).toBe('BAD_REQUEST');
  });

  it('update: a one-day event moved to another day stays one day; "" clears the note', async () => {
    const id = (await create({ note: 'x' })).data!.createSchoolEvent.id;
    const moved = await gql<{ updateSchoolEvent: Event }>(UPDATE, {
      i: { id, startsOn: '2026-11-20', note: '' },
    });
    expect(moved.data!.updateSchoolEvent).toMatchObject({
      startsOn: '2026-11-20',
      endsOn: '2026-11-20',
      note: null,
    });
    // A new start after the old end of a longer event is checked as a whole
    const long = (
      await create({ startsOn: '2026-11-01', endsOn: '2026-11-03' })
    ).data!.createSchoolEvent.id;
    expect(
      code(await gql(UPDATE, { i: { id: long, startsOn: '2026-11-05' } })),
    ).toBe('DATES_ORDER');
  });

  it('archive: no hard delete; an archived event cannot be changed again', async () => {
    const id = (await create({})).data!.createSchoolEvent.id;
    const archived = await gql<{ archiveSchoolEvent: Event }>(ARCHIVE, { id });
    expect(archived.data!.archiveSchoolEvent.status).toBe('ARCHIVED');
    expect(await prisma.schoolEvent.count({ where: { id } })).toBe(1);
    expect(code(await gql(ARCHIVE, { id }))).toBe('NOT_FOUND');
    expect(code(await gql(UPDATE, { i: { id, title: `${TAG} again` } }))).toBe(
      'NOT_FOUND',
    );
  });

  // ───────────── isolation: only admins edit the school calendar ─────────────
  it.each(['teacher', 'parent'] as const)(
    '%s → FORBIDDEN, nothing saved',
    async (as) => {
      expect(code(await create({ title: `${TAG} by ${as}` }, as))).toBe(
        'FORBIDDEN',
      );
      expect(
        await prisma.schoolEvent.count({ where: { title: `${TAG} by ${as}` } }),
      ).toBe(0);
    },
  );
});
