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

    // A specific code per rule: the settings page explains it in the admin's language
    it.each([
      [{ mark4MinPercent: 90 }, 'MARK_THRESHOLDS_ORDER'],
      [{ defaultHomeworkWeight: 50 }, 'WEIGHTS_SUM'],
      [{ timezone: 'Mars/Olympus' }, 'TIMEZONE_UNKNOWN'],
    ])('rejects %o with %s', async (input, expected) => {
      const res = await gql(UPDATE, { i: input });
      expect(code(res)).toBe(expected);
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

    it('contacts and the password rule: saved, "" clears, only t.me links, limits enforced, public for the login page', async () => {
      const CONTACT = `mutation($i: UpdateSchoolSettingsInput!) {
        updateSchoolSettings(input: $i) { contactPhone officeHours telegramUrl telegramBotUrl tempPasswordUses tempPasswordDays }
      }`;
      const saved = await gql<{
        updateSchoolSettings: Record<string, unknown>;
      }>(CONTACT, {
        i: {
          contactPhone: '+998 71 200 00 00',
          officeHours: 'Mon–Fri 9:00–17:00',
          telegramUrl: 'https://t.me/campusly_school',
          telegramBotUrl: 'https://t.me/campusly_reset_bot',
          tempPasswordUses: 5,
          tempPasswordDays: 30,
        },
      });
      expect(saved.data!.updateSchoolSettings).toEqual({
        contactPhone: '+998 71 200 00 00',
        officeHours: 'Mon–Fri 9:00–17:00',
        telegramUrl: 'https://t.me/campusly_school',
        telegramBotUrl: 'https://t.me/campusly_reset_bot',
        tempPasswordUses: 5,
        tempPasswordDays: 30,
      });

      // The login page reads them before anyone signs in
      const anonymous = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ schoolSettings { contactPhone telegramUrl } }' });
      expect(
        (anonymous.body as { data: { schoolSettings: unknown } }).data
          .schoolSettings,
      ).toEqual({
        contactPhone: '+998 71 200 00 00',
        telegramUrl: 'https://t.me/campusly_school',
      });

      const cleared = await gql<{
        updateSchoolSettings: Record<string, unknown>;
      }>(CONTACT, {
        i: { telegramUrl: '', officeHours: '  ' },
      });
      expect(cleared.data!.updateSchoolSettings).toMatchObject({
        contactPhone: '+998 71 200 00 00', // not sent = kept
        officeHours: null,
        telegramUrl: null,
      });

      // Several numbers, comma-separated: the site shows each one
      const two = await gql<{ updateSchoolSettings: { contactPhone: string } }>(
        CONTACT,
        { i: { contactPhone: '+998 93 890 03 26, +82 10 4393 0340' } },
      );
      expect(two.data!.updateSchoolSettings.contactPhone).toBe(
        '+998 93 890 03 26, +82 10 4393 0340',
      );

      for (const bad of [
        { telegramUrl: 'https://evil.example/login' }, // a link on the login page must not lead elsewhere
        { telegramBotUrl: 'https://t.me/campusly_school' }, // a channel, not a bot
        { contactPhone: 'call me <script>' },
        { tempPasswordUses: 11 },
        { tempPasswordDays: 0 },
      ]) {
        expect(code(await gql(CONTACT, { i: bad }))).toBe('BAD_REQUEST');
      }
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
      ).toBe('YEAR_OVERLAP');
      expect(
        code(
          await gql(
            CREATE_YEAR,
            year('E2E backwards', '2100-05-01', '2100-01-01'),
          ),
        ),
      ).toBe('DATES_ORDER');
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
      ).toBe('PERIOD_OUTSIDE_YEAR');
      expect(
        code(
          await gql(
            CREATE_PERIOD,
            quarter('Quarter 2', '2098-10-15', '2098-12-20', 2),
          ),
        ),
      ).toBe('PERIOD_OVERLAP');
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
      expect(code(shrink)).toBe('PERIODS_OUTSIDE_YEAR');

      // The calendar is readable for every signed-in role; changing it is admin-only
      const ids = await gql<{ periods: { id: string }[] }>(
        'query($y: String!) { periods(academicYearId: $y) { id } }',
        { y: yearId },
        studentToken,
      );
      expect(ids.data?.periods).toHaveLength(1);
      expect(
        code(await gql('{ academicYears { id } }', {}, studentToken)),
      ).toBeUndefined();
      expect(
        code(
          await gql(
            'mutation($i: UpdatePeriodInput!) { updatePeriod(input: $i) { id } }',
            { i: { id: ids.data!.periods[0].id, name: 'Hacked' } },
            studentToken,
          ),
        ),
      ).toBe('FORBIDDEN');
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
      // Which request runs last is not fixed, so either year may win — but only one
      expect(current.data!.currentAcademicYear.name).toMatch(/^E2E 209[89]/);
    });
  });

  describe('records page', () => {
    const EXPORT = `mutation($i: RecordExportInput!) { logRecordExport(input: $i) }`;

    it('every download / print leaves an audit row; only an admin may log one', async () => {
      const targetId = '00000000-0000-7000-8000-000000000001';
      const res = await gql<{ logRecordExport: boolean }>(EXPORT, {
        i: { report: 'GRADES', format: 'CSV', targetId, scope: 'Q1' },
      });
      expect(res.data!.logRecordExport).toBe(true);
      const row = await prisma.auditLog.findFirst({
        where: { action: 'records.export', entityId: targetId },
      });
      expect(row).toMatchObject({
        entityType: 'Course',
        after: { report: 'GRADES', format: 'CSV', scope: 'Q1' },
      });

      expect(
        code(
          await gql(
            EXPORT,
            { i: { report: 'STUDENTS', format: 'PRINT' } },
            studentToken,
          ),
        ),
      ).toBe('FORBIDDEN');
      expect(
        code(
          await gql(EXPORT, {
            i: { report: 'STUDENTS', format: 'CSV', targetId: 'x' },
          }),
        ),
      ).toBe('BAD_REQUEST');
    });
  });
});
