import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { nextDay, todayInZone } from '../src/libs/utils/date';

// Needs Docker Postgres + Redis. Year "E2E Attend" (Sep 2025 – Aug 2027, so today is inside):
//   course A: teacher tA, active students sA, sA2, sA3, a dropped student sGone, parent pA (of sA)
//   course B: teacher tB, student sB, one lesson
const PASSWORD = 'E2e-Attend-Password-1';
const TAG = 'E2E Attend';
const DAY1 = '2026-10-05';
const DAY2 = '2026-10-07';

type Key = 'tA' | 'tB' | 'sA' | 'sA2' | 'sA3' | 'sGone' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Day {
  isMarked: boolean;
  rows: { firstName: string; status: string; note: string | null }[];
}
interface Mine {
  summary: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    rate: number | null;
  };
  entries: { date: string; status: string }[];
}

describe('Attendance: whole class at once, exceptions only (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Partial<Record<Key, string>>;
  const course = { A: '', B: '' };
  let lessonOfB: string;

  async function gql<T>(query: string, variables: object, as: Key = 'tA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const ROWS = 'isMarked rows { firstName status note }';
  const MARK = `mutation($i: MarkAttendanceInput!) { markAttendance(input: $i) { ${ROWS} } }`;
  const DAY_Q = `query($c: String!, $d: String!) { courseAttendance(courseId: $c, date: $d) { ${ROWS} } }`;
  const MINE = `query($c: String!, $s: String) { myAttendance(courseId: $c, studentId: $s) {
    summary { total present absent excused rate } entries { date status } } }`;
  const mark = (
    date: string,
    records: { studentId: string; status: string; note?: string }[],
    extra: object = {},
    as: Key = 'tA',
  ) =>
    gql<{ markAttendance: Day }>(
      MARK,
      { i: { courseId: course.A, date, records, ...extra } },
      as,
    );
  const statusOf = async (studentId: string, date: string) =>
    (
      await prisma.attendanceRecord.findFirst({
        where: {
          studentId,
          session: { courseId: course.A, date: new Date(date) },
        },
      })
    )?.status;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.attendanceRecord.deleteMany({
      where: { session: { course: courses } },
    });
    await prisma.classSession.deleteMany({ where: { course: courses } });
    await prisma.lesson.deleteMany({ where: { module: { course: courses } } });
    await prisma.module.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
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
    for (const [key, role, first] of [
      ['tA', 'TEACHER', 'Teacher'],
      ['tB', 'TEACHER', 'Other'],
      ['sA', 'STUDENT', 'Aziz'],
      ['sA2', 'STUDENT', 'Bobur'],
      ['sA3', 'STUDENT', 'Dilnoza'],
      ['sGone', 'STUDENT', 'Gone'],
      ['sB', 'STUDENT', 'Bek'],
      ['pA', 'PARENT', 'Parent'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-attend-${key}`,
            role,
            passwordHash,
            firstName: first,
            lastName: TAG,
          },
        })
      ).id;
      if (!['sA3', 'sGone'].includes(key)) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ loginId: `e2e-attend-${key}`, password: PASSWORD });
        token[key] = (res.body as { accessToken: string }).accessToken;
      }
    }
    await prisma.parentStudent.create({
      data: {
        parentId: id.pA,
        studentId: id.sA,
        relation: 'MOTHER',
        createdById: id.tA,
      },
    });

    const year = await prisma.academicYear.create({
      data: {
        name: TAG,
        startsAt: new Date('2025-09-01'),
        endsAt: new Date('2027-08-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, enrollments] of [
      [
        'A',
        id.tA,
        [
          { studentId: id.sA },
          { studentId: id.sA2 },
          { studentId: id.sA3 },
          { studentId: id.sGone, status: 'DROPPED' as const },
        ],
      ],
      ['B', id.tB, [{ studentId: id.sB }]],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-AT${key}` },
      });
      const row = await prisma.course.create({
        data: {
          academicYearId: year.id,
          groupId: group.id,
          subjectId: subject.id,
          title: `${TAG} ${key}`,
          status: 'ACTIVE',
          teachers: { create: { teacherId } },
          enrollments: { create: [...enrollments] },
          modules: {
            create: {
              title: 'Week 1',
              order: 1,
              lessons: { create: { title: 'L1', type: 'READING', order: 1 } },
            },
          },
        },
        include: { modules: { include: { lessons: true } } },
      });
      course[key] = row.id;
      if (key === 'B') lessonOfB = row.modules[0].lessons[0].id;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('before marking: the whole active roster, everyone PRESENT, not marked yet', async () => {
    const res = await gql<{ courseAttendance: Day }>(DAY_Q, {
      c: course.A,
      d: DAY1,
    });
    expect(res.data!.courseAttendance).toEqual({
      isMarked: false,
      rows: [
        { firstName: 'Aziz', status: 'PRESENT', note: null },
        { firstName: 'Bobur', status: 'PRESENT', note: null },
        { firstName: 'Dilnoza', status: 'PRESENT', note: null },
      ],
    });
  });

  it('markAttendance: only the exceptions are sent; sending again updates the same day', async () => {
    const res = await mark(DAY1, [
      { studentId: id.sA2, status: 'ABSENT' },
      { studentId: id.sA3, status: 'LATE', note: 'Bus was late' },
    ]);
    expect(res.data!.markAttendance).toEqual({
      isMarked: true,
      rows: [
        { firstName: 'Aziz', status: 'PRESENT', note: null },
        { firstName: 'Bobur', status: 'ABSENT', note: null },
        { firstName: 'Dilnoza', status: 'LATE', note: 'Bus was late' },
      ],
    });

    await mark(DAY1, [
      { studentId: id.sA2, status: 'EXCUSED', note: 'Note from parent' },
    ]);
    expect(await statusOf(id.sA2, DAY1)).toBe('EXCUSED');
    // Dilnoza is not in the new list → back to PRESENT
    expect(await statusOf(id.sA3, DAY1)).toBe('PRESENT');
    expect(
      await prisma.classSession.count({ where: { courseId: course.A } }),
    ).toBe(1);
  });

  it('every student id in the array is checked; a bad one saves nothing', async () => {
    const withForeign = [
      { studentId: id.sA2, status: 'ABSENT' },
      { studentId: id.sB, status: 'ABSENT' },
    ];
    expect(code(await mark(DAY1, withForeign))).toBe('BAD_REQUEST');
    expect(await statusOf(id.sA2, DAY1)).toBe('EXCUSED');

    expect(
      code(await mark(DAY1, [{ studentId: id.sGone, status: 'ABSENT' }])),
    ).toBe('BAD_REQUEST');
    expect(
      code(
        await mark(DAY1, [
          { studentId: id.sA, status: 'ABSENT' },
          { studentId: id.sA, status: 'LATE' },
        ]),
      ),
    ).toBe('BAD_REQUEST');
  });

  it('refuses a future day, a day outside the year, another course’s lesson and strangers', async () => {
    const tomorrow = nextDay(todayInZone('Asia/Tashkent'));
    expect(code(await mark(tomorrow, []))).toBe('BAD_REQUEST');
    expect(code(await mark('2025-08-01', []))).toBe('BAD_REQUEST');
    expect(code(await mark(DAY1, [], { lessonId: lessonOfB }))).toBe(
      'NOT_FOUND',
    );
    expect(code(await mark(DAY1, [], {}, 'tB'))).toBe('NOT_FOUND');
    expect(code(await mark(DAY1, [], {}, 'sA'))).toBe('FORBIDDEN');
    expect(code(await gql(DAY_Q, { c: course.A, d: DAY1 }, 'tB'))).toBe(
      'NOT_FOUND',
    );
  });

  it('myAttendance: summary and rate; an excused absence does not lower the rate', async () => {
    await mark(DAY2, [{ studentId: id.sA, status: 'ABSENT' }]);
    const aziz = (
      await gql<{ myAttendance: Mine }>(MINE, { c: course.A }, 'sA')
    ).data!.myAttendance;
    expect(aziz.summary).toEqual({
      total: 2,
      present: 1,
      absent: 1,
      excused: 0,
      rate: 50,
    });
    expect(aziz.entries.map((e) => [e.date, e.status])).toEqual([
      [DAY2, 'ABSENT'],
      [DAY1, 'PRESENT'],
    ]);

    // Bobur: excused + present = 100 %
    const bobur = (
      await gql<{ myAttendance: Mine }>(MINE, { c: course.A }, 'sA2')
    ).data!.myAttendance;
    expect(bobur.summary).toMatchObject({ excused: 1, rate: 100 });
  });

  // ───────────── isolation: who → whose attendance → expected ─────────────
  const table: [string, Key, () => object, string][] = [
    ['parent: the child', 'pA', () => ({ c: course.A }), 'OK'],
    [
      'parent: someone else’s child',
      'pA',
      () => ({ c: course.A, s: id.sA2 }),
      'NOT_FOUND',
    ],
    [
      'student: a course of another class',
      'sB',
      () => ({ c: course.A }),
      'NOT_FOUND',
    ],
    ['teacher: the student view', 'tA', () => ({ c: course.A }), 'FORBIDDEN'],
  ];
  it.each(table)('%s → %s', async (_name, as, vars, expected) => {
    expect(code(await gql(MINE, vars(), as)) ?? 'OK').toBe(expected);
  });
});
