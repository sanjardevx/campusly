import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  DEMO_CLASSES,
  createSeedClient,
  resetDemoClasses,
  seedDemo,
} from '../../../prisma/demo-seed';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

// Needs Docker Postgres + Redis. Runs the FULL seed first (it wipes the database, like
// `pnpm prisma db seed`), then checks the partial nightly reset and the demo rules of
// DECISIONS §12 "School data and demo v2" on the real school data.
const PASSWORD = 'E2e-School-Password-1';
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

type Key = 'aziz' | 'classmate' | 'karimova';
const LOGIN: Record<Key, string> = {
  aziz: '26100042', // demo student, 9A
  classmate: '26100031', // a normal 9A student
  karimova: '26200001', // demo teacher, 9A / 11A only
};
interface GqlBody<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('Full school seed, partial demo reset and demo rules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let client: ReturnType<typeof createSeedClient>;
  const token = {} as Record<Key, string>;

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) =>
    body.errors?.[0]?.extensions.code ?? 'OK';

  /** A course of the current year by its title ("Algebra · 9A") */
  const courseId = async (title: string) =>
    (await prisma.course.findFirstOrThrow({ where: { title } })).id;
  const assignmentId = async (course: string, prefix: string) =>
    (
      await prisma.assignment.findFirstOrThrow({
        where: { course: { title: course }, title: { startsWith: prefix } },
      })
    ).id;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    client = createSeedClient(
      app.get(ConfigService).getOrThrow<string>('DATABASE_URL'),
    );
    // The story is written up to the real "today" (the API checks deadlines with the real clock)
    await seedDemo(client, {
      password: PASSWORD,
      demoMode: true,
      now: new Date(),
    });
    for (const [key, loginId] of Object.entries(LOGIN) as [Key, string][]) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
  }, 120_000);

  afterAll(async () => {
    await client.$disconnect();
    await app.close();
  });

  it('seeds the whole school: 22 classes × 15 students, 4 demo accounts, no admin demo', async () => {
    expect(await prisma.groupMember.count()).toBe(330);
    expect(await prisma.group.count()).toBe(22);
    const demo = await prisma.user.findMany({
      where: { isDemo: true },
      select: { loginId: true },
      orderBy: { loginId: 'asc' },
    });
    expect(demo.map((u) => u.loginId)).toEqual([
      '26100042',
      '26100043',
      '26200001',
      '901112233',
    ]);
    const karimova = await prisma.course.findMany({
      where: { teachers: { some: { teacher: { loginId: '26200001' } } } },
      select: { title: true },
    });
    expect(karimova.map((c) => c.title).sort()).toEqual(
      [
        'Algebra · 11A',
        'Algebra · 9A',
        'Geometry · 11A',
        'Geometry · 9A',
      ].sort(),
    );
  });

  it('demo login picks the demo student of the class: 9A Aziz, 11A Madina; other classes are 400', async () => {
    // DEMO_MODE on for this test only (the real .env keeps it off)
    const config = app.get<{ get(key: string): unknown }>(ConfigService);
    const get = config.get.bind(config);
    const spy = jest
      .spyOn(config, 'get')
      .mockImplementation((key) => (key === 'DEMO_MODE' ? true : get(key)));
    const demo = (body: object) =>
      request(app.getHttpServer()).post('/auth/demo').send(body);
    const user = (res: request.Response) =>
      (res.body as { user: { loginId: string; className: string } }).user;
    try {
      const ninth = await demo({ role: 'STUDENT', className: '9A' }).expect(
        200,
      );
      expect(user(ninth)).toMatchObject({
        loginId: '26100042',
        className: '9A',
      });
      const eleventh = await demo({ role: 'STUDENT', className: '11A' }).expect(
        200,
      );
      expect(user(eleventh)).toMatchObject({
        loginId: '26100043',
        className: '11A',
      });
      await demo({ role: 'STUDENT', className: '9B' }).expect(400);
    } finally {
      spy.mockRestore();
      const redis = app.get(RedisService);
      const keys = await redis.keys('demo:ip:*');
      if (keys.length) await redis.del(...keys);
    }
  });

  it('demo accounts write only inside 9A / 11A: the rest of the school is NOT_FOUND', async () => {
    const announce = `mutation($i: CreateCourseAnnouncementsInput!) { createCourseAnnouncements(input: $i) { id } }`;
    const note = (id: string) => ({
      i: { courseIds: [id], title: 'E2E demo note', body: 'Hello' },
    });
    expect(
      code(
        await gql(announce, note(await courseId('Algebra · 9A')), 'karimova'),
      ),
    ).toBe('OK');
    expect(
      code(
        await gql(announce, note(await courseId('Algebra · 9B')), 'karimova'),
      ),
    ).toBe('NOT_FOUND');

    const ask = `mutation($i: AskQuestionInput!) { askQuestion(input: $i) { id } }`;
    const question = (id: string) => ({
      i: { courseId: id, title: 'E2E demo question' },
    });
    expect(
      code(await gql(ask, question(await courseId('Algebra · 9A')), 'aziz')),
    ).toBe('OK');
    expect(
      code(await gql(ask, question(await courseId('Algebra · 9B')), 'aziz')),
    ).toBe('NOT_FOUND');
  });

  it('a demo student retakes an open quiz; a normal student keeps one attempt', async () => {
    // Which quiz is open depends on the calendar: open Quiz 4 now (results not out), whatever today is
    const quiz = await assignmentId('Algebra · 9A', 'Quiz 4');
    await prisma.assignment.update({
      where: { id: quiz },
      data: {
        publishedAt: new Date(Date.now() - DAY),
        dueAt: new Date(Date.now() + 3 * DAY),
        gradesPublishedAt: null,
      },
    });
    const START = `mutation($a: String!) { startQuiz(assignmentId: $a) { state canStart } }`;
    const SUBMIT = `mutation($a: String!) { submitQuiz(assignmentId: $a) { state canStart } }`;
    type Quiz = { state: string; canStart: boolean };

    for (const as of ['aziz', 'classmate'] as const) {
      await gql(START, { a: quiz }, as);
      await gql(SUBMIT, { a: quiz }, as);
    }
    const aziz = await gql<{ startQuiz: Quiz }>(START, { a: quiz }, 'aziz');
    expect(aziz.data!.startQuiz.state).toBe('IN_PROGRESS');
    const classmate = await gql<{ startQuiz: Quiz }>(
      START,
      { a: quiz },
      'classmate',
    );
    expect(classmate.data!.startQuiz).toMatchObject({
      state: 'SUBMITTED',
      canStart: false,
    });
  });

  it('a demo student hands in graded (unpublished) homework again; a normal student may not', async () => {
    // Homework 5 is graded; its grades are hidden again, as in the week after the deadline
    const homework = await assignmentId('Algebra · 9A', 'Homework 5');
    await prisma.assignment.update({
      where: { id: homework },
      data: { gradesPublishedAt: null },
    });
    const SUBMIT = `mutation($i: SubmitAssignmentInput!) { submitAssignment(input: $i) { attemptsLeft } }`;
    const again = { i: { assignmentId: homework, text: 'Second try' } };
    const aziz = await gql<{ submitAssignment: { attemptsLeft: number } }>(
      SUBMIT,
      again,
      'aziz',
    );
    expect(code(aziz)).toBe('OK');
    expect(aziz.data!.submitAssignment.attemptsLeft).toBeGreaterThanOrEqual(1);

    // A graded classmate (the seed grades every hand-in of week 5)
    const graded = await prisma.submission.findFirstOrThrow({
      where: {
        assignmentId: homework,
        status: 'GRADED',
        student: { loginId: { not: '26100042' } },
      },
      select: { student: { select: { loginId: true } } },
    });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ loginId: graded.student.loginId, password: PASSWORD });
    token.classmate = (res.body as { accessToken: string }).accessToken;
    expect(code(await gql(SUBMIT, again, 'classmate'))).toBe('BAD_REQUEST');
  });

  it('demo accounts: a small tutor limit; password change and Telegram stay blocked', async () => {
    const STATUS = '{ tutorStatus { limit } }';
    const limit = (body: GqlBody<{ tutorStatus: { limit: number } }>) =>
      body.data!.tutorStatus.limit;
    const config = app.get(ConfigService);
    expect(limit(await gql(STATUS, {}, 'aziz'))).toBe(
      config.get<number>('TUTOR_DEMO_DAILY_LIMIT'),
    );
    expect(limit(await gql(STATUS, {}, 'classmate'))).toBe(
      config.get<number>('TUTOR_DAILY_LIMIT'),
    );

    const change = `mutation { changePassword(input: { currentPassword: "${PASSWORD}", newPassword: "Another-Password-2" }) { accessToken } }`;
    expect(code(await gql(change, {}, 'aziz'))).toBe('DEMO_READ_ONLY');
    expect(
      code(
        await gql('mutation { createTelegramLink { url } }', {}, 'karimova'),
      ),
    ).toBe('DEMO_READ_ONLY');
  });

  it('the nightly reset rewrites 9A / 11A and the demo traces only, up to the new today', async () => {
    const outside = { course: { group: { name: { notIn: DEMO_CLASSES } } } };
    const snapshot = async () => ({
      submissions: await prisma.submission.count({
        where: { assignment: outside },
      }),
      records: await prisma.attendanceRecord.count({
        where: { session: outside },
      }),
      schoolNews: await prisma.announcement.count({
        where: { courseId: null },
      }),
      users: await prisma.user.count(),
      honors: await prisma.siteHonorStudent.count(),
    });
    const before = await snapshot();
    const weekOne = async (title: string) =>
      (
        await prisma.module.findFirstOrThrow({
          where: { course: { title }, order: 1 },
        })
      ).startsAt!.getTime();
    const before9A = await weekOne('Algebra · 9A');
    const before9B = await weekOne('Algebra · 9B');

    // The admin's edits: one in 9B (kept), one in 9A (the demo's class: reset)
    const lesson = (title: string) =>
      prisma.lesson.findFirstOrThrow({
        where: { module: { course: { title }, order: 1 }, order: 1 },
      });
    await prisma.lesson.update({
      where: { id: (await lesson('Algebra · 9B')).id },
      data: { title: 'E2E kept' },
    });
    await prisma.lesson.update({
      where: { id: (await lesson('Algebra · 9A')).id },
      data: { title: 'E2E reset' },
    });
    // A demo trace outside 9A / 11A: Aziz read a school-wide announcement
    const aziz = await prisma.user.findUniqueOrThrow({
      where: { loginId: '26100042' },
    });
    const schoolNote = await prisma.announcement.findFirstOrThrow({
      where: { courseId: null },
    });
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: schoolNote.id,
          userId: aziz.id,
        },
      },
      create: { announcementId: schoolNote.id, userId: aziz.id },
      update: {},
    });

    // Two weeks later
    const result = await resetDemoClasses(client, {
      now: new Date(Date.now() + 2 * WEEK),
    });
    expect(result.courses).toBe(19); // 9A: 10 subjects, 11A: 9

    expect(await snapshot()).toEqual(before);
    expect((await lesson('Algebra · 9B')).title).toBe('E2E kept');
    expect((await lesson('Algebra · 9A')).title).not.toBe('E2E reset');
    expect(await weekOne('Algebra · 9B')).toBe(before9B);
    // The real calendar: week 1 stays where it is, only the data up to "today" is new
    expect(await weekOne('Algebra · 9A')).toBe(before9A);
    expect(
      await prisma.announcementRead.count({
        where: { announcementId: schoolNote.id, userId: aziz.id },
      }),
    ).toBe(0);
    // The demo's own writes in 9A are gone with the reset
    expect(
      await prisma.courseQuestion.count({
        where: { title: 'E2E demo question' },
      }),
    ).toBe(0);
    expect(
      await prisma.announcement.count({ where: { title: 'E2E demo note' } }),
    ).toBe(0);
  }, 60_000);

  it('the demo teacher always has hand-ins to grade, even in a quarter’s first week', async () => {
    const waiting = {
      status: { in: ['SUBMITTED' as const, 'LATE' as const] },
      assignment: {
        gradesPublishedAt: null,
        course: {
          teachers: { some: { teacher: { loginId: LOGIN.karimova } } },
        },
      },
    };
    // The demo visitor grades everything that waits…
    await prisma.submission.updateMany({
      where: waiting,
      data: { status: 'GRADED', score: 10 },
    });
    expect(await prisma.submission.count({ where: waiting })).toBe(0);

    // …and the next night (Tuesday of quarter 2's first week: quarter 1 is out, this week's
    // homework is not due yet) there is new work again
    await resetDemoClasses(client, { now: new Date('2026-11-10T06:00:00Z') });
    expect(
      await prisma.submission.count({ where: waiting }),
    ).toBeGreaterThanOrEqual(3);
  }, 60_000);
});
