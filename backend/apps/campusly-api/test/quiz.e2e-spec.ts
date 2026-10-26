import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Year "E2E Quiz 2088": course A (teacher tA, student sA,
// parent pA) and course B (teacher tB, student sB). Everything is removed after.
const PASSWORD = 'E2e-Quiz-Password-1';
const TAG = 'E2E Quiz';

type Key = 'tA' | 'tB' | 'sA' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface MyQuizData {
  state: string;
  canStart: boolean;
  startedAt: string | null;
  deadlineAt: string | null;
  questions: {
    id: string;
    type: string;
    options: string[];
    myChoice: number | null;
  }[];
}

const MY_QUIZ_FIELDS =
  'state canStart startedAt deadlineAt questionCount totalPoints questions { id type text options myChoice myNumber }';
const QUESTIONS = [
  {
    type: 'MULTIPLE_CHOICE',
    text: '2 + 2 = ?',
    points: 4,
    options: ['3', '4', '5'],
    correctOption: 1,
  },
  {
    type: 'TRUE_FALSE',
    text: 'The sky is green.',
    points: 3,
    correctOption: 0,
  },
  {
    type: 'NUMBER',
    text: 'Half of 7?',
    points: 3,
    correctNumber: 3.5,
    tolerance: 0.01,
  },
];

describe('Quizzes: editor, one timed attempt, auto-grade, results (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '' };
  let quiz = '';

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const createQuiz = async (extra: object = {}) => {
    const res = await gql<{
      createAssignment: { id: string; timeLimitMin: number };
    }>(
      `mutation($i: CreateAssignmentInput!) { createAssignment(input: $i) { id timeLimitMin } }`,
      {
        i: {
          courseId: course.A,
          type: 'QUIZ',
          title: 'Quiz',
          maxScore: 1,
          timeLimitMin: 10,
          dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          ...extra,
        },
      },
      'tA',
    );
    return res.data!.createAssignment;
  };
  const setQuestions = (assignmentId: string, as: Key = 'tA') =>
    gql<{
      setQuizQuestions: {
        locked: boolean;
        questions: { correctOption: number | null }[];
      };
    }>(
      `mutation($i: SetQuizQuestionsInput!) { setQuizQuestions(input: $i) { locked questions { correctOption } } }`,
      { i: { assignmentId, questions: QUESTIONS } },
      as,
    );
  const publish = (assignmentId: string) =>
    gql(
      `mutation($i: PublishInput!) { publishAssignment(input: $i) { id } }`,
      { i: { id: assignmentId, publish: true } },
      'tA',
    );
  const myQuiz = (assignmentId: string, as: Key = 'sA') =>
    gql<{ myQuiz: MyQuizData }>(
      `query($a: String!) { myQuiz(assignmentId: $a) { ${MY_QUIZ_FIELDS} } }`,
      { a: assignmentId },
      as,
    );
  const start = (assignmentId: string, as: Key = 'sA') =>
    gql<{ startQuiz: MyQuizData }>(
      `mutation($a: String!) { startQuiz(assignmentId: $a) { ${MY_QUIZ_FIELDS} } }`,
      { a: assignmentId },
      as,
    );
  const save = (input: object, as: Key = 'sA') =>
    gql<{ saveQuizAnswer: boolean }>(
      `mutation($i: SaveQuizAnswerInput!) { saveQuizAnswer(input: $i) }`,
      { i: input },
      as,
    );
  const RESULT = `query($a: String!, $s: String) { quizResult(assignmentId: $a, studentId: $s) { score maxScore items { type isCorrect earned correctOption myChoice } } }`;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    const ofCourses = { assignment: { course: courses } };
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.quizAnswer.deleteMany({ where: { attempt: ofCourses } });
    await prisma.quizAttempt.deleteMany({ where: ofCourses });
    await prisma.quizQuestion.deleteMany({ where: ofCourses });
    await prisma.submissionAttempt.deleteMany({
      where: { submission: ofCourses },
    });
    await prisma.submission.deleteMany({ where: ofCourses });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2088` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2088` } });
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
      ['tA', 'TEACHER'],
      ['tB', 'TEACHER'],
      ['sA', 'STUDENT'],
      ['sB', 'STUDENT'],
      ['pA', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-quiz-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-quiz-${key}`, password: PASSWORD });
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
        name: `${TAG} 2088`,
        startsAt: new Date('2088-09-01'),
        endsAt: new Date('2089-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, studentId] of [
      ['A', id.tA, id.sA],
      ['B', id.tB, id.sB],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-QZ${key}` },
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
            enrollments: { create: { studentId } },
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
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('the teacher writes the questions; the quiz is worth their sum', async () => {
    const created = await createQuiz();
    quiz = created.id;
    expect(created.timeLimitMin).toBe(10);

    const res = await setQuestions(quiz);
    expect(res.data!.setQuizQuestions).toMatchObject({ locked: false });
    const row = await prisma.assignment.findUniqueOrThrow({
      where: { id: quiz },
    });
    expect(Number(row.maxScore)).toBe(10);
  });

  it('a teacher of another course cannot read or change the questions (foreign user)', async () => {
    expect(
      code(
        await gql(
          `query($a: String!) { quizEditor(assignmentId: $a) { locked } }`,
          { a: quiz },
          'tB',
        ),
      ),
    ).toBe('NOT_FOUND');
    expect(code(await setQuestions(quiz, 'tB'))).toBe('NOT_FOUND');
  });

  it('students see a draft as not found, then a startable quiz without its answers', async () => {
    expect(code(await myQuiz(quiz))).toBe('NOT_FOUND');
    await publish(quiz);
    const res = await myQuiz(quiz);
    expect(res.data!.myQuiz).toMatchObject({
      state: 'NOT_STARTED',
      canStart: true,
      questions: [],
    });
    // A student of another course: the quiz does not exist for them
    expect(code(await myQuiz(quiz, 'sB'))).toBe('NOT_FOUND');
    expect(code(await start(quiz, 'sB'))).toBe('NOT_FOUND');
  });

  it('start: one attempt, a server deadline, shuffled questions with no right answers', async () => {
    const res = await start(quiz);
    const q = res.data!.startQuiz;
    expect(q.state).toBe('IN_PROGRESS');
    expect(q.questions).toHaveLength(3);
    expect(JSON.stringify(q)).not.toMatch(/correct/i);
    const minutes =
      (Date.parse(q.deadlineAt!) - Date.parse(q.startedAt!)) / 60_000;
    expect(minutes).toBeCloseTo(10, 5);

    // A second Start returns the same attempt
    const again = await start(quiz);
    expect(again.data!.startQuiz.startedAt).toBe(q.startedAt);

    // The questions are locked now
    expect(code(await setQuestions(quiz))).toBe('QUIZ_LOCKED');
  });

  it('answers are saved one by one; another student cannot answer this attempt', async () => {
    const res = await myQuiz(quiz);
    const questions = res.data!.myQuiz.questions;
    const mcq = questions.find((x) => x.type === 'MULTIPLE_CHOICE')!;
    const tfq = questions.find((x) => x.type === 'TRUE_FALSE')!;
    const numq = questions.find((x) => x.type === 'NUMBER')!;

    // The right answer "4" at the position this student sees it
    const rightPosition = mcq.options.indexOf('4');
    expect(
      (
        await save({
          assignmentId: quiz,
          questionId: mcq.id,
          choice: rightPosition,
        })
      ).data!.saveQuizAnswer,
    ).toBe(true);
    await save({ assignmentId: quiz, questionId: tfq.id, choice: 0 });
    await save({ assignmentId: quiz, questionId: numq.id, number: 4 }); // wrong: 3.5 ± 0.01

    const saved = await myQuiz(quiz);
    expect(
      saved.data!.myQuiz.questions.find((x) => x.id === mcq.id)!.myChoice,
    ).toBe(rightPosition);

    expect(
      code(
        await save({ assignmentId: quiz, questionId: mcq.id, choice: 0 }, 'sB'),
      ),
    ).toBe('NOT_FOUND');
  });

  it('submit grades it into the Submission; the result stays hidden until grades are published', async () => {
    const res = await gql<{ submitQuiz: MyQuizData }>(
      `mutation($a: String!) { submitQuiz(assignmentId: $a) { state } }`,
      { a: quiz },
      'sA',
    );
    expect(res.data!.submitQuiz.state).toBe('SUBMITTED');

    const submission = await prisma.submission.findUniqueOrThrow({
      where: {
        assignmentId_studentId: { assignmentId: quiz, studentId: id.sA },
      },
    });
    expect(submission.status).toBe('GRADED');
    expect(Number(submission.score)).toBe(7); // MC 4 + TF 3, the number was wrong

    expect(code(await gql(RESULT, { a: quiz }, 'sA'))).toBe('NOT_FOUND');
    const teacherView = await gql<{ quizResult: { score: number } }>(
      RESULT,
      { a: quiz, s: id.sA },
      'tA',
    );
    expect(teacherView.data!.quizResult.score).toBe(7);

    // After the end, answers are refused
    const mc = (
      await prisma.quizQuestion.findFirstOrThrow({
        where: { assignmentId: quiz, type: 'MULTIPLE_CHOICE' },
      })
    ).id;
    expect(
      code(await save({ assignmentId: quiz, questionId: mc, choice: 0 })),
    ).toBe('QUIZ_TIME_UP');
  });

  it('after publishing, the student and the parent see right / wrong and the right answers', async () => {
    await gql(
      `mutation($i: PublishGradesInput!) { publishGrades(input: $i) { id } }`,
      { i: { assignmentId: quiz, publish: true } },
      'tA',
    );
    const mine = await gql<{
      quizResult: {
        score: number;
        maxScore: number;
        items: {
          type: string;
          isCorrect: boolean;
          correctOption: number | null;
        }[];
      };
    }>(RESULT, { a: quiz }, 'sA');
    expect(mine.data!.quizResult).toMatchObject({ score: 7, maxScore: 10 });
    const mcItem = mine.data!.quizResult.items.find(
      (i) => i.type === 'MULTIPLE_CHOICE',
    )!;
    expect(mcItem).toMatchObject({ isCorrect: true, correctOption: 1 });

    const parent = await gql<{ quizResult: { score: number } }>(
      RESULT,
      { a: quiz, s: id.sA },
      'pA',
    );
    expect(parent.data!.quizResult.score).toBe(7);
    // A student of another course has no result here
    expect(code(await gql(RESULT, { a: quiz }, 'sB'))).toBe('NOT_FOUND');
  });

  it('when time runs out, the saved answers are graded and later answers are refused', async () => {
    const second = (await createQuiz({ title: 'Quiz 2' })).id;
    await setQuestions(second);
    await publish(second);
    const started = await start(second);
    const tfq = started.data!.startQuiz.questions.find(
      (x) => x.type === 'TRUE_FALSE',
    )!;
    await save({ assignmentId: second, questionId: tfq.id, choice: 0 });

    // The deadline passed a minute ago
    await prisma.quizAttempt.updateMany({
      where: { assignmentId: second, studentId: id.sA },
      data: { deadlineAt: new Date(Date.now() - 60_000) },
    });
    expect(
      code(await save({ assignmentId: second, questionId: tfq.id, choice: 1 })),
    ).toBe('QUIZ_TIME_UP');
    const submission = await prisma.submission.findUniqueOrThrow({
      where: {
        assignmentId_studentId: { assignmentId: second, studentId: id.sA },
      },
    });
    expect(Number(submission.score)).toBe(3); // only the true/false answer was saved in time
  });

  it('a quiz cannot be started after its due date', async () => {
    const late = (
      await createQuiz({
        title: 'Quiz 3',
        dueAt: new Date(Date.now() - 3_600_000).toISOString(),
      })
    ).id;
    await setQuestions(late);
    await publish(late);
    expect((await myQuiz(late)).data!.myQuiz.canStart).toBe(false);
    expect(code(await start(late))).toBe('QUIZ_CLOSED');
  });
});
