import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { StorageService } from '../src/components/media/storage.service';
import { PrismaService } from '../src/database/prisma.service';
import { MAX_PENDING_UPLOADS } from '../src/libs/config';

// Needs Docker Postgres + Redis, but NOT AWS: StorageService is replaced by a fake "S3" in memory.
// One course (year "E2E Media 2091") with teacher tA; tB teaches nothing; "demo" is a demo teacher.
const PASSWORD = 'E2e-Media-Password-1';
const TAG = 'E2E Media';
const MB = 1024 ** 2;

/** What a test "uploads": key → what S3 would report in HeadObject */
class FakeStorage {
  isEnabled = true;
  objects = new Map<string, { size: number; mimeType: string }>();
  deleted: string[] = [];
  presignUpload(key: string) {
    return Promise.resolve(`https://fake-s3.test/${key}?X-Amz-Signature=x`);
  }
  head(key: string) {
    return Promise.resolve(this.objects.get(key) ?? null);
  }
  delete(key: string) {
    this.objects.delete(key);
    this.deleted.push(key);
    return Promise.resolve();
  }
  signedUrl(key: string) {
    return `https://fake-cdn.test/${key}?Signature=x`;
  }
}

type Key = 'tA' | 'tB' | 'student' | 'demo';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Ticket {
  createUpload: { assetId: string; uploadUrl: string; expiresAt: string };
}
interface Confirmed {
  confirmUpload: { id: string; status: string; size: number };
}

describe('Uploads: createUpload → confirmUpload (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const storage = new FakeStorage();
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  let courseId: string;

  async function gql<T>(query: string, variables: object, as: Key = 'tA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const CREATE = `mutation($i: CreateUploadInput!) {
    createUpload(input: $i) { assetId uploadUrl expiresAt }
  }`;
  const CONFIRM = `mutation($id: String!) { confirmUpload(assetId: $id) { id status size } }`;
  const video = (extra: object = {}) => ({
    i: {
      courseId,
      kind: 'VIDEO',
      fileName: 'Week 1.mp4',
      mimeType: 'video/mp4',
      size: 120 * MB,
      ...extra,
    },
  });
  const asset = (assetId: string) =>
    prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const course = { title: { startsWith: TAG } };
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.courseTeacher.deleteMany({ where: { course } });
    await prisma.enrollment.deleteMany({ where: { course } });
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
      .useValue(storage)
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
      ['student', 'STUDENT'],
      ['demo', 'TEACHER'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-media-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
            isDemo: key === 'demo',
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-media-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2091`,
        startsAt: new Date('2091-09-01'),
        endsAt: new Date('2092-05-31'),
      },
    });
    const group = await prisma.group.create({
      data: { academicYearId: year.id, name: 'E2E-M' },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    courseId = (
      await prisma.course.create({
        data: {
          academicYearId: year.id,
          groupId: group.id,
          subjectId: subject.id,
          title: `${TAG} Algebra`,
          status: 'ACTIVE',
          teachers: {
            create: [{ teacherId: id.tA }, { teacherId: id.demo }],
          },
          enrollments: { create: { studentId: id.student } },
        },
      })
    ).id;
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('createUpload: UPLOADING asset, server-made key, user file name only as metadata', async () => {
    const res = await gql<Ticket>(
      CREATE,
      video({ fileName: 'C:\\fakepath\\Week 1\n.mp4', durationSec: 600 }),
    );
    const ticket = res.data!.createUpload;
    const row = await asset(ticket.assetId);

    expect(row).toMatchObject({
      status: 'UPLOADING',
      ownerId: id.tA,
      s3Key: `raw/${courseId}/${ticket.assetId}.mp4`,
      originalName: 'Week 1.mp4',
      size: BigInt(120 * MB),
      // The length the teacher's browser read: the 90% rule uses this one
      durationSec: 600,
    });
    expect(ticket.uploadUrl).toContain(row.s3Key);
    // About 15 minutes from now
    const minutes = (Date.parse(ticket.expiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  it('createUpload refuses wrong files before S3 is touched', async () => {
    expect(
      code(await gql(CREATE, video({ mimeType: 'video/quicktime' }))),
    ).toBe('BAD_REQUEST');
    expect(code(await gql(CREATE, video({ size: 3 * 1024 * MB })))).toBe(
      'BAD_REQUEST',
    );
    expect(
      code(await gql(CREATE, video({ kind: 'OTHER', mimeType: 'text/plain' }))),
    ).toBe('BAD_REQUEST');
  });

  it('createUpload: only the course’s teachers, never a demo account', async () => {
    expect(code(await gql(CREATE, video(), 'tB'))).toBe('NOT_FOUND');
    expect(code(await gql(CREATE, video(), 'student'))).toBe('FORBIDDEN');
    expect(code(await gql(CREATE, video(), 'demo'))).toBe('DEMO_READ_ONLY');
  });

  it('confirmUpload: checks S3 itself; READY once, the same answer on a retry', async () => {
    const { assetId } = (await gql<Ticket>(CREATE, video())).data!.createUpload;
    const { s3Key } = await asset(assetId);

    // The browser says "done", but nothing is in S3
    expect(code(await gql(CONFIRM, { id: assetId }))).toBe('BAD_REQUEST');
    // Another teacher cannot confirm (or even see) this upload
    expect(code(await gql(CONFIRM, { id: assetId }, 'tB'))).toBe('NOT_FOUND');

    storage.objects.set(s3Key!, { size: 120 * MB, mimeType: 'video/mp4' });
    const first = await gql<Confirmed>(CONFIRM, { id: assetId });
    expect(first.data!.confirmUpload).toEqual({
      id: assetId,
      status: 'READY',
      size: 120 * MB,
    });
    const again = await gql<Confirmed>(CONFIRM, { id: assetId });
    expect(again.data!.confirmUpload.status).toBe('READY');
  });

  it('confirmUpload: a different file than allowed → FAILED and deleted from S3', async () => {
    const { assetId } = (await gql<Ticket>(CREATE, video())).data!.createUpload;
    const { s3Key } = await asset(assetId);
    storage.objects.set(s3Key!, { size: 999 * MB, mimeType: 'video/mp4' });

    expect(code(await gql(CONFIRM, { id: assetId }))).toBe('BAD_REQUEST');
    expect((await asset(assetId)).status).toBe('FAILED');
    expect(storage.deleted).toContain(s3Key);
    // A failed upload cannot be confirmed later
    expect(code(await gql(CONFIRM, { id: assetId }))).toBe('BAD_REQUEST');
  });

  it(`at most ${MAX_PENDING_UPLOADS} unfinished uploads per user; MEDIA_DISABLED without storage`, async () => {
    const pending = await prisma.mediaAsset.count({
      where: { ownerId: id.tA, status: 'UPLOADING' },
    });
    await prisma.mediaAsset.createMany({
      data: Array.from({ length: MAX_PENDING_UPLOADS - pending }, (_, i) => ({
        ownerId: id.tA,
        kind: 'VIDEO' as const,
        originalName: `pending-${i}.mp4`,
        mimeType: 'video/mp4',
        size: 1n,
      })),
    });
    expect(code(await gql(CREATE, video()))).toBe('RATE_LIMITED');

    storage.isEnabled = false;
    expect(code(await gql(CREATE, video(), 'tB'))).toBe('MEDIA_DISABLED');
    storage.isEnabled = true;
  });
});
