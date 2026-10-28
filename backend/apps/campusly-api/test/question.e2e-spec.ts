import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Year "E2E Question": course A (teacher tA, students sA + sA2,
// parent pA of sA), course B (teacher tB, student sB), archived course D (teacher tA, student sA).
// Each course has one published lesson in a published week.
const PASSWORD = 'E2e-Question-Password-1';
const TAG = 'E2E Question';

type Key = 'admin' | 'tA' | 'tB' | 'sA' | 'sA2' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Question {
  id: string;
  title: string;
  isMine: boolean;
  isPrivate: boolean;
  isPinned: boolean;
  isAnswered: boolean;
  isResolved: boolean;
  lessonTitle: string | null;
  authorLoginId: string | null;
  replies: number;
  staffReplies: number;
}
interface Thread {
  question: Question;
  answers: { id: string; body: string; isStaff: boolean; isMine: boolean }[];
  canModerate: boolean;
}
interface List {
  list: Question[];
  total: number;
  all: number;
  mine: number;
  answered: number;
  unanswered: number;
}

describe('Course Q&A: who asks, who sees, who replies, who moderates (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '', D: '' };
  const lesson = { A: '', B: '', D: '' };
  const q = { open: '', secret: '' };

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0]?.extensions.code;

  const FIELDS =
    'id title isMine isPrivate isPinned isAnswered isResolved lessonTitle authorLoginId replies staffReplies';
  const THREAD = `question { ${FIELDS} } answers { id body isStaff isMine } canModerate`;
  const ASK = `mutation($i: AskQuestionInput!) { askQuestion(input: $i) { ${FIELDS} } }`;
  const LIST = `query($i: CourseQuestionsInquiry) { courseQuestions(input: $i) { total all mine answered unanswered list { ${FIELDS} } } }`;
  const GET = `query($id: String!) { courseQuestion(id: $id) { ${THREAD} } }`;
  const ANSWER = `mutation($i: AnswerQuestionInput!) { answerQuestion(input: $i) { ${THREAD} } }`;
  const PIN = `mutation($id: String!, $p: Boolean!) { setQuestionPinned(id: $id, pinned: $p) { ${THREAD} } }`;
  const RESOLVE = `mutation($id: String!, $r: Boolean!) { setQuestionResolved(id: $id, resolved: $r) { ${THREAD} } }`;
  const HIDE_Q = `mutation($id: String!) { hideQuestion(id: $id) }`;
  const HIDE_A = `mutation($id: String!) { hideAnswer(id: $id) { ${THREAD} } }`;

  const ask = (as: Key, input: object) =>
    gql<{ askQuestion: Question }>(ASK, { i: { title: 'Why?', ...input } }, as);
  const list = (as: Key, input: object = {}) =>
    gql<{ courseQuestions: List }>(LIST, { i: input }, as);
  const titles = async (as: Key, input: object = {}) =>
    (await list(as, input))
      .data!.courseQuestions.list.filter((x) => x.title.startsWith(TAG))
      .map((x) => x.title.replace(`${TAG} `, ''));
  const answer = (as: Key, questionId: string, body = 'Because', extra = {}) =>
    gql<{ answerQuestion: Thread }>(
      ANSWER,
      { i: { questionId, body, ...extra } },
      as,
    );

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
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.courseAnswer.deleteMany({
      where: { question: { course: courses } },
    });
    await prisma.courseQuestion.deleteMany({ where: { course: courses } });
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
    for (const [key, role] of [
      ['admin', 'ADMIN'],
      ['tA', 'TEACHER'],
      ['tB', 'TEACHER'],
      ['sA', 'STUDENT'],
      ['sA2', 'STUDENT'],
      ['sB', 'STUDENT'],
      ['pA', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-question-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-question-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
    await prisma.parentStudent.create({
      data: {
        parentId: id.pA,
        studentId: id.sA,
        relation: 'MOTHER',
        createdById: id.admin,
      },
    });

    const year = await prisma.academicYear.create({
      data: {
        name: TAG,
        startsAt: new Date('2085-09-01'),
        endsAt: new Date('2086-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const past = new Date(Date.now() - 60_000);
    for (const [key, teacherId, students, status] of [
      ['A', id.tA, [id.sA, id.sA2], 'ACTIVE'],
      ['B', id.tB, [id.sB], 'ACTIVE'],
      ['D', id.tA, [id.sA], 'ARCHIVED'],
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
            status,
            teachers: { create: { teacherId } },
            enrollments: {
              create: students.map((studentId) => ({ studentId })),
            },
          },
        })
      ).id;
      const week = await prisma.module.create({
        data: {
          courseId: course[key],
          title: 'Week 1',
          order: 1,
          publishedAt: past,
        },
      });
      lesson[key] = (
        await prisma.lesson.create({
          data: {
            moduleId: week.id,
            title: `Lesson ${key}`,
            type: 'READING',
            order: 1,
            publishedAt: past,
          },
        })
      ).id;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('ask: a student of the course only; "about" must be a lesson of the same course', async () => {
    const open = await ask('sA', {
      courseId: course.A,
      title: `${TAG} Open`,
      lessonId: lesson.A,
    });
    expect(open.data!.askQuestion).toMatchObject({
      isMine: true,
      isPrivate: false,
      isAnswered: false,
      lessonTitle: 'Lesson A',
      authorLoginId: null, // students never see login IDs
    });
    q.open = open.data!.askQuestion.id;
    q.secret = (
      await ask('sA', {
        courseId: course.A,
        title: `${TAG} Secret`,
        isPrivate: true,
      })
    ).data!.askQuestion.id;

    // Foreign course, foreign lesson (IDOR), wrong roles, archived course
    expect(code(await ask('sB', { courseId: course.A }))).toBe('NOT_FOUND');
    expect(
      code(await ask('sA', { courseId: course.A, lessonId: lesson.B })),
    ).toBe('NOT_FOUND');
    expect(code(await ask('tA', { courseId: course.A }))).toBe('FORBIDDEN');
    expect(code(await ask('pA', { courseId: course.A }))).toBe('FORBIDDEN');
    expect(code(await ask('sA', { courseId: course.D }))).toBe('BAD_REQUEST');
  });

  it('who sees: classmates see public questions only; other courses and parents see nothing', async () => {
    expect((await titles('sA')).sort()).toEqual(['Open', 'Secret']);
    expect(await titles('sA2')).toEqual(['Open']);
    expect(await titles('sB')).toEqual([]);
    expect((await titles('tA')).sort()).toEqual(['Open', 'Secret']);
    expect(await titles('tB')).toEqual([]);

    expect(code(await list('sB', { courseId: course.A }))).toBe('NOT_FOUND');
    expect(code(await list('pA'))).toBe('FORBIDDEN');
    expect(code(await gql(GET, { id: q.secret }, 'sA2'))).toBe('NOT_FOUND');
    expect(code(await gql(GET, { id: q.open }, 'sB'))).toBe('NOT_FOUND');
    expect(code(await gql(GET, { id: q.open }, 'tB'))).toBe('NOT_FOUND');
    expect(code(await gql(GET, { id: q.open }, 'pA'))).toBe('FORBIDDEN');

    const staff = await gql<{ courseQuestion: Thread }>(
      GET,
      { id: q.open },
      'tA',
    );
    expect(staff.data!.courseQuestion).toMatchObject({
      canModerate: true,
      question: { authorLoginId: 'e2e-question-sA', isMine: false },
    });
  });

  it('replies: classmates on public ones; a teacher reply answers and can resolve', async () => {
    const classmate = await answer('sA2', q.open, 'Try factoring');
    expect(classmate.data!.answerQuestion.answers).toMatchObject([
      { isStaff: false, isMine: true },
    ]);
    // A classmate reply does not answer it
    expect(classmate.data!.answerQuestion.question.isAnswered).toBe(false);

    expect(code(await answer('sA2', q.secret))).toBe('NOT_FOUND');
    expect(code(await answer('sB', q.open))).toBe('NOT_FOUND');
    expect(code(await answer('tB', q.open))).toBe('NOT_FOUND');
    expect(code(await answer('pA', q.open))).toBe('FORBIDDEN');
    const before = (await list('tA', { courseId: course.A })).data!
      .courseQuestions;
    expect(before).toMatchObject({ all: 2, unanswered: 2, answered: 0 });

    const teacher = await answer('tA', q.secret, 'See page 12', {
      resolve: true,
    });
    expect(teacher.data!.answerQuestion.question).toMatchObject({
      isAnswered: true,
      isResolved: true,
      replies: 1,
      staffReplies: 1,
    });
    const after = (await list('tA', { courseId: course.A, tab: 'UNANSWERED' }))
      .data!.courseQuestions;
    expect(after).toMatchObject({ total: 1, unanswered: 1, answered: 1 });
    expect(after.list.map((x) => x.id)).toEqual([q.open]);

    const mine = (await list('sA', { tab: 'MINE' })).data!.courseQuestions;
    expect(mine.mine).toBe(2);
  });

  it('moderation: only the course teacher pins, resolves and hides (audited)', async () => {
    expect(code(await gql(PIN, { id: q.open, p: true }, 'sA'))).toBe(
      'FORBIDDEN',
    );
    expect(code(await gql(PIN, { id: q.open, p: true }, 'tB'))).toBe(
      'NOT_FOUND',
    );
    expect(code(await gql(PIN, { id: q.secret, p: true }, 'tA'))).toBe(
      'QUESTION_PRIVATE',
    );
    const pinned = await gql<{ setQuestionPinned: Thread }>(
      PIN,
      { id: q.open, p: true },
      'tA',
    );
    expect(pinned.data!.setQuestionPinned.question.isPinned).toBe(true);
    expect(await titles('sA2')).toEqual(['Open']);

    expect(code(await gql(RESOLVE, { id: q.open, r: true }, 'sA'))).toBe(
      'FORBIDDEN',
    );
    const resolved = await gql<{ setQuestionResolved: Thread }>(
      RESOLVE,
      { id: q.open, r: true },
      'tA',
    );
    expect(resolved.data!.setQuestionResolved.question).toMatchObject({
      isResolved: true,
      isAnswered: true,
    });

    const thread = (
      await gql<{ courseQuestion: Thread }>(GET, { id: q.open }, 'tA')
    ).data!.courseQuestion;
    const reply = thread.answers[0].id;
    expect(code(await gql(HIDE_A, { id: reply }, 'tB'))).toBe('NOT_FOUND');
    expect(code(await gql(HIDE_A, { id: reply }, 'sA'))).toBe('FORBIDDEN');
    const hidden = await gql<{ hideAnswer: Thread }>(
      HIDE_A,
      { id: reply },
      'tA',
    );
    expect(hidden.data!.hideAnswer.answers).toEqual([]);

    expect(code(await gql(HIDE_Q, { id: q.open }, 'tB'))).toBe('NOT_FOUND');
    expect((await gql(HIDE_Q, { id: q.open }, 'tA')).data).toEqual({
      hideQuestion: true,
    });
    expect(await titles('sA2')).toEqual([]);
    expect(code(await gql(GET, { id: q.open }, 'sA'))).toBe('NOT_FOUND');

    const audit = await prisma.auditLog.findMany({
      where: { actorId: id.tA },
      select: { action: true },
    });
    expect(audit.map((a) => a.action).sort()).toEqual([
      'answer.hide',
      'question.hide',
    ]);
  });
});
