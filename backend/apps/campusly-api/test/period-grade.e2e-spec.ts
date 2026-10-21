import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Year "E2E Period 2082" with Q1 and Q2:
//   course A: teacher tA, students sA (Q1 18/20 = 90 %, Q2 10/10 = 100 %) and sA2 (Q1 10/20 = 50 %),
//   parent pA (of sA); course B: teacher tB, student sB.
const PASSWORD = 'E2e-Period-Password-1';
const TAG = 'E2E Period';

type Key = 'tA' | 'tB' | 'sA' | 'sA2' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Row {
  periodName: string;
  firstName: string;
  score: number | null;
  mark: number | null;
  isPublished: boolean;
  livePercent: number | null;
  computedScore: number | null;
  finalScore: number | null;
  isOutdated: boolean;
}
interface Mine {
  myPeriodGrades: { periods: Row[]; annual: Row };
}

describe('Period grades: live → snapshot → override → annual (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '' };
  const period = { q1: '', q2: '', otherYear: '' };
  let q1HomeworkOfA: string;

  async function gql<T>(query: string, variables: object, as: Key = 'tA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const ROW =
    'periodName firstName score mark isPublished livePercent computedScore finalScore isOutdated';
  const CLASS = `query($c: String!, $p: String!) { coursePeriodGrades(courseId: $c, periodId: $p) { ${ROW} } }`;
  const PUBLISH = `mutation($i: PublishPeriodGradesInput!) { publishPeriodGrades(input: $i) { ${ROW} } }`;
  const FINAL = `mutation($i: SetPeriodFinalScoreInput!) { setPeriodFinalScore(input: $i) { ${ROW} } }`;
  const MINE = `query($c: String!, $s: String) { myPeriodGrades(courseId: $c, studentId: $s) {
    periods { ${ROW} } annual { ${ROW} } } }`;

  const classQ1 = async () =>
    (
      await gql<{ coursePeriodGrades: Row[] }>(CLASS, {
        c: course.A,
        p: period.q1,
      })
    ).data!.coursePeriodGrades;
  const mine = async (as: Key = 'sA') =>
    (await gql<Mine>(MINE, { c: course.A }, as)).data!.myPeriodGrades;
  const publish = (periodId: string, as: Key = 'tA', courseId = course.A) =>
    gql(PUBLISH, { i: { courseId, periodId } }, as);
  const setFinal = (
    periodId: string | null,
    finalScore: number | null,
    studentId = id.sA,
  ) =>
    gql<{ setPeriodFinalScore: Row }>(FINAL, {
      i: { courseId: course.A, periodId, studentId, finalScore },
    });

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.periodGrade.deleteMany({ where: { course: courses } });
    await prisma.submission.deleteMany({
      where: { assignment: { course: courses } },
    });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    const years = { name: { startsWith: TAG } };
    await prisma.group.deleteMany({ where: { academicYear: years } });
    await prisma.period.deleteMany({ where: { academicYear: years } });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: years });
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
    for (const [key, role, first] of [
      ['tA', 'TEACHER', 'Teacher'],
      ['tB', 'TEACHER', 'Other'],
      ['sA', 'STUDENT', 'Aziz'],
      ['sA2', 'STUDENT', 'Bobur'],
      ['sB', 'STUDENT', 'Bek'],
      ['pA', 'PARENT', 'Parent'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-period-${key}`,
            role,
            passwordHash,
            firstName: first,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-period-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
    await prisma.parentStudent.create({
      data: {
        parentId: id.pA,
        studentId: id.sA,
        relation: 'FATHER',
        createdById: id.tA,
      },
    });

    const quarter = (
      name: string,
      order: number,
      startsAt: string,
      endsAt: string,
    ) => ({
      kind: 'QUARTER' as const,
      name,
      order,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    });
    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2082`,
        startsAt: new Date('2082-09-01'),
        endsAt: new Date('2083-05-31'),
        periods: {
          create: [
            quarter('Quarter 1', 1, '2082-09-02', '2082-10-31'),
            quarter('Quarter 2', 2, '2082-11-09', '2082-12-27'),
          ],
        },
      },
      include: { periods: { orderBy: { order: 'asc' } } },
    });
    [period.q1, period.q2] = year.periods.map((p) => p.id);
    period.otherYear = (
      await prisma.academicYear.create({
        data: {
          name: `${TAG} 2081`,
          startsAt: new Date('2081-09-01'),
          endsAt: new Date('2082-05-31'),
          periods: {
            create: quarter('Quarter 1', 1, '2081-09-02', '2081-10-31'),
          },
        },
        include: { periods: true },
      })
    ).periods[0].id;

    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, students] of [
      ['A', id.tA, [id.sA, id.sA2]],
      ['B', id.tB, [id.sB]],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-PG${key}` },
      });
      course[key] = (
        await prisma.course.create({
          data: {
            academicYearId: year.id,
            groupId: group.id,
            subjectId: subject.id,
            title: `${TAG} ${key}`,
            status: 'ACTIVE',
            teachers: { create: { teacherId } },
            enrollments: {
              create: students.map((studentId) => ({ studentId })),
            },
            gradeCategories: { create: { name: 'Homework', weight: 100 } },
          },
        })
      ).id;
    }
    const category = await prisma.gradeCategory.findFirstOrThrow({
      where: { courseId: course.A },
    });
    const homework = async (
      title: string,
      dueAt: string,
      maxScore: number,
      scores: [Key, number][],
    ) => {
      const row = await prisma.assignment.create({
        data: {
          courseId: course.A,
          categoryId: category.id,
          type: 'HOMEWORK',
          title,
          maxScore,
          dueAt: new Date(dueAt),
          acceptedFileTypes: [],
          publishedAt: new Date(),
          gradesPublishedAt: new Date(),
          createdById: id.tA,
        },
      });
      for (const [student, score] of scores) {
        await prisma.submission.create({
          data: {
            assignmentId: row.id,
            studentId: id[student],
            status: 'GRADED',
            score,
          },
        });
      }
      return row.id;
    };
    q1HomeworkOfA = await homework('Q1 homework', '2082-10-10T07:00:00Z', 20, [
      ['sA', 18],
      ['sA2', 10],
    ]);
    await homework('Q2 homework', '2082-12-01T07:00:00Z', 10, [['sA', 10]]);
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('before publishing: live % for everyone, nothing published, no annual grade', async () => {
    expect(
      (await classQ1()).map((r) => [r.firstName, r.livePercent, r.isPublished]),
    ).toEqual([
      ['Aziz', 90, false],
      ['Bobur', 50, false],
    ]);
    const me = await mine();
    expect(
      me.periods.map((p) => [p.periodName, p.score, p.isPublished]),
    ).toEqual([
      ['Quarter 1', 90, false],
      ['Quarter 2', 100, false],
    ]);
    // Teacher details are hidden from students
    expect(me.periods[0]).toMatchObject({
      livePercent: null,
      computedScore: null,
    });
    expect(me.annual).toMatchObject({ score: null, isPublished: false });
  });

  it('publish: a snapshot that does not move when an assignment grade changes later', async () => {
    await publish(period.q1);
    expect((await mine()).periods[0]).toMatchObject({
      score: 90,
      isPublished: true,
    });

    // The teacher re-grades a Q1 homework after publishing: 18 → 10 (live becomes 50 %)
    await prisma.submission.updateMany({
      where: { assignmentId: q1HomeworkOfA, studentId: id.sA },
      data: { score: 10 },
    });
    expect((await mine()).periods[0].score).toBe(90);
    expect((await classQ1())[0]).toMatchObject({
      livePercent: 50,
      computedScore: 90,
      isOutdated: true,
    });
  });

  it('a manual final score wins, is audited, and survives publishing again', async () => {
    const res = await setFinal(period.q1, 86);
    expect(res.data!.setPeriodFinalScore).toMatchObject({
      score: 86,
      finalScore: 86,
    });
    expect((await mine()).periods[0]).toMatchObject({ score: 86, mark: 5 });

    // Publishing again refreshes the snapshot (now 50 %) but keeps the override
    await publish(period.q1);
    expect((await classQ1())[0]).toMatchObject({
      computedScore: 50,
      finalScore: 86,
      score: 86,
      isOutdated: false,
    });

    // null removes the override → the snapshot shows again
    await setFinal(period.q1, null);
    expect((await mine()).periods[0].score).toBe(50);
    expect(
      await prisma.auditLog.count({
        where: { action: 'periodGrade.override', actorId: id.tA },
      }),
    ).toBe(2);

    expect(code(await setFinal(period.q1, 120))).toBe('BAD_REQUEST');
    expect(code(await setFinal(period.q1, 80, id.sB))).toBe('NOT_FOUND');
  });

  it('annual: the average of the published periods, or a manual override', async () => {
    await publish(period.q2);
    // (50 + 100) / 2
    expect((await mine()).annual).toMatchObject({
      score: 75,
      isPublished: true,
      computedScore: null, // details hidden from the student
    });

    const res = await setFinal(null, 80);
    expect(res.data!.setPeriodFinalScore).toMatchObject({
      periodName: 'Annual',
      score: 80,
      computedScore: 75,
      finalScore: 80,
    });
    expect((await mine('pA')).annual.score).toBe(80);
  });

  // ───────────── isolation: who → which period grades → expected ─────────────
  const table: [string, Key, () => Promise<GqlBody<unknown>>, string][] = [
    [
      'teacher: publish another teacher’s course',
      'tB',
      () => publish(period.q1, 'tB'),
      'NOT_FOUND',
    ],
    ['student: publish', 'sA', () => publish(period.q1, 'sA'), 'FORBIDDEN'],
    [
      'teacher: a period of another year',
      'tA',
      () => publish(period.otherYear),
      'NOT_FOUND',
    ],
    [
      'teacher: class list of another course',
      'tB',
      () => gql(CLASS, { c: course.A, p: period.q1 }, 'tB'),
      'NOT_FOUND',
    ],
    [
      'parent: someone else’s child',
      'pA',
      () => gql(MINE, { c: course.A, s: id.sA2 }, 'pA'),
      'NOT_FOUND',
    ],
    [
      'student: a course of another class',
      'sB',
      () => gql(MINE, { c: course.A }, 'sB'),
      'NOT_FOUND',
    ],
  ];
  it.each(table)('%s → %s', async (_name, _as, run, expected) => {
    expect(code(await run())).toBe(expected);
  });
});
