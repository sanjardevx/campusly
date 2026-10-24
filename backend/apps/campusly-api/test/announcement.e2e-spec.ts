import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { StorageService } from '../src/components/media/storage.service';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Year "E2E Announce": course A (teacher tA, student sA,
// parent pA), course B (teacher tB, student sB), draft course C (teacher tA, student sA).
// The real DB also has the seed's school-wide announcements, so results are filtered by TAG.
const PASSWORD = 'E2e-Announce-Password-1';
const TAG = 'E2E Announce';

type Key = 'admin' | 'tA' | 'tB' | 'sA' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Item {
  id: string;
  title: string;
  courseTitle: string | null;
  isPinned: boolean;
  eventDate: string | null;
  isRead: boolean;
  readCount: number | null;
}
interface List {
  announcements: { list: Item[]; total: number; unread: number };
}

describe('Announcements: who sees, who writes, read receipts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '', C: '' };
  const ann = { school: '', A: '', B: '', C: '' };

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const FIELDS = 'id title courseTitle isPinned eventDate isRead readCount';
  const CREATE = `mutation($i: CreateAnnouncementInput!) { createAnnouncement(input: $i) { ${FIELDS} } }`;
  const UPDATE = `mutation($i: UpdateAnnouncementInput!) { updateAnnouncement(input: $i) { ${FIELDS} } }`;
  const LIST = `query($i: AnnouncementsInquiry) { announcements(input: $i) { total unread list { ${FIELDS} } } }`;
  const READ = `mutation($id: String!) { markAnnouncementRead(id: $id) { ${FIELDS} } }`;

  const create = (as: Key, title: string, extra: object = {}) =>
    gql<{ createAnnouncement: Item }>(
      CREATE,
      { i: { title: `${TAG} ${title}`, body: 'Text', ...extra } },
      as,
    );
  const list = async (as: Key, input: object = { limit: 100 }) =>
    (await gql<List>(LIST, { i: input }, as)).data!.announcements;
  const mine = async (as: Key) =>
    (await list(as)).list
      .filter((x) => x.title.startsWith(TAG))
      .map((x) => x.title.replace(`${TAG} `, ''));

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
    await prisma.announcementRead.deleteMany({
      where: {
        OR: [
          { userId: { in: ids } },
          { announcement: { title: { startsWith: TAG } } },
        ],
      },
    });
    await prisma.announcementFile.deleteMany({
      where: { announcement: { title: { startsWith: TAG } } },
    });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.announcement.deleteMany({
      where: { title: { startsWith: TAG } },
    });
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({ where: { academicYear: { name: TAG } } });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: TAG } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // courseFileUrl signs a link: no AWS needed in the test
      .overrideProvider(StorageService)
      .useValue({
        isEnabled: true,
        signedUrl: (key: string) => `https://fake-cdn.test/${key}`,
      })
      .compile();
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
      ['sB', 'STUDENT'],
      ['pA', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-announce-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-announce-${key}`, password: PASSWORD });
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
        startsAt: new Date('2083-09-01'),
        endsAt: new Date('2084-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, studentId, status] of [
      ['A', id.tA, id.sA, 'ACTIVE'],
      ['B', id.tB, id.sB, 'ACTIVE'],
      ['C', id.tA, id.sA, 'DRAFT'],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-AN${key}` },
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
            enrollments: { create: { studentId } },
          },
        })
      ).id;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('create: school-wide by admins only; a course by its own teachers', async () => {
    const school = await create('admin', 'School trip', {
      isPinned: true,
      eventDate: '2083-10-24',
    });
    expect(school.data!.createAnnouncement).toMatchObject({
      courseTitle: null,
      isPinned: true,
      eventDate: '2083-10-24',
      readCount: 0,
    });
    ann.school = school.data!.createAnnouncement.id;
    ann.A = (
      await create('tA', 'Quiz on Friday', { courseId: course.A })
    ).data!.createAnnouncement.id;
    ann.B = (
      await create('tB', 'B news', { courseId: course.B })
    ).data!.createAnnouncement.id;
    ann.C = (
      await create('tA', 'Draft course news', { courseId: course.C })
    ).data!.createAnnouncement.id;

    expect(code(await create('tA', 'Hack', {}))).toBe('FORBIDDEN');
    expect(code(await create('tA', 'Hack', { courseId: course.B }))).toBe(
      'NOT_FOUND',
    );
    expect(code(await create('sA', 'Hack', { courseId: course.A }))).toBe(
      'FORBIDDEN',
    );
    expect(
      code(await gql(UPDATE, { i: { id: ann.A, title: `${TAG} x` } }, 'tB')),
    ).toBe('NOT_FOUND');
  });

  it('each role sees school-wide plus own courses; pinned first; no draft course for learners', async () => {
    expect(await mine('sA')).toEqual(['School trip', 'Quiz on Friday']);
    expect(await mine('pA')).toEqual(['School trip', 'Quiz on Friday']);
    expect(await mine('sB')).toEqual(['School trip', 'B news']);
    // Teachers see their draft course too
    expect((await mine('tA')).sort()).toEqual(
      ['Draft course news', 'Quiz on Friday', 'School trip'].sort(),
    );
    expect(await mine('admin')).toHaveLength(4);
    // One course only (course page)
    expect(
      (await list('sA', { courseId: course.A })).list.map((x) => x.id),
    ).toEqual([ann.A]);
    expect(code(await gql(LIST, { i: { courseId: course.B } }, 'sA'))).toBe(
      'NOT_FOUND',
    );
  });

  it('markAnnouncementRead: unread goes down once; teachers see the read count', async () => {
    const before = (await list('sA')).unread;
    const read = await gql<{ markAnnouncementRead: Item }>(
      READ,
      { id: ann.A },
      'sA',
    );
    expect(read.data!.markAnnouncementRead).toMatchObject({
      isRead: true,
      readCount: null, // not shown to students
    });
    await gql(READ, { id: ann.A }, 'sA'); // twice: still one row
    expect((await list('sA')).unread).toBe(before - 1);

    const teacher = (await list('tA', { courseId: course.A })).list[0];
    expect(teacher.readCount).toBe(1);

    // Not visible to the viewer → does not exist
    expect(code(await gql(READ, { id: ann.B }, 'sA'))).toBe('NOT_FOUND');
    expect(code(await gql(READ, { id: ann.C }, 'sA'))).toBe('NOT_FOUND');
  });

  it('student tabs: unread / school filters with counts; mark all reads only what the viewer sees', async () => {
    const TABS = `query($i: AnnouncementsInquiry) { announcements(input: $i) { total all unread school list { id } } }`;
    type Tabs = {
      announcements: {
        total: number;
        all: number;
        unread: number;
        school: number;
        list: { id: string }[];
      };
    };
    // search = TAG: the seed's own announcements stay out of the counts
    const tabs = async (as: Key, extra: object = {}) =>
      (await gql<Tabs>(TABS, { i: { search: TAG, ...extra } }, as)).data!
        .announcements;

    // sA: school trip (unread) + course A (read in the test above)
    expect(await tabs('sA')).toMatchObject({
      total: 2,
      all: 2,
      unread: 1,
      school: 1,
    });
    const unreadTab = await tabs('sA', { unreadOnly: true });
    expect(unreadTab.list.map((x) => x.id)).toEqual([ann.school]);
    // The tab narrows `total`, never the tab counts
    expect(unreadTab).toMatchObject({ total: 1, all: 2, unread: 1 });
    expect(
      (await tabs('sA', { schoolOnly: true })).list.map((x) => x.id),
    ).toEqual([ann.school]);
    expect(
      (await tabs('sA', { schoolOnly: true, courseId: course.A })).total,
    ).toBe(0);

    const MARK_ALL = `mutation { markAllAnnouncementsRead }`;
    const marked = await gql<{ markAllAnnouncementsRead: number }>(
      MARK_ALL,
      {},
      'sA',
    );
    expect(marked.data!.markAllAnnouncementsRead).toBeGreaterThanOrEqual(1);
    expect((await tabs('sA')).unread).toBe(0);
    // Foreign course (B) and draft course (C): no read rows were made for sA
    expect(
      await prisma.announcementRead.count({
        where: { userId: id.sA, announcementId: { in: [ann.B, ann.C] } },
      }),
    ).toBe(0);
    // Another student's reads are untouched; a second click adds nothing
    expect((await tabs('sB')).unread).toBe(2);
    expect(
      (await gql<{ markAllAnnouncementsRead: number }>(MARK_ALL, {}, 'sA'))
        .data!.markAllAnnouncementsRead,
    ).toBe(0);
  });

  describe('teacher page: several courses, files, audience, search, archive', () => {
    const MULTI = `mutation($i: CreateCourseAnnouncementsInput!) { createCourseAnnouncements(input: $i) { id courseTitle files { id name } } }`;
    const ARCHIVE = `mutation($id: String!) { archiveAnnouncement(id: $id) { id } }`;
    const FULL = `query($i: AnnouncementsInquiry) { announcements(input: $i) { list { id title audience studentReads } } }`;
    const URL_Q = `query($a: String!) { courseFileUrl(assetId: $a) { url } }`;
    let file = '';
    let posted = '';

    beforeAll(async () => {
      const asset = await prisma.mediaAsset.create({
        data: {
          ownerId: id.tA,
          kind: 'DOCUMENT',
          originalName: 'Topics.pdf',
          mimeType: 'application/pdf',
          size: 1000n,
          status: 'READY',
        },
      });
      file = (
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { s3Key: `raw/${course.A}/${asset.id}.pdf` },
        })
      ).id;
    });

    const multi = (as: Key, courseIds: string[], extra: object = {}) =>
      gql<{
        createCourseAnnouncements: {
          id: string;
          courseTitle: string;
          files: { name: string }[];
        }[];
      }>(
        MULTI,
        {
          i: {
            courseIds,
            title: `${TAG} Topics`,
            body: 'Review sheet attached',
            ...extra,
          },
        },
        as,
      );

    it('one row per course, with the file; a course the teacher does not teach → nothing is created', async () => {
      const res = await multi('tA', [course.A], { fileAssetIds: [file] });
      posted = res.data!.createCourseAnnouncements[0].id;
      expect(
        res.data!.createCourseAnnouncements[0].files.map((f) => f.name),
      ).toEqual(['Topics.pdf']);

      expect(code(await multi('tA', [course.A, course.B]))).toBe('NOT_FOUND');
      expect(code(await multi('sA', [course.A]))).toBe('FORBIDDEN');
      // Another teacher cannot attach tA's file
      expect(
        code(await multi('tB', [course.B], { fileAssetIds: [file] })),
      ).toBe('NOT_FOUND');
      expect(
        await prisma.announcement.count({ where: { title: `${TAG} Topics` } }),
      ).toBe(1);
    });

    it('staff see audience and how many students read it; search finds by text', async () => {
      await gql(READ, { id: posted }, 'sA');
      await gql(READ, { id: posted }, 'pA'); // a parent's read is not a student read
      const res = await gql<{
        announcements: {
          list: { id: string; audience: number; studentReads: number }[];
        };
      }>(FULL, { i: { courseId: course.A, search: 'review SHEET' } }, 'tA');
      expect(res.data!.announcements.list).toEqual([
        { id: posted, title: `${TAG} Topics`, audience: 1, studentReads: 1 },
      ]);
    });

    it('the file opens for the course’s student, not for another student', async () => {
      expect(code(await gql(URL_Q, { a: file }, 'sA'))).toBeUndefined();
      expect(code(await gql(URL_Q, { a: file }, 'sB'))).toBe('NOT_FOUND');
    });

    it('archive: only the course’s teacher; then nobody sees it and it cannot be edited; audited', async () => {
      expect(code(await gql(ARCHIVE, { id: posted }, 'tB'))).toBe('NOT_FOUND');
      expect(code(await gql(ARCHIVE, { id: posted }, 'sA'))).toBe('FORBIDDEN');
      expect(code(await gql(ARCHIVE, { id: posted }, 'tA'))).toBeUndefined();
      expect(await mine('sA')).not.toContain('Topics');
      expect(code(await gql(URL_Q, { a: file }, 'sA'))).toBe('NOT_FOUND');
      expect(
        code(
          await gql(UPDATE, { i: { id: posted, title: `${TAG} Again` } }, 'tA'),
        ),
      ).toBe('NOT_FOUND');
      expect(
        await prisma.auditLog.count({
          where: { action: 'announcement.archive', entityId: posted },
        }),
      ).toBe(1);
    });
  });
});
