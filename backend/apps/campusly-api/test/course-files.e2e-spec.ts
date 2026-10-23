import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { StorageService } from '../src/components/media/storage.service';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis, not AWS (fake storage). Year "E2E Files 2091":
//   course A: teacher tA, student sA; a published week with a FILE lesson and a VIDEO lesson.
//   course B: teacher tB (the foreign teacher), student sB (the foreign student).
// Covers: setLessonFile, Assignment.moduleId + fileAssetIds, courseFileUrl.
const PASSWORD = 'E2e-Files-Password-1';
const TAG = 'E2E Files';
const DAY = 86_400_000;

type Key = 'tA' | 'tB' | 'sA' | 'sB';
type Outcome = 'OK' | 'NOT_FOUND' | 'FORBIDDEN' | 'BAD_REQUEST';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface File {
  id: string;
  name: string;
}
interface Assignment {
  id: string;
  moduleId: string | null;
  files: File[];
}

const fakeStorage = {
  isEnabled: true,
  signedUrl: (key: string) => `https://fake-cdn.test/${key}?Signature=x`,
};

const SET_FILE = `mutation($i: SetLessonFileInput!) { setLessonFile(input: $i) { id file { id name size } } }`;
const CREATE = `mutation($i: CreateAssignmentInput!) { createAssignment(input: $i) { id moduleId files { id name } } }`;
const UPDATE = `mutation($i: UpdateAssignmentInput!) { updateAssignment(input: $i) { id moduleId files { id name } } }`;
const URL_Q = `query($a: String!) { courseFileUrl(assetId: $a) { url expiresAt } }`;
const DETAIL = `query($c: String!) { courseDetail(courseId: $c) { modules { lessons { id type file { id name kind durationSec } } } } }`;

