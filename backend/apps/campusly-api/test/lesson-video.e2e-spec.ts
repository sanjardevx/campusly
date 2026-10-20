import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { StorageService } from '../src/components/media/storage.service';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis, not AWS (fake storage). Year "E2E Video 2090":
//   course A (ACTIVE): teacher tA, student sA (parent pA); a published week with a published video
//   lesson, a draft video lesson and a reading lesson. Course B: teacher tB, student sB.
const PASSWORD = 'E2e-Video-Password-1';
const TAG = 'E2E Video';

type Key = 'tA' | 'tB' | 'sA' | 'sB' | 'pA';
type Outcome = 'OK' | 'NOT_FOUND' | 'FORBIDDEN' | 'BAD_REQUEST';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Video {
  lessonVideo: {
    url: string;
    expiresAt: string;
    resumeAt: number;
    watermark: string;
  };
}

const fakeStorage = {
  isEnabled: true,
  signedUrl: (key: string) => `https://fake-cdn.test/${key}?Signature=x`,
};

describe('Lesson video: setLessonVideo and lessonVideo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const c = { A: '', B: '' };
  const lesson = { video: '', draft: '', reading: '' };
  const asset = { ready: '', uploading: '', otherCourse: '' };

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const outcome = (body: GqlBody<unknown>): Outcome =>
    (body.errors?.[0].extensions.code as Outcome | undefined) ?? 'OK';

  const VIDEO = `query($id: String!) { lessonVideo(lessonId: $id) { url expiresAt resumeAt watermark } }`;
  const SET = `mutation($i: SetLessonVideoInput!) { setLessonVideo(input: $i) { id videoAssetId } }`;
  const attach = (lessonId: string, assetId: string | null, as: Key = 'tA') =>
    gql<{ setLessonVideo: { videoAssetId: string | null } }>(
      SET,
      { i: { lessonId, assetId } },
      as,
    );

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
      where: { academicYear: { name: `${TAG} 2090` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2090` } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue(fakeStorage)
      .compile();
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
            loginId: `e2e-video-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-video-${key}`, password: PASSWORD });
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

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2090`,
        startsAt: new Date('2090-09-01'),
        endsAt: new Date('2091-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, studentId] of [
      ['A', id.tA, id.sA],
      ['B', id.tB, id.sB],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-V${key}` },
      });
      c[key] = (
        await prisma.course.create({
          data: {
            academicYearId: year.id,
            groupId: group.id,
            subjectId: subject.id,
            title: `${TAG} ${key}`,
            status: 'ACTIVE',
            teachers: { create: { teacherId } },
            enrollments: { create: { studentId } },
          },
        })
      ).id;
    }

    const media = async (courseId: string, status: 'READY' | 'UPLOADING') => {
      const row = await prisma.mediaAsset.create({
        data: {
          ownerId: id.tA,
          kind: 'VIDEO',
          originalName: 'Week 1.mp4',
          mimeType: 'video/mp4',
          size: 1000n,
          status,
        },
      });
      await prisma.mediaAsset.update({
        where: { id: row.id },
        data: { s3Key: `raw/${courseId}/${row.id}.mp4` },
      });
      return row.id;
    };
    asset.ready = await media(c.A, 'READY');
    asset.uploading = await media(c.A, 'UPLOADING');
    asset.otherCourse = await media(c.B, 'READY');

    const past = new Date(Date.now() - 86_400_000);
    const week = await prisma.module.create({
      data: { courseId: c.A, title: 'Week 1', order: 1, publishedAt: past },
    });
    const make = async (
      title: string,
      type: 'VIDEO' | 'READING',
      publishedAt: Date | null,
      order: number,
    ) =>
      (
        await prisma.lesson.create({
          data: { moduleId: week.id, title, type, publishedAt, order },
        })
      ).id;
    lesson.video = await make('Intro', 'VIDEO', past, 1);
    lesson.draft = await make('Draft video', 'VIDEO', null, 2);
    lesson.reading = await make('Notes', 'READING', past, 3);

    // sA watched 2 min 5 s of the intro last time
    await prisma.lessonProgress.create({
      data: {
        studentId: id.sA,
        lessonId: lesson.video,
        status: 'IN_PROGRESS',
        lastPositionSec: 125,
        maxPositionSec: 125,
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('setLessonVideo: only a READY video of this course, only on a video lesson', async () => {
    expect(outcome(await attach(lesson.video, asset.otherCourse))).toBe(
      'NOT_FOUND',
    );
    expect(outcome(await attach(lesson.video, asset.uploading))).toBe(
      'BAD_REQUEST',
    );
    expect(outcome(await attach(lesson.reading, asset.ready))).toBe(
      'BAD_REQUEST',
    );
    expect(outcome(await attach(lesson.video, asset.ready, 'tB'))).toBe(
      'NOT_FOUND',
    );
    expect(outcome(await attach(lesson.video, asset.ready, 'sA'))).toBe(
      'FORBIDDEN',
    );

    // Before a video is attached
    expect(outcome(await gql(VIDEO, { id: lesson.video }, 'sA'))).toBe(
      'NOT_FOUND',
    );
    const ok = await attach(lesson.video, asset.ready);
    expect(ok.data!.setLessonVideo.videoAssetId).toBe(asset.ready);
    await attach(lesson.draft, asset.ready);
  });

  // ───────────── isolation: who → which lesson → expected ─────────────
  const table: [string, Key, () => string, Outcome][] = [
    ['student: published lesson of own course', 'sA', () => lesson.video, 'OK'],
    [
      'student: draft lesson of own course',
      'sA',
      () => lesson.draft,
      'NOT_FOUND',
    ],
    [
      'student: lesson of another class’s course',
      'sB',
      () => lesson.video,
      'NOT_FOUND',
    ],
    ['parent: the child’s lesson', 'pA', () => lesson.video, 'OK'],
    ['teacher: own draft lesson', 'tA', () => lesson.draft, 'OK'],
    [
      'teacher: another teacher’s lesson',
      'tB',
      () => lesson.video,
      'NOT_FOUND',
    ],
    [
      'student: lesson without a video',
      'sA',
      () => lesson.reading,
      'NOT_FOUND',
    ],
  ];

  it.each(table)('%s → %s', async (_name, as, lessonId, expected) => {
    expect(outcome(await gql(VIDEO, { id: lessonId() }, as))).toBe(expected);
  });

  it('lessonVideo: signed link (~3 h), resume point, the viewer’s ID as watermark', async () => {
    const res = await gql<Video>(VIDEO, { id: lesson.video }, 'sA');
    const video = res.data!.lessonVideo;
    expect(video.url).toBe(
      `https://fake-cdn.test/raw/${c.A}/${asset.ready}.mp4?Signature=x`,
    );
    expect(video.resumeAt).toBe(125);
    expect(video.watermark).toBe('e2e-video-sA');
    const hours = (Date.parse(video.expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(2.9);
    expect(hours).toBeLessThanOrEqual(3);

    // A parent watching does not continue the child's position
    const parent = await gql<Video>(VIDEO, { id: lesson.video }, 'pA');
    expect(parent.data!.lessonVideo).toMatchObject({
      resumeAt: 0,
      watermark: 'e2e-video-pA',
    });
  });
});
