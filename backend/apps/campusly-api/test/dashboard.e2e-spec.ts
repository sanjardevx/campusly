import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { toDbDate, todayInZone } from '../src/libs/utils/date';

// Needs Docker Postgres + Redis. The numbers are school-wide (real seed data is counted too), so
// the test compares before / after: it adds two students, today's marks, a weak attendance
// record and a published deadline.
const PASSWORD = 'E2e-Dashboard-Password-1';
const TAG = 'E2E Dashboard';
const ZONE = 'Asia/Tashkent';

type Key = 'admin' | 'teacher' | 'student';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Dashboard {
  today: string;
  students: number;
  newStudentsThisMonth: number;
  notSignedIn: number;
  accounts: number;
  period: { name: string } | null;
  needsAttention: {
    high: number;
    students: { loginId: string; priority: string; attendanceRate: number }[];
  };
  recentActivity: { action: string }[];
}
interface Overview {
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
}

const DASHBOARD = `{ adminDashboard { today students newStudentsThisMonth notSignedIn accounts
  period { name } needsAttention { high students { loginId priority attendanceRate marks } }
  recentActivity { action } } }`;
const OVERVIEW = `query($r: AttendanceRange!) { attendanceOverview(range: $r) {
  present late excused absent total } }`;
const CALENDAR = `query($m: String!) { dashboardCalendar(month: $m) { kind title startsOn endsOn schoolEventId } }`;
const CREATE_EVENT = `mutation($i: CreateSchoolEventInput!) { createSchoolEvent(input: $i) { id } }`;