describe('Course files: lesson files, assignment weeks and attachments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const c = { A: '', B: '' };
  const week = { A: '', B: '' };
  const lesson = { file: '', video: '' };
  const asset = { pdf: '', png: '', other: '', video: '', uploading: '' };

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const outcome = (body: GqlBody<unknown>): Outcome =>
    (body.errors?.[0].extensions.code as Outcome | undefined) ?? 'OK';
  const create = (input: object, as: Key = 'tA') =>
    gql<{ createAssignment: Assignment }>(
      CREATE,
      {
        i: {
          courseId: c.A,
          type: 'HOMEWORK',
          title: `${TAG} homework`,
          maxScore: 10,
          ...input,
        },
      },
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
    await prisma.assignmentFile.deleteMany({
      where: { assignment: { course } },
    });
    await prisma.assignment.deleteMany({ where: { course } });
    await prisma.gradeCategory.deleteMany({ where: { course } });
    await prisma.lessonResource.deleteMany({
      where: { lesson: { module: { course } } },
    });
    await prisma.lesson.deleteMany({ where: { module: { course } } });
    await prisma.module.deleteMany({ where: { course } });
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.enrollment.deleteMany({ where: { course } });
    await prisma.courseTeacher.deleteMany({ where: { course } });
    await prisma.course.deleteMany({ where: course });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2091` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2091` } });
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
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-files-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-files-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2091`,
        startsAt: new Date('2091-09-01'),
        endsAt: new Date('2092-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const past = new Date(Date.now() - DAY);
    for (const [key, teacherId, studentId] of [
      ['A', id.tA, id.sA],
      ['B', id.tB, id.sB],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-F${key}` },
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
            gradeCategories: { create: { name: 'Homework', weight: 100 } },
          },
        })
      ).id;
      week[key] = (
        await prisma.module.create({
          data: {
            courseId: c[key],
            title: 'Week 1',
            order: 1,
            publishedAt: past,
          },
        })
      ).id;
    }

    const media = async (
      courseId: string,
      kind: 'DOCUMENT' | 'IMAGE' | 'VIDEO',
      name: string,
      status: 'READY' | 'UPLOADING' = 'READY',
    ) => {
      const row = await prisma.mediaAsset.create({
        data: {
          ownerId: id.tA,
          kind,
          originalName: name,
          mimeType: kind === 'VIDEO' ? 'video/mp4' : 'application/pdf',
          size: 2048n,
          durationSec: kind === 'VIDEO' ? 1320 : null,
          status,
        },
      });
      await prisma.mediaAsset.update({
        where: { id: row.id },
        data: { s3Key: `raw/${courseId}/${row.id}.bin` },
      });
      return row.id;
    };
    asset.pdf = await media(c.A, 'DOCUMENT', 'Notes.pdf');
    asset.png = await media(c.A, 'IMAGE', 'Board.png');
    asset.video = await media(c.A, 'VIDEO', 'Week 1.mp4');
    asset.uploading = await media(c.A, 'DOCUMENT', 'Half.pdf', 'UPLOADING');
    asset.other = await media(c.B, 'DOCUMENT', 'Other.pdf');

    const make = (title: string, type: 'FILE' | 'VIDEO', order: number) =>
      prisma.lesson
        .create({
          data: {
            moduleId: week.A,
            title,
            type,
            order,
            publishedAt: past,
            videoAssetId: type === 'VIDEO' ? asset.video : null,
          },
        })
        .then((l) => l.id);
    lesson.file = await make('Formula sheet', 'FILE', 1);
    lesson.video = await make('Lecture', 'VIDEO', 2);
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  describe('setLessonFile', () => {
    it('a READY document of the course: the lesson shows its name and size', async () => {
      const res = await gql<{
        setLessonFile: { file: File & { size: number } };
      }>(SET_FILE, { i: { lessonId: lesson.file, assetId: asset.pdf } }, 'tA');
      expect(res.data!.setLessonFile.file).toEqual({
        id: asset.pdf,
        name: 'Notes.pdf',
        size: 2048,
      });
    });

    it('courseDetail lists the file and the video (with its length)', async () => {
      const res = await gql<{
        courseDetail: {
          modules: {
            lessons: {
              type: string;
              file: {
                name: string;
                kind: string;
                durationSec: number | null;
              } | null;
            }[];
          }[];
        };
      }>(DETAIL, { c: c.A }, 'tA');
      expect(
        res.data!.courseDetail.modules[0].lessons.map((l) => l.file),
      ).toEqual([
        {
          id: asset.pdf,
          name: 'Notes.pdf',
          kind: 'DOCUMENT',
          durationSec: null,
        },
        {
          id: asset.video,
          name: 'Week 1.mp4',
          kind: 'VIDEO',
          durationSec: 1320,
        },
      ]);
    });

    it.each([
      [
        'another course’s file',
        () => ({ lessonId: lesson.file, assetId: asset.other }),
        'tA',
        'NOT_FOUND',
      ],
      [
        'an unfinished upload',
        () => ({ lessonId: lesson.file, assetId: asset.uploading }),
        'tA',
        'BAD_REQUEST',
      ],
      [
        'a video lesson',
        () => ({ lessonId: lesson.video, assetId: asset.pdf }),
        'tA',
        'BAD_REQUEST',
      ],
      [
        'foreign teacher',
        () => ({ lessonId: lesson.file, assetId: asset.pdf }),
        'tB',
        'NOT_FOUND',
      ],
      [
        'student',
        () => ({ lessonId: lesson.file, assetId: asset.pdf }),
        'sA',
        'FORBIDDEN',
      ],
    ] as const)('%s → %s', async (_name, input, as, expected) => {
      expect(outcome(await gql(SET_FILE, { i: input() }, as))).toBe(expected);
    });
  });

  describe('assignment in a week, with attachments', () => {
    let homework: Assignment;

    it('create: the week and the files, in the given order', async () => {
      homework = (
        await create({ moduleId: week.A, fileAssetIds: [asset.png, asset.pdf] })
      ).data!.createAssignment;
      expect(homework.moduleId).toBe(week.A);
      expect(homework.files.map((f) => f.name)).toEqual([
        'Board.png',
        'Notes.pdf',
      ]);
    });

    it('update: the new list wins; a removed file is kept with removedAt', async () => {
      const res = await gql<{ updateAssignment: Assignment }>(
        UPDATE,
        { i: { id: homework.id, fileAssetIds: [asset.pdf] } },
        'tA',
      );
      expect(res.data!.updateAssignment.files.map((f) => f.name)).toEqual([
        'Notes.pdf',
      ]);
      const rows = await prisma.assignmentFile.findMany({
        where: { assignmentId: homework.id },
      });
      expect(rows).toHaveLength(2);
      expect(
        rows.find((r) => r.assetId === asset.png)?.removedAt,
      ).not.toBeNull();
    });

    it.each([
      ['a week of another course', () => ({ moduleId: week.B }), 'NOT_FOUND'],
      [
        'another course’s file',
        () => ({ fileAssetIds: [asset.other] }),
        'NOT_FOUND',
      ],
      [
        'an unfinished upload',
        () => ({ fileAssetIds: [asset.uploading] }),
        'BAD_REQUEST',
      ],
      [
        'a video as an attachment',
        () => ({ fileAssetIds: [asset.video] }),
        'BAD_REQUEST',
      ],
    ] as const)('create with %s → %s', async (_name, input, expected) => {
      expect(outcome(await create(input()))).toBe(expected);
    });

    it('foreign teacher cannot create in course A', async () => {
      expect(outcome(await create({ moduleId: week.A }, 'tB'))).toBe(
        'NOT_FOUND',
      );
    });
  });

  describe('courseFileUrl', () => {
    let draftOnly: string;

    beforeAll(async () => {
      // The PNG now hangs only on a draft assignment
      draftOnly = asset.png;
      const draft = await create({ fileAssetIds: [draftOnly] });
      expect(outcome(draft)).toBe('OK');
      // The PDF: on the published FILE lesson (and the published homework)
      await prisma.assignment.updateMany({
        where: {
          course: { id: c.A },
          title: `${TAG} homework`,
          id: { not: draft.data!.createAssignment.id },
        },
        data: { publishedAt: new Date(Date.now() - DAY) },
      });
    });

    it.each([
      ['the uploader (teacher A)', 'tA', () => asset.pdf, 'OK'],
      ['a student of the course', 'sA', () => asset.pdf, 'OK'],
      ['a student of another course', 'sB', () => asset.pdf, 'NOT_FOUND'],
      ['the foreign teacher', 'tB', () => asset.pdf, 'NOT_FOUND'],
      [
        'a student: file on a draft assignment only',
        'sA',
        () => draftOnly,
        'NOT_FOUND',
      ],
      [
        'a student: a video (played through lessonVideo)',
        'sA',
        () => asset.video,
        'NOT_FOUND',
      ],
    ] as const)('%s → %s', async (_name, as, assetId, expected) => {
      const res = await gql<{ courseFileUrl: { url: string } }>(
        URL_Q,
        { a: assetId() },
        as,
      );
      expect(outcome(res)).toBe(expected);
      if (expected === 'OK') {
        expect(res.data!.courseFileUrl.url).toContain(`raw/${c.A}/`);
      }
    });
  });
});
