import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { SchoolService } from '../src/components/school/school.service';
import { PrismaService } from '../src/database/prisma.service';
import { toMark } from '../src/libs/utils/grade';

// Needs Docker Postgres + Redis. Year "E2E Quarter 2085" with Quarter 1 (2 Sep – 31 Oct).
//   course A: teacher tA, students sA and sA2, parent pA (of sA); categories 30 / 30 / 40
//   course B: teacher tB, student sB
// The numbers are the DECISIONS example: Homework 27/30, Exams 34/50, Quizzes not published.
const PASSWORD = 'E2e-Quarter-Password-1';
const TAG = 'E2E Quarter';

type Key = 'tA' | 'tB' | 'sA' | 'sA2' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Grade {
  firstName: string;
  percent: number | null;
  mark: number | null;
  categories: { name: string; percent: number | null; count: number }[];
  items: { title: string; score: number; status: string }[];
}

describe('Quarter grades: weighted, published only, school timezone (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '' };
  let q1: string;
  let otherYearPeriod: string;
  let markOf: (percent: number) => number | null;

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const FIELDS =
    'firstName percent mark categories { name percent count } items { title score status }';
  const CLASS = `query($c: String!, $p: String!) { courseGrades(courseId: $c, periodId: $p) { ${FIELDS} } }`;
  const MINE = `query($c: String!, $p: String!, $s: String) { myCourseGrade(courseId: $c, periodId: $p, studentId: $s) { ${FIELDS} } }`;

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

    const settings = await app.get(SchoolService).getSettings();
    // The boundary cases below are written for UTC+5
    expect(settings.timezone).toBe('Asia/Tashkent');
    markOf = (percent) => toMark(percent, settings);

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
            loginId: `e2e-quarter-${key}`,
            role,
            passwordHash,
            firstName: first,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-quarter-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
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
        name: `${TAG} 2085`,
        startsAt: new Date('2085-09-01'),
        endsAt: new Date('2086-05-31'),
        periods: {
          create: {
            kind: 'QUARTER',
            name: 'Quarter 1',
            order: 1,
            startsAt: new Date('2085-09-02'),
            endsAt: new Date('2085-10-31'),
          },
        },
      },
      include: { periods: true },
    });
    q1 = year.periods[0].id;
    otherYearPeriod = (
      await prisma.academicYear.create({
        data: {
          name: `${TAG} 2084`,
          startsAt: new Date('2084-09-01'),
          endsAt: new Date('2085-05-31'),
          periods: {
            create: {
              kind: 'QUARTER',
              name: 'Quarter 1',
              order: 1,
              startsAt: new Date('2084-09-02'),
              endsAt: new Date('2084-10-31'),
            },
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
        data: { academicYearId: year.id, name: `E2E-Q${key}` },
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
            gradeCategories: {
              create: [
                { name: 'Homework', weight: 30, order: 0 },
                { name: 'Quizzes', weight: 30, order: 1 },
                { name: 'Exams', weight: 40, order: 2 },
              ],
            },
          },
        })
      ).id;
    }

    const cats = await prisma.gradeCategory.findMany({
      where: { courseId: course.A },
    });
    const cat = (name: string) => cats.find((c) => c.name === name)!.id;
    const published = new Date();
    const assignment = async (
      title: string,
      category: string,
      maxScore: number,
      dueAt: string | null,
      scores: [Key, number, ('GRADED' | 'MISSING')?][],
      gradesPublished = true,
    ) => {
      const row = await prisma.assignment.create({
        data: {
          courseId: course.A,
          categoryId: cat(category),
          type: category === 'Exams' ? 'EXAM' : 'HOMEWORK',
          title,
          maxScore,
          dueAt: dueAt ? new Date(dueAt) : null,
          acceptedFileTypes: [],
          publishedAt: published,
          gradesPublishedAt: gradesPublished ? published : null,
          createdById: id.tA,
        },
      });
      for (const [student, score, status] of scores) {
        await prisma.submission.create({
          data: {
            assignmentId: row.id,
            studentId: id[student],
            status: status ?? 'GRADED',
            score,
          },
        });
      }
    };
    await assignment('HW 1', 'Homework', 20, '2085-09-10T13:00:00Z', [
      ['sA', 18],
      ['sA2', 10],
    ]);
    // 31 Oct 23:59 in Tashkent: still Quarter 1
    await assignment('HW 2', 'Homework', 10, '2085-10-31T18:59:00Z', [
      ['sA', 9],
      ['sA2', 0, 'MISSING'],
    ]);
    await assignment('Exam', 'Exams', 50, '2085-10-20T06:00:00Z', [['sA', 34]]);
    // Not counted: grades not published / 1 Nov 03:00 in Tashkent / no due date
    await assignment(
      'Quiz',
      'Quizzes',
      20,
      '2085-10-01T06:00:00Z',
      [['sA', 20]],
      false,
    );
    await assignment('HW 3', 'Homework', 10, '2085-10-31T22:00:00Z', [
      ['sA', 0],
    ]);
    await assignment('No due date', 'Homework', 10, null, [['sA', 0]]);
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('teacher: the whole class, weighted, published grades of the quarter only', async () => {
    const res = await gql<{ courseGrades: Grade[] }>(
      CLASS,
      { c: course.A, p: q1 },
      'tA',
    );
    const [aziz, bobur] = res.data!.courseGrades;

    // Homework 27/30 = 90 %, Exams 34/50 = 68 %, Quizzes not published → skipped
    expect(aziz).toMatchObject({ firstName: 'Aziz', percent: 77.43 });
    expect(aziz.mark).toBe(markOf(77.43));
    expect(aziz.categories).toEqual([
      { name: 'Homework', percent: 90, count: 2 },
      { name: 'Quizzes', percent: null, count: 0 },
      { name: 'Exams', percent: 68, count: 1 },
    ]);
    expect(aziz.items.map((i) => i.title)).toEqual(['HW 1', 'Exam', 'HW 2']);

    // A zero for missing work counts: 10/30
    expect(bobur).toMatchObject({ firstName: 'Bobur', percent: 33.33 });
    expect(bobur.items.map((i) => [i.title, i.status])).toEqual([
      ['HW 1', 'GRADED'],
      ['HW 2', 'MISSING'],
    ]);
  });

  it('student and parent see the same number as the teacher', async () => {
    for (const as of ['sA', 'pA'] as const) {
      const res = await gql<{ myCourseGrade: Grade }>(
        MINE,
        { c: course.A, p: q1 },
        as,
      );
      expect(res.data!.myCourseGrade).toMatchObject({
        firstName: 'Aziz',
        percent: 77.43,
      });
    }
  });

  // ───────────── isolation: who → which grades → expected ─────────────
  const table: [string, Key, string, () => object, string][] = [
    [
      'teacher: another teacher’s class',
      'tB',
      CLASS,
      () => ({ c: course.A, p: q1 }),
      'NOT_FOUND',
    ],
    [
      'student: the class grade list',
      'sA',
      CLASS,
      () => ({ c: course.A, p: q1 }),
      'FORBIDDEN',
    ],
    [
      'student: a course of another class',
      'sB',
      MINE,
      () => ({ c: course.A, p: q1 }),
      'NOT_FOUND',
    ],
    [
      'parent: someone else’s child',
      'pA',
      MINE,
      () => ({ c: course.A, p: q1, s: id.sA2 }),
      'NOT_FOUND',
    ],
    [
      'teacher: the student view',
      'tA',
      MINE,
      () => ({ c: course.A, p: q1 }),
      'FORBIDDEN',
    ],
    [
      'teacher: a period of another year',
      'tA',
      CLASS,
      () => ({ c: course.A, p: otherYearPeriod }),
      'NOT_FOUND',
    ],
  ];
  it.each(table)('%s → %s', async (_name, as, query, vars, expected) => {
    expect(code(await gql(query, vars(), as))).toBe(expected);
  });
});
