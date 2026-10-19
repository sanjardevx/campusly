import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import type { SchoolSettings } from '../src/libs/dto/school/school';

// Needs Docker Postgres + Redis. Uses years 2098–2100 (no overlap with real data). The school
// settings row and the "current year" flag are real data: saved before and restored after.
const PASSWORD = 'E2e-School-Password-1';

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}

describe('School settings, years, periods (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let settingsBefore: SchoolSettings | null;
  let currentYearBefore: string | undefined;

  async function gql<T>(
    query: string,
    variables: object = {},
    token: string | null = adminToken,
  ) {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return (await req.send({ query, variables })).body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;
  const tokenFor = async (loginId: string) =>
    (
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ loginId, password: PASSWORD })
      ).body as { accessToken: string }
    ).accessToken;

  const CREATE_YEAR = `mutation($i: CreateAcademicYearInput!) {
    createAcademicYear(input: $i) { id name startsAt endsAt isCurrent }
  }`;
  const CREATE_PERIOD = `mutation($i: CreatePeriodInput!) {
    createPeriod(input: $i) { id name startsAt endsAt }
  }`;
  const year = (name: string, startsAt: string, endsAt: string) => ({
    i: { name, startsAt, endsAt },
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    settingsBefore = await prisma.schoolSetting.findUnique({
      where: { id: 1 },
      omit: { id: true, updatedAt: true },
    });
    currentYearBefore = (
      await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    )?.id;

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const [loginId, role] of [
      ['e2e-school-admin', 'ADMIN'],
      ['e2e-school-student', 'STUDENT'],
    ] as const) {
      await prisma.user.create({
        data: {
          loginId,
          role,
          passwordHash,
          firstName: 'E2e',
          lastName: 'School',
        },
      });
    }
    adminToken = await tokenFor('e2e-school-admin');
    studentToken = await tokenFor('e2e-school-student');
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { loginId: { startsWith: 'e2e-school-' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.period.deleteMany({
      where: { academicYear: { name: { startsWith: 'E2E' } } },
    });
    await prisma.academicYear.deleteMany({
      where: { name: { startsWith: 'E2E' } },
    });

    // Restore the real data exactly
    if (settingsBefore) {
      await prisma.schoolSetting.update({
        where: { id: 1 },
        data: settingsBefore,
      });
    } else {
      await prisma.schoolSetting.deleteMany();
    }
    if (currentYearBefore) {
      await prisma.academicYear.update({
        where: { id: currentYearBefore },
        data: { isCurrent: true },
      });
    }
    await app.close();
  });

  describe('settings', () => {
    const SETTINGS =
      '{ schoolSettings { schoolName timezone mark5MinPercent defaultExamWeight } }';
    const UPDATE = `mutation($i: UpdateSchoolSettingsInput!) {
      updateSchoolSettings(input: $i) { schoolName timezone mark5MinPercent mark4MinPercent defaultHomeworkWeight }
    }`;

    it('can be read without signing in (landing page)', async () => {
      const res = await gql<{ schoolSettings: { timezone: string } }>(
        SETTINGS,
        {},
        null,
      );
      expect(res.errors).toBeUndefined();
      expect(res.data!.schoolSettings.timezone).toBeTruthy();
    });

    it('only an admin may change them', async () => {
      expect(
        code(await gql(UPDATE, { i: { schoolName: 'Hacked' } }, studentToken)),
      ).toBe('FORBIDDEN');
    });

    it.each([
      [{ mark4MinPercent: 90 }, 'Mark thresholds must go down'],
      [{ defaultHomeworkWeight: 50 }, 'Category weights must add up to 100'],
      [{ timezone: 'Mars/Olympus' }, 'Unknown timezone'],
    ])('rejects %o', async (input, message) => {
      const res = await gql(UPDATE, { i: input });
      expect(code(res)).toBe('BAD_REQUEST');
      expect(res.errors![0].message).toContain(message);
    });

    it('a partial update keeps the other values and writes an audit row', async () => {
      const before = (
        await gql<{ schoolSettings: { mark5MinPercent: number } }>(SETTINGS)
      ).data!;
      const res = await gql<{
        updateSchoolSettings: { schoolName: string; mark5MinPercent: number };
      }>(UPDATE, { i: { schoolName: 'E2E School' } });

      expect(res.data!.updateSchoolSettings.schoolName).toBe('E2E School');
      expect(res.data!.updateSchoolSettings.mark5MinPercent).toBe(
        before.schoolSettings.mark5MinPercent,
      );
      expect(
        await prisma.auditLog.count({
          where: {
            action: 'settings.update',
            actor: { loginId: 'e2e-school-admin' },
          },
        }),
      ).toBe(1);
    });
  });

  describe('academic years and periods', () => {
    let yearId: string;

    it('creates a year; a duplicate name is CONFLICT, bad dates are BAD_REQUEST', async () => {
      const res = await gql<{
        createAcademicYear: {
          id: string;
          startsAt: string;
          isCurrent: boolean;
        };
      }>(CREATE_YEAR, year('E2E 2098–99', '2098-09-01', '2099-05-31'));
      expect(res.errors).toBeUndefined();
      yearId = res.data!.createAcademicYear.id;
      expect(res.data!.createAcademicYear).toMatchObject({
        startsAt: '2098-09-01',
        isCurrent: false,
      });

      const duplicate = await gql(
        CREATE_YEAR,
        year('E2E 2098–99', '2100-09-01', '2101-05-31'),
      );
      expect(code(duplicate)).toBe('CONFLICT');
      expect(duplicate.errors![0].message).toBe('Already exists: name');

      expect(
        code(
          await gql(
            CREATE_YEAR,
            year('E2E overlap', '2099-01-01', '2099-12-31'),
          ),
        ),
      ).toBe('BAD_REQUEST');
      expect(
        code(
          await gql(
            CREATE_YEAR,
            year('E2E backwards', '2100-05-01', '2100-01-01'),
          ),
        ),
      ).toBe('BAD_REQUEST');
      expect(
        code(
          await gql(
            CREATE_YEAR,
            year('E2E impossible', '2100-02-30', '2100-05-01'),
          ),
        ),
      ).toBe('BAD_REQUEST');
      expect(
        code(
          await gql(
            CREATE_YEAR,
            year('E2E format', '01.09.2100', '2101-05-01'),
          ),
        ),
      ).toBe('BAD_REQUEST');
    });

    it('a quarter must be inside its year and must not overlap another quarter', async () => {
      const quarter = (
        name: string,
        startsAt: string,
        endsAt: string,
        order = 1,
      ) => ({
        i: {
          academicYearId: yearId,
          kind: 'QUARTER',
          name,
          order,
          startsAt,
          endsAt,
        },
      });
      const q1 = await gql<{
        createPeriod: { startsAt: string; endsAt: string };
      }>(CREATE_PERIOD, quarter('Quarter 1', '2098-09-01', '2098-10-31'));
      expect(q1.data?.createPeriod).toMatchObject({
        startsAt: '2098-09-01',
        endsAt: '2098-10-31',
      });

      expect(
        code(
          await gql(
            CREATE_PERIOD,
            quarter('Quarter 0', '2098-08-01', '2098-08-30'),
          ),
        ),
      ).toBe('BAD_REQUEST');
      expect(
        code(
          await gql(
            CREATE_PERIOD,
            quarter('Quarter 2', '2098-10-15', '2098-12-20', 2),
          ),
        ),
      ).toBe('BAD_REQUEST');
      // Same name in the same year: unique index → CONFLICT
      expect(
        code(
          await gql(
            CREATE_PERIOD,
            quarter('Quarter 1', '2098-11-09', '2098-12-27', 2),
          ),
        ),
      ).toBe('CONFLICT');

      // The year cannot shrink so that the quarter falls outside
      const shrink = await gql(
        'mutation($i: UpdateAcademicYearInput!) { updateAcademicYear(input: $i) { id } }',
        { i: { id: yearId, startsAt: '2098-10-01' } },
      );
      expect(code(shrink)).toBe('BAD_REQUEST');
    });

    it('two admins setting the current year at the same time leave exactly one current year', async () => {
      const other = await gql<{ createAcademicYear: { id: string } }>(
        CREATE_YEAR,
        year('E2E 2099–00', '2099-09-01', '2100-05-31'),
      );
      const otherId = other.data!.createAcademicYear.id;
      const SET =
        'mutation($id: String!) { setCurrentAcademicYear(id: $id) { id isCurrent } }';

      await Promise.all([
        gql(SET, { id: yearId }),
        gql(SET, { id: otherId }),
        gql(SET, { id: yearId }),
        gql(SET, { id: otherId }),
      ]);

      expect(
        await prisma.academicYear.count({ where: { isCurrent: true } }),
      ).toBe(1);
      const current = await gql<{ currentAcademicYear: { name: string } }>(
        '{ currentAcademicYear { name } }',
      );
      expect(current.data!.currentAcademicYear.name).toMatch(/^E2E 2099/);
    });
  });
});
