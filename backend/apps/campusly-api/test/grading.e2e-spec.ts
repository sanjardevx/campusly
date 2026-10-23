import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Year "E2E Grade 2086":
//   course A: teacher tA, active students sA (submitted hw), sA2, sA3, and sGone (dropped)
//   course B: teacher tB, student sB
// Course A: hw (past due, 1 attempt), exam (offline), future (not due yet).
const PASSWORD = 'E2e-Grade-Password-1';
const TAG = 'E2E Grade';
const DAY = 86_400_000;

type Key = 'tA' | 'tB' | 'sA' | 'sA2' | 'sA3' | 'sGone' | 'sB';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Sub {
  status: string;
  score: number | null;
  feedback: string | null;
  attemptsLeft: number;
  gradedByName: string | null;
}

describe('Grading: gradebook, grade, return, zeros, publish (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Partial<Record<Key, string>>;
  const a = { hw: '', exam: '', future: '' };

  async function gql<T>(query: string, variables: object, as: Key = 'tA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const SUB = 'status score feedback attemptsLeft gradedByName';
  const BOOK = `query($a: String!) { assignmentSubmissions(assignmentId: $a) { firstName submission { ${SUB} } } }`;
  const GRADE = `mutation($i: GradeSubmissionInput!) { gradeSubmission(input: $i) { ${SUB} } }`;
  const RETURN = `mutation($i: ReturnSubmissionInput!) { returnSubmission(input: $i) { ${SUB} } }`;
  const ZERO = `mutation($a: String!) { giveZeroToMissing(assignmentId: $a) }`;
  const PUBLISH = `mutation($i: PublishGradesInput!) { publishGrades(input: $i) { gradesPublishedAt } }`;
  const MINE = `query($a: String!) { mySubmission(assignmentId: $a) { ${SUB} } }`;
  const SUBMIT = `mutation($i: SubmitAssignmentInput!) { submitAssignment(input: $i) { ${SUB} } }`;

  const grade = (
    studentId: string,
    score: number,
    as: Key = 'tA',
    assignmentId = a.hw,
  ) =>
    gql<{ gradeSubmission: Sub }>(
      GRADE,
      { i: { assignmentId, studentId, score, feedback: `Score ${score}` } },
      as,
    );
  const mine = async (as: Key) =>
    (await gql<{ mySubmission: Sub | null }>(MINE, { a: a.hw }, as)).data!
      .mySubmission;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    const subs = { assignment: { course: courses } };
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.submissionAttempt.deleteMany({ where: { submission: subs } });
    await prisma.submission.deleteMany({ where: subs });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2086` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2086` } });
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
    // Last names decide the gradebook order: sA < sA2 < sA3
    for (const [key, role, first] of [
      ['tA', 'TEACHER', 'Teacher'],
      ['tB', 'TEACHER', 'Other'],
      ['sA', 'STUDENT', 'Aziz'],
      ['sA2', 'STUDENT', 'Bobur'],
      ['sA3', 'STUDENT', 'Dilnoza'],
      ['sGone', 'STUDENT', 'Gone'],
      ['sB', 'STUDENT', 'Bek'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-grade-${key}`,
            role,
            passwordHash,
            firstName: first,
            lastName: TAG,
          },
        })
      ).id;
      if (['tA', 'tB', 'sA', 'sA2'].includes(key)) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ loginId: `e2e-grade-${key}`, password: PASSWORD });
        token[key] = (res.body as { accessToken: string }).accessToken;
      }
    }

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2086`,
        startsAt: new Date('2086-09-01'),
        endsAt: new Date('2087-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const courseIds: string[] = [];
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
        data: { academicYearId: year.id, name: `E2E-GR${key}` },
      });
      courseIds.push(
        (
          await prisma.course.create({
            data: {
              academicYearId: year.id,
              groupId: group.id,
              subjectId: subject.id,
              title: `${TAG} ${key}`,
              status: 'ACTIVE',
              teachers: { create: { teacherId } },
              enrollments: { create: [...enrollments] },
              gradeCategories: { create: { name: 'Homework', weight: 100 } },
            },
          })
        ).id,
      );
    }
    const category = await prisma.gradeCategory.findFirstOrThrow({
      where: { courseId: courseIds[0] },
    });
    const make = async (
      title: string,
      type: 'HOMEWORK' | 'EXAM',
      dueAt: Date,
    ) =>
      (
        await prisma.assignment.create({
          data: {
            courseId: courseIds[0],
            categoryId: category.id,
            type,
            title,
            maxScore: 20,
            dueAt,
            maxAttempts: type === 'EXAM' ? 0 : 1,
            acceptedFileTypes: [],
            publishedAt: new Date(Date.now() - 2 * DAY),
            createdById: id.tA,
          },
        })
      ).id;
    a.hw = await make('Homework', 'HOMEWORK', new Date(Date.now() - DAY));
    a.exam = await make('Exam', 'EXAM', new Date(Date.now() - DAY));
    a.future = await make('Future', 'HOMEWORK', new Date(Date.now() + DAY));

    // sA handed in the homework (one attempt)
    await prisma.submission.create({
      data: {
        assignmentId: a.hw,
        studentId: id.sA,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        attempts: { create: { number: 1, text: 'my answer' } },
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('gradebook: every active student in name order, dropped ones left out; teachers of the course only', async () => {
    const res = await gql<{
      assignmentSubmissions: { firstName: string; submission: Sub | null }[];
    }>(BOOK, { a: a.hw });
    expect(
      res.data!.assignmentSubmissions.map((r) => [
        r.firstName,
        r.submission?.status ?? null,
      ]),
    ).toEqual([
      ['Aziz', 'SUBMITTED'],
      ['Bobur', null],
      ['Dilnoza', null],
    ]);
    expect(code(await gql(BOOK, { a: a.hw }, 'tB'))).toBe('NOT_FOUND');
    expect(code(await gql(BOOK, { a: a.hw }, 'sA'))).toBe('FORBIDDEN');
  });

  it('gradeSubmission: 0 … maxScore, only students of the course, every change audited', async () => {
    expect((await grade(id.sA, 18)).data!.gradeSubmission).toMatchObject({
      status: 'GRADED',
      score: 18,
      feedback: 'Score 18',
      // "Last modified by …" on the grading page
      gradedByName: `Teacher ${TAG}`,
    });
    expect(code(await grade(id.sA, 25))).toBe('BAD_REQUEST');
    expect(code(await grade(id.sB, 10))).toBe('NOT_FOUND');
    expect(code(await grade(id.sGone, 10))).toBe('NOT_FOUND');
    expect(code(await grade(id.sA, 10, 'tB'))).toBe('NOT_FOUND');

    await grade(id.sA, 19);
    const log = await prisma.auditLog.findMany({
      where: { action: 'submission.grade', actorId: id.tA },
      orderBy: { createdAt: 'asc' },
      select: { before: true, after: true },
    });
    expect(log.map((l) => [l.before, l.after])).toEqual([
      [
        { status: 'SUBMITTED', score: null },
        { status: 'GRADED', score: '18' },
      ],
      [
        { status: 'GRADED', score: '18' },
        { status: 'GRADED', score: '19' },
      ],
    ]);
  });

  it('an offline exam is graded without any submission', async () => {
    const res = await grade(id.sA2, 15, 'tA', a.exam);
    expect(res.data!.gradeSubmission).toMatchObject({
      status: 'GRADED',
      score: 15,
    });
  });

  it('the student sees the grade only while it is published', async () => {
    expect(await mine('sA')).toMatchObject({
      status: 'SUBMITTED',
      score: null,
      feedback: null,
      gradedByName: null,
    });
    await gql(PUBLISH, { i: { assignmentId: a.hw, publish: true } });
    expect(await mine('sA')).toMatchObject({ status: 'GRADED', score: 19 });
    // A mistake: hidden again
    await gql(PUBLISH, { i: { assignmentId: a.hw, publish: false } });
    expect((await mine('sA'))!.score).toBeNull();
  });

  it('returnSubmission: "please redo" gives one more attempt even when all were used', async () => {
    expect((await mine('sA'))!.attemptsLeft).toBe(0);
    const res = await gql<{ returnSubmission: Sub }>(RETURN, {
      i: { assignmentId: a.hw, studentId: id.sA, feedback: 'Show your steps' },
    });
    expect(res.data!.returnSubmission).toMatchObject({
      status: 'RETURNED',
      score: null,
      feedback: 'Show your steps',
      attemptsLeft: 1,
    });
    // Nothing submitted yet → nothing to return
    expect(
      code(await gql(RETURN, { i: { assignmentId: a.hw, studentId: id.sA3 } })),
    ).toBe('NOT_FOUND');

    const again = await gql<{ submitAssignment: Sub }>(
      SUBMIT,
      { i: { assignmentId: a.hw, text: 'with steps' } },
      'sA',
    );
    expect(again.data!.submitAssignment).toMatchObject({
      status: 'LATE',
      attemptsLeft: 0,
    });
  });

  it('giveZeroToMissing: after the deadline, only students with nothing; hidden until published', async () => {
    expect(code(await gql(ZERO, { a: a.future }))).toBe('BAD_REQUEST');

    const res = await gql<{ giveZeroToMissing: number }>(ZERO, { a: a.hw });
    expect(res.data!.giveZeroToMissing).toBe(2); // sA2 and sA3 (sA submitted, sGone left)
    const missing = await prisma.submission.findUniqueOrThrow({
      where: {
        assignmentId_studentId: { assignmentId: a.hw, studentId: id.sA2 },
      },
    });
    expect(missing).toMatchObject({ status: 'MISSING' });
    expect(Number(missing.score)).toBe(0);

    // Before publishing, the student does not learn about the zero
    expect(await mine('sA2')).toMatchObject({ status: 'DRAFT', score: null });
    // A second run changes nobody
    expect(
      (await gql<{ giveZeroToMissing: number }>(ZERO, { a: a.hw })).data!
        .giveZeroToMissing,
    ).toBe(0);
  });
});
