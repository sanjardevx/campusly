import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis (no AWS). Year "E2E Progress 2089": course A with teacher tA,
// student sA (parent pA); student sB is in course B. A published week with a 10-minute video lesson,
// a video without a stored length, and a "Mark as done" reading lesson.
const PASSWORD = 'E2e-Progress-Password-1';
const TAG = 'E2E Progress';

type Key = 'tA' | 'sA' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Progress {
  status: string;
  watchedSeconds: number;
  lastPositionSec: number;
  maxPositionSec: number;
  percent: number | null;
  completedAt: string | null;
}

describe('Lesson progress: heartbeat and the 90% rule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const lesson = { video: '', noLength: '', manual: '' };

  async function gql<T>(query: string, variables: object, as: Key = 'sA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const FIELDS =
    'status watchedSeconds lastPositionSec maxPositionSec percent completedAt';
  const BEAT = `mutation($i: LessonProgressInput!) { updateLessonProgress(input: $i) { ${FIELDS} } }`;
  const COMPLETE = `mutation($id: String!) { completeLesson(lessonId: $id) { ${FIELDS} } }`;

  /** One heartbeat from sA's player */
  async function beat(
    positionSec: number,
    lessonId = lesson.video,
    durationSec?: number,
  ) {
    const res = await gql<{ updateLessonProgress: Progress }>(BEAT, {
      i: { lessonId, positionSec, durationSec },
    });
    return res.data!.updateLessonProgress;
  }
  /** "The last heartbeat was `sec` seconds ago" */
  async function lastBeatAgo(sec: number, lessonId = lesson.video) {
    await prisma.lessonProgress.updateMany({
      where: { studentId: id.sA, lessonId },
      data: { updatedAt: new Date(Date.now() - sec * 1000) },
    });
  }

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const course = { title: { startsWith: TAG } };
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.lessonProgress.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.lesson.deleteMany({ where: { module: { course } } });
    await prisma.module.deleteMany({ where: { course } });
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.enrollment.deleteMany({ where: { course } });
    await prisma.courseTeacher.deleteMany({ where: { course } });
    await prisma.course.deleteMany({ where: course });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2089` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2089` } });
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
      ['sA', 'STUDENT'],
      ['sB', 'STUDENT'],
      ['pA', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-progress-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-progress-${key}`, password: PASSWORD });
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
        name: `${TAG} 2089`,
        startsAt: new Date('2089-09-01'),
        endsAt: new Date('2090-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const courseIds: string[] = [];
    for (const [key, studentId] of [
      ['A', id.sA],
      ['B', id.sB],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-P${key}` },
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
              teachers: { create: { teacherId: id.tA } },
              enrollments: { create: { studentId } },
            },
          })
        ).id,
      );
    }

    const video = (durationSec: number | null) =>
      prisma.mediaAsset.create({
        data: {
          ownerId: id.tA,
          kind: 'VIDEO',
          originalName: 'lesson.mp4',
          mimeType: 'video/mp4',
          size: 1000n,
          status: 'READY',
          durationSec,
          s3Key: `raw/${courseIds[0]}/${durationSec ?? 'none'}-${Date.now()}.mp4`,
        },
      });
    const tenMinutes = await video(600);
    const unknownLength = await video(null);

    const past = new Date(Date.now() - 86_400_000);
    const week = await prisma.module.create({
      data: {
        courseId: courseIds[0],
        title: 'Week 1',
        order: 1,
        publishedAt: past,
      },
    });
    type LessonData = {
      title: string;
      type: 'VIDEO' | 'READING';
      completionType: 'VIDEO_WATCHED' | 'MANUAL';
      videoAssetId?: string;
    };
    const make = async (data: LessonData, order: number) =>
      (
        await prisma.lesson.create({
          data: { moduleId: week.id, publishedAt: past, order, ...data },
        })
      ).id;
    lesson.video = await make(
      {
        title: 'Video',
        type: 'VIDEO',
        completionType: 'VIDEO_WATCHED',
        videoAssetId: tenMinutes.id,
      },
      1,
    );
    lesson.noLength = await make(
      {
        title: 'Video, length unknown',
        type: 'VIDEO',
        completionType: 'VIDEO_WATCHED',
        videoAssetId: unknownLength.id,
      },
      2,
    );
    lesson.manual = await make(
      { title: 'Practice', type: 'READING', completionType: 'MANUAL' },
      3,
    );
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('first heartbeat: IN_PROGRESS at the start, even if the player claims to be further', async () => {
    expect(await beat(250)).toMatchObject({
      status: 'IN_PROGRESS',
      lastPositionSec: 3,
      maxPositionSec: 3,
      percent: 0,
    });
    await prisma.lessonProgress.updateMany({
      where: { studentId: id.sA, lessonId: lesson.video },
      data: { lastPositionSec: 0, maxPositionSec: 0 },
    });
  });

  it('until completed: the furthest point grows only at 1×; no speed-up, no skipping', async () => {
    // Normal watching: 20 s of video in 20 s
    await lastBeatAgo(20);
    expect(await beat(20)).toMatchObject({
      maxPositionSec: 20,
      lastPositionSec: 20,
      percent: 3,
    });

    // 2× speed (40 s of video in 20 s): only 20 s + 3 s tolerance count
    await lastBeatAgo(20);
    expect(await beat(60)).toMatchObject({
      maxPositionSec: 43,
      lastPositionSec: 43,
    });

    // Jump to the end: cut back to what 1× could reach; the resume point is not past it either
    await lastBeatAgo(20);
    expect(await beat(590)).toMatchObject({
      status: 'IN_PROGRESS',
      maxPositionSec: 66,
      lastPositionSec: 66,
    });

    // Tab left open for 10 minutes, then a jump: a long gap counts as 20 s, not 10 min
    await lastBeatAgo(600);
    expect((await beat(500)).maxPositionSec).toBe(89);
  });

  it('seeking back is allowed and does not add progress', async () => {
    await lastBeatAgo(20);
    expect(await beat(10)).toMatchObject({
      lastPositionSec: 10,
      maxPositionSec: 89,
    });
    // Watching the same part again: the furthest point does not move
    await lastBeatAgo(20);
    expect(await beat(30)).toMatchObject({
      lastPositionSec: 30,
      maxPositionSec: 89,
      percent: 14,
    });
  });

  it('a fake length from the player is ignored', async () => {
    await lastBeatAgo(20);
    const res = await beat(9999, lesson.video, 10);
    expect(res.status).toBe('IN_PROGRESS');
    // Still 600 s: 112 of 600 is 18 %
    expect(res).toMatchObject({ maxPositionSec: 112, percent: 18 });
  });

  it('90% reached in order → COMPLETED; then any position, any speed', async () => {
    // As if the student had watched in order up to 530 of 600 s
    await prisma.lessonProgress.updateMany({
      where: { studentId: id.sA, lessonId: lesson.video },
      data: { lastPositionSec: 530, maxPositionSec: 530 },
    });
    await lastBeatAgo(20);
    const done = await beat(550);
    expect(done).toMatchObject({
      status: 'COMPLETED',
      maxPositionSec: 550,
      percent: 91,
    });
    expect(done.completedAt).not.toBeNull();

    // Unlocked: a jump is just a new resume point; it stays completed
    await lastBeatAgo(1);
    expect(await beat(5)).toMatchObject({
      status: 'COMPLETED',
      lastPositionSec: 5,
      completedAt: done.completedAt,
    });
    await lastBeatAgo(1);
    expect((await beat(400)).lastPositionSec).toBe(400);
  });

  it('unknown video length: the player’s value is used, but never below what was reached', async () => {
    const first = await beat(0, lesson.noLength, 100);
    expect(first.percent).toBe(0);
    await lastBeatAgo(20, lesson.noLength);
    expect(await beat(20, lesson.noLength, 100)).toMatchObject({
      maxPositionSec: 20,
      percent: 20,
    });
  });

  it('completeLesson: MANUAL lessons yes, video lessons only by watching', async () => {
    const res = await gql<{ completeLesson: Progress }>(COMPLETE, {
      id: lesson.manual,
    });
    expect(res.data!.completeLesson.status).toBe('COMPLETED');
    expect(code(await gql(COMPLETE, { id: lesson.video }))).toBe('BAD_REQUEST');
  });

  it('only the enrolled student: others are refused', async () => {
    const vars = { i: { lessonId: lesson.video, positionSec: 10 } };
    expect(code(await gql(BEAT, vars, 'sB'))).toBe('NOT_FOUND');
    expect(code(await gql(BEAT, vars, 'pA'))).toBe('FORBIDDEN');
    expect(code(await gql(BEAT, vars, 'tA'))).toBe('FORBIDDEN');
    expect(
      code(
        await gql(BEAT, { i: { lessonId: lesson.manual, positionSec: 10 } }),
      ),
    ).toBe('BAD_REQUEST');
  });
});
