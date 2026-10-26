import './tutor-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { StorageService } from '../src/components/media/storage.service';
import { FakeLlmProvider } from '../src/components/tutor/llm/fake.provider';
import { TutorIndexService } from '../src/components/tutor/tutor-index.service';
import { TutorLimitsService } from '../src/components/tutor/tutor-limits.service';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { TUTOR_TIMEZONE } from '../src/libs/config';
import { todayInZone } from '../src/libs/utils/date';

// Needs Docker Postgres + Redis. Year "E2E Tutor 2088": course A (teacher tA, student sA, parent
// pA) and course B (teacher tB, student sB). The fake provider answers; everything is removed after.
const PASSWORD = 'E2e-Tutor-Password-1';
const TAG = 'E2E Tutor';

type Key = 'tA' | 'tB' | 'sA' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}
interface DoneData {
  level: number;
  used: number;
  message: { role: string; text: string; sources: { title: string }[] };
}

describe('AI Study Tutor: index, SSE chat, levels, rules, limits, isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  let index: TutorIndexService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '' };
  const lesson = { A: '', hidden: '', B: '' };
  const assignment = { hints: '', off: '', quiz: '' };
  let conversation = '';

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  /** POST /tutor/chat; a stream comes back as parsed SSE events, an error as status + code */
  async function chat(body: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/tutor/chat')
      .set('Authorization', `Bearer ${token[as]}`)
      .send(body);
    const events: SseEvent[] =
      res.status === 200
        ? res.text
            .split('\n\n')
            .filter(Boolean)
            .map((block) => {
              const [eventLine, dataLine] = block.split('\n');
              return {
                event: eventLine.replace('event: ', ''),
                data: JSON.parse(dataLine.replace('data: ', '')) as Record<
                  string,
                  unknown
                >,
              };
            })
        : [];
    const done = events.find((e) => e.event === 'done')?.data as
      DoneData | undefined;
    return {
      status: res.status,
      code: (res.body as { code?: string }).code,
      events,
      done,
    };
  }
  const questionsKey = (studentId: string) =>
    `tutor:questions:${todayInZone(TUTOR_TIMEZONE)}:${studentId}`;
  const spendKey = () => `tutor:spend:${todayInZone(TUTOR_TIMEZONE)}`;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    await prisma.tutorMessage.deleteMany({
      where: { conversation: { course: courses } },
    });
    await prisma.tutorConversation.deleteMany({ where: { course: courses } });
    await prisma.documentChunk.deleteMany({ where: { course: courses } });
    await prisma.quizAttempt.deleteMany({
      where: { assignment: { course: courses } },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.lesson.deleteMany({ where: { module: { course: courses } } });
    await prisma.module.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2088` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2088` } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    for (const studentId of ids) await redis.del(questionsKey(studentId));
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    // The batch's indexer, with the same fake model (lesson text only: no S3 in tests)
    index = new TutorIndexService(
      prisma,
      {} as StorageService,
      app.get(TutorLimitsService),
      new FakeLlmProvider(),
    );
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
            loginId: `e2e-tutor-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-tutor-${key}`, password: PASSWORD });
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
    const past = new Date(Date.now() - 86_400_000);
    for (const [key, teacherId, studentId] of [
      ['A', id.tA, id.sA],
      ['B', id.tB, id.sB],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-TU${key}` },
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
            gradeCategories: { create: { name: 'Homework', weight: 100 } },
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
            title: key === 'A' ? 'Factoring quadratics' : 'Course B lesson',
            type: 'READING',
            body:
              key === 'A'
                ? 'To factor a trinomial, find two numbers that multiply to c and add to b.'
                : 'Nothing about trinomials here.',
            order: 1,
            publishedAt: past,
            tutorNotes: 'Students often forget negative pairs.',
          },
        })
      ).id;
    }
    // A hidden week of course A: its text matches the question best, but students may not see it
    const hiddenWeek = await prisma.module.create({
      data: {
        courseId: course.A,
        title: 'Week 2',
        order: 2,
        publishedAt: past,
        isHidden: true,
      },
    });
    lesson.hidden = (
      await prisma.lesson.create({
        data: {
          moduleId: hiddenWeek.id,
          title: 'Hidden answers',
          type: 'READING',
          body: 'factor trinomial factor trinomial numbers multiply add',
          order: 1,
          publishedAt: past,
        },
      })
    ).id;
    const category = await prisma.gradeCategory.findFirstOrThrow({
      where: { courseId: course.A },
    });
    const newAssignment = async (
      type: 'HOMEWORK' | 'QUIZ',
      tutorMode: 'HINTS' | 'OFF',
    ) =>
      (
        await prisma.assignment.create({
          data: {
            courseId: course.A,
            categoryId: category.id,
            type,
            title: `${type} ${tutorMode}`,
            maxScore: 10,
            tutorMode,
            publishedAt: past,
            createdById: id.tA,
          },
        })
      ).id;
    assignment.hints = await newAssignment('HOMEWORK', 'HINTS');
    assignment.off = await newAssignment('HOMEWORK', 'OFF');
    assignment.quiz = await newAssignment('QUIZ', 'HINTS');

    await index.sync(course.A);
    await index.sync(course.B);
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('indexes published lessons and assignments, but not quizzes or tutor-OFF ones', async () => {
    const keys = await prisma.documentChunk.findMany({
      where: { courseId: course.A },
      select: { sourceKey: true },
      distinct: ['sourceKey'],
    });
    expect(keys.map((k) => k.sourceKey).sort()).toEqual(
      [
        `assignment:${assignment.hints}`,
        `lesson:${lesson.A}`,
        `lesson:${lesson.hidden}`,
      ].sort(),
    );
    // Nothing changed: the next run embeds nothing again
    expect(await index.sync(course.A)).toEqual({ indexed: 0, removed: 0 });
  });

  it('the student sees the tutor is on, with today’s limit (TUTOR_DAILY_LIMIT)', async () => {
    const res = await gql<{ tutorStatus: object }>(
      '{ tutorStatus { enabled used limit quizActive } }',
      {},
      'sA',
    );
    expect(res.data!.tutorStatus).toEqual({
      enabled: true,
      used: 0,
      limit: app.get(TutorLimitsService).limit,
      quizActive: false,
    });
  });

  it('a question streams back an answer built from visible course material only', async () => {
    const res = await chat(
      {
        action: 'ASK',
        courseId: course.A,
        lessonId: lesson.A,
        text: 'How do I factor this trinomial?',
      },
      'sA',
    );
    expect(res.status).toBe(200);
    expect(res.events.map((e) => e.event)).toEqual(
      expect.arrayContaining(['meta', 'delta', 'done']),
    );
    conversation = res.events[0].data.conversationId as string;
    expect(res.done!.level).toBe(1);
    expect(res.done!.used).toBe(1);
    expect(res.done!.message.role).toBe('TUTOR');
    const titles = res.done!.message.sources.map((s) => s.title);
    expect(titles).toContain('Factoring quadratics');
    expect(titles).not.toContain('Hidden answers');

    const thread = await gql<{
      tutorConversation: {
        conversation: { title: string; level: number };
        messages: { role: string }[];
      };
    }>(
      'query($c: String!) { tutorConversation(conversationId: $c) { conversation { title level } messages { role } } }',
      { c: conversation },
      'sA',
    );
    expect(thread.data!.tutorConversation.conversation.title).toBe(
      'Factoring quadratics',
    );
    expect(thread.data!.tutorConversation.messages.map((m) => m.role)).toEqual([
      'STUDENT',
      'TUTOR',
    ]);
  });

  it('"Show another hint" goes up one level; "I solved it" starts again at 1', async () => {
    const next = await chat(
      { action: 'NEXT_HINT', conversationId: conversation },
      'sA',
    );
    expect(next.done!.level).toBe(2);
    const solved = await gql<{
      markTutorSolved: { role: string; text: string };
    }>(
      'mutation($c: String!) { markTutorSolved(conversationId: $c) { role text } }',
      { c: conversation },
      'sA',
    );
    expect(solved.data!.markTutorSolved).toEqual({
      role: 'SYSTEM',
      text: 'solved',
    });
    const row = await prisma.tutorConversation.findUniqueOrThrow({
      where: { id: conversation },
    });
    expect(row.level).toBe(1);
  });

  it('parents and teachers cannot use or read the tutor', async () => {
    for (const who of ['pA', 'tA'] as const) {
      expect(code(await gql('{ tutorConversations { id } }', {}, who))).toBe(
        'FORBIDDEN',
      );
      expect(
        code(
          await gql(
            'query($c: String!) { tutorConversation(conversationId: $c) { conversation { id } } }',
            { c: conversation },
            who,
          ),
        ),
      ).toBe('FORBIDDEN');
      const res = await chat(
        { action: 'ASK', courseId: course.A, text: 'hi' },
        who,
      );
      expect(res.status).toBe(403);
    }
  });

  it('another student cannot read or continue the conversation, nor ask in a foreign course (foreign user)', async () => {
    expect(
      code(
        await gql(
          'query($c: String!) { tutorConversation(conversationId: $c) { conversation { id } } }',
          { c: conversation },
          'sB',
        ),
      ),
    ).toBe('NOT_FOUND');
    const list = await gql<{ tutorConversations: unknown[] }>(
      '{ tutorConversations { id } }',
      {},
      'sB',
    );
    expect(list.data!.tutorConversations).toEqual([]);
    expect(
      (await chat({ action: 'NEXT_HINT', conversationId: conversation }, 'sB'))
        .status,
    ).toBe(404);
    expect(
      (await chat({ action: 'ASK', courseId: course.A, text: 'hi' }, 'sB'))
        .code,
    ).toBe('NOT_FOUND');
    // A lesson of course B under course A
    expect(
      (
        await chat(
          {
            action: 'ASK',
            courseId: course.A,
            lessonId: lesson.B,
            text: 'hi',
          },
          'sA',
        )
      ).code,
    ).toBe('NOT_FOUND');
  });

  it('the teacher’s tutorMode OFF and quizzes refuse the tutor', async () => {
    for (const assignmentId of [assignment.off, assignment.quiz]) {
      const res = await chat(
        { action: 'ASK', courseId: course.A, assignmentId, text: 'help' },
        'sA',
      );
      expect(res.status).toBe(403);
      expect(res.code).toBe('TUTOR_OFF');
    }
    const ok = await chat(
      {
        action: 'ASK',
        courseId: course.A,
        assignmentId: assignment.hints,
        text: 'help',
      },
      'sA',
    );
    expect(ok.status).toBe(200);
  });

  it('is off for everything while the student has a quiz open', async () => {
    const attempt = await prisma.quizAttempt.create({
      data: {
        assignmentId: assignment.quiz,
        studentId: id.sA,
        startedAt: new Date(),
        deadlineAt: new Date(Date.now() + 10 * 60_000),
        order: { questions: [], options: {} },
      },
    });
    const res = await chat(
      { action: 'ASK', courseId: course.A, text: 'what is 2+2?' },
      'sA',
    );
    expect(res.code).toBe('TUTOR_QUIZ_ACTIVE');
    const status = await gql<{ tutorStatus: { quizActive: boolean } }>(
      '{ tutorStatus { quizActive } }',
      {},
      'sA',
    );
    expect(status.data!.tutorStatus.quizActive).toBe(true);

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { submittedAt: new Date() },
    });
    expect(
      (await chat({ action: 'ASK', courseId: course.A, text: 'ok' }, 'sA'))
        .status,
    ).toBe(200);
  });

  it('stops at the daily limit and when the school budget is used up', async () => {
    await redis.set(questionsKey(id.sA), app.get(TutorLimitsService).limit);
    const limited = await chat(
      { action: 'ASK', courseId: course.A, text: 'one more' },
      'sA',
    );
    expect(limited.status).toBe(429);
    expect(limited.code).toBe('TUTOR_LIMIT');
    await redis.del(questionsKey(id.sA));

    const spent = await redis.get(spendKey());
    await redis.set(spendKey(), 2_000_000);
    const broke = await chat(
      { action: 'ASK', courseId: course.A, text: 'one more' },
      'sA',
    );
    expect(broke.status).toBe(503);
    expect(broke.code).toBe('TUTOR_BUDGET');
    if (spent) await redis.set(spendKey(), spent);
    else await redis.del(spendKey());
  });

  it('a lesson that is unpublished later drops out of the index', async () => {
    await prisma.lesson.update({
      where: { id: lesson.hidden },
      data: { publishedAt: null },
    });
    expect(await index.sync(course.A)).toEqual({ indexed: 0, removed: 1 });
  });
});