describe('Admin dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const token = {} as Record<Key, string>;
  let before: Dashboard;
  let todayBefore: Overview;
  let today: string;

  async function gql<T>(
    query: string,
    variables: object = {},
    as: Key = 'admin',
  ) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const dashboard = async () =>
    (await gql<{ adminDashboard: Dashboard }>(DASHBOARD)).data!.adminDashboard;
  const overviewToday = async () =>
    (await gql<{ attendanceOverview: Overview }>(OVERVIEW, { r: 'TODAY' }))
      .data!.attendanceOverview;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    await prisma.schoolEvent.deleteMany({
      where: { title: { startsWith: TAG } },
    });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.attendanceRecord.deleteMany({
      where: { session: { course: courses } },
    });
    await prisma.classSession.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({ where: { academicYear: { name: TAG } } });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: TAG } });
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
    const create = (
      key: string,
      role: 'ADMIN' | 'TEACHER' | 'STUDENT',
      extra = {},
    ) =>
      prisma.user.create({
        data: {
          loginId: `e2e-dash-${key}`,
          role,
          passwordHash,
          firstName: key,
          lastName: TAG,
          ...extra,
        },
      });
    const login = async (key: string) =>
      (
        (
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ loginId: `e2e-dash-${key}`, password: PASSWORD })
        ).body as { accessToken: string }
      ).accessToken;

    // "before" is read while the test students and marks do not exist yet
    await create('admin', 'ADMIN');
    const teacher = await create('teacher', 'TEACHER');
    token.admin = await login('admin');
    token.teacher = await login('teacher');
    before = await dashboard();
    todayBefore = await overviewToday();
    today = before.today;

    const student = await create('student', 'STUDENT');
    token.student = await login('student');
    // Still on the temporary password: "not signed in yet"
    const newcomer = await create('newcomer', 'STUDENT', {
      mustChangePassword: true,
    });

    const year = await prisma.academicYear.create({
      data: {
        name: TAG,
        startsAt: new Date('2025-09-01'),
        endsAt: new Date('2027-08-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const group = await prisma.group.create({
      data: { academicYearId: year.id, name: 'E2E-DASH' },
    });
    const course = await prisma.course.create({
      data: {
        academicYearId: year.id,
        groupId: group.id,
        subjectId: subject.id,
        title: `${TAG} course`,
        status: 'ACTIVE',
      },
    });

    // The newcomer: 5 days, absent on 2 → 60 % → HIGH. Today's marks: present, absent, excused.
    // (The 5 days go back from today; on the first days of a period some fall outside it.)
    for (let back = 0; back < 5; back++) {
      const date = new Date(toDbDate(today).getTime() - back * 86_400_000);
      const session = await prisma.classSession.create({
        data: { courseId: course.id, date, createdById: teacher.id },
      });
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: newcomer.id,
          status: back < 2 ? 'ABSENT' : 'PRESENT',
          markedById: teacher.id,
        },
      });
      if (back === 0) {
        for (const [studentId, status] of [
          [student.id, 'PRESENT'],
          [teacher.id, 'EXCUSED'],
        ] as const) {
          await prisma.attendanceRecord.create({
            data: {
              sessionId: session.id,
              studentId,
              status,
              markedById: teacher.id,
            },
          });
        }
      }
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('"today" is the school’s day', () => {
    expect(today).toBe(todayInZone(ZONE));
  });

  it('counts new students, "this month" and the ones still on a temporary password', async () => {
    const after = await dashboard();
    expect(after.students).toBe(before.students + 2);
    expect(after.newStudentsThisMonth).toBe(before.newStudentsThisMonth + 2);
    expect(after.accounts).toBe(before.accounts + 2);
    expect(after.notSignedIn).toBe(before.notSignedIn + 1);
  });

  it('attendance overview: today’s marks by status', async () => {
    const after = await overviewToday();
    expect(after.total).toBe(todayBefore.total + 3);
    expect(after.present).toBe(todayBefore.present + 1);
    expect(after.absent).toBe(todayBefore.absent + 1);
    expect(after.excused).toBe(todayBefore.excused + 1);
  });

  it('needs attention (attendance only): 60 % this period is HIGH and listed first', async () => {
    const after = await dashboard();
    // The rule measures the current period up to today: all 5 days must fall inside it (not in a
    // holiday, not in the first days of a quarter)
    const day = toDbDate(today);
    const period = await prisma.period.findFirst({
      where: {
        academicYear: { isCurrent: true },
        children: { none: {} },
        startsAt: { lte: day },
      },
      orderBy: { startsAt: 'desc' },
    });
    const fiveDaysAgo = new Date(day.getTime() - 4 * 86_400_000);
    if (!after.period || !period) return; // no current period: nothing to measure
    if (period.startsAt > fiveDaysAgo || period.endsAt < day) return;
    expect(after.needsAttention.high).toBe(before.needsAttention.high + 1);
    expect(after.needsAttention.students[0]).toMatchObject({
      loginId: 'e2e-dash-newcomer',
      priority: 'HIGH',
      attendanceRate: 60,
      marks: 5,
    });
  });

  it('calendar: the school’s events (multi-day too) of the month; archived ones are gone', async () => {
    const month = today.slice(0, 7);
    const holiday = await gql<{ createSchoolEvent: { id: string } }>(
      CREATE_EVENT,
      {
        i: {
          kind: 'HOLIDAY',
          title: `${TAG} holiday`,
          startsOn: today,
          endsOn: `${month}-28` > today ? `${month}-28` : today,
        },
      },
    );
    const fair = await gql<{ createSchoolEvent: { id: string } }>(
      CREATE_EVENT,
      {
        i: { kind: 'EVENT', title: `${TAG} fair`, startsOn: today },
      },
    );
    await gql(
      `mutation($id: String!) { archiveSchoolEvent(id: $id) { status } }`,
      {
        id: fair.data!.createSchoolEvent.id,
      },
    );

    const res = await gql<{
      dashboardCalendar: {
        kind: string;
        title: string;
        startsOn: string;
        schoolEventId: string | null;
      }[];
    }>(CALENDAR, { m: month });
    const mine = res.data!.dashboardCalendar.filter((e) =>
      e.title.startsWith(TAG),
    );
    expect(mine).toEqual([
      expect.objectContaining({
        kind: 'HOLIDAY',
        title: `${TAG} holiday`,
        startsOn: today,
        schoolEventId: holiday.data!.createSchoolEvent.id,
      }),
    ]);
    expect(
      (await gql(CALENDAR, { m: '2026-13' })).errors?.[0].extensions.code,
    ).toBe('BAD_REQUEST');
  });

  it('recent activity shows the action only, never before / after', async () => {
    const after = await dashboard();
    for (const item of after.recentActivity)
      expect(Object.keys(item)).toEqual(['action']);
  });

  // ───────────── isolation: school-wide numbers are for admins only ─────────────
  const queries: [string, string, object][] = [
    ['adminDashboard', DASHBOARD, {}],
    ['attendanceOverview', OVERVIEW, { r: 'WEEK' }],
    ['dashboardCalendar', CALENDAR, { m: '2026-10' }],
  ];
  for (const as of ['teacher', 'student'] as const) {
    it.each(queries)(
      `${as}: %s → FORBIDDEN`,
      async (_name, query, variables) => {
        expect(
          (await gql(query, variables, as)).errors?.[0].extensions.code,
        ).toBe('FORBIDDEN');
      },
    );
  }
});
