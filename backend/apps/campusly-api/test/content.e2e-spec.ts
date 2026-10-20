import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. One course "E2E Content" (year 2093) with its teacher, a teacher
// of nothing and an enrolled student. Everything it creates is removed after.
const PASSWORD = 'E2e-Content-Password-1';
const TAG = 'E2E Content';

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface LessonRow {
  id: string;
  title: string;
  type: string;
  body: string | null;
  completionType: string;
  order: number;
  publishedAt: string | null;
}
interface ModuleRow {
  id: string;
  title: string;
  order: number;
  startsAt: string | null;
  isHidden: boolean;
  publishedAt: string | null;
  lessons: LessonRow[];
}

describe('Modules and lessons (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const token: Record<'owner' | 'stranger' | 'student', string> = {} as never;
  let courseId: string;
  const m = { one: '', two: '' };
  const l = { video: '', link: '' };

  async function gql<T>(query: string, variables: object, as = token.owner) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${as}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const LESSON = 'id title type body completionType order publishedAt';
  const MODULE = `id title order startsAt isHidden publishedAt lessons { ${LESSON} }`;
  const CREATE_MODULE = `mutation($i: CreateModuleInput!) { createModule(input: $i) { ${MODULE} } }`;
  const UPDATE_MODULE = `mutation($i: UpdateModuleInput!) { updateModule(input: $i) { ${MODULE} } }`;
  const PUBLISH_MODULE = `mutation($i: PublishInput!) { publishModule(input: $i) { ${MODULE} } }`;
  const REORDER_MODULES = `mutation($i: ReorderInput!) { reorderModules(input: $i) { id order } }`;
  const CREATE_LESSON = `mutation($i: CreateLessonInput!) { createLesson(input: $i) { ${LESSON} } }`;
  const UPDATE_LESSON = `mutation($i: UpdateLessonInput!) { updateLesson(input: $i) { ${LESSON} } }`;
  const PUBLISH_LESSON = `mutation($i: PublishInput!) { publishLesson(input: $i) { ${LESSON} } }`;
  const REORDER_LESSONS = `mutation($i: ReorderInput!) { reorderLessons(input: $i) { lessons { id order } } }`;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { loginId: { startsWith: 'e2e-content-' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const course = { title: { startsWith: TAG } };
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.lesson.deleteMany({ where: { module: { course } } });
    await prisma.module.deleteMany({ where: { course } });
    await prisma.enrollment.deleteMany({ where: { course } });
    await prisma.courseTeacher.deleteMany({ where: { course } });
    await prisma.course.deleteMany({ where: course });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2093` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2093` } });
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
    const ids: Record<string, string> = {};
    for (const [key, role] of [
      ['owner', 'TEACHER'],
      ['stranger', 'TEACHER'],
      ['student', 'STUDENT'],
    ] as const) {
      ids[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-content-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-content-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2093`,
        startsAt: new Date('2093-09-01'),
        endsAt: new Date('2094-05-31'),
      },
    });
    const group = await prisma.group.create({
      data: { academicYearId: year.id, name: 'E2E-CT' },
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
          teachers: { create: { teacherId: ids.owner } },
          enrollments: { create: { studentId: ids.student } },
        },
      })
    ).id;
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('modules: added at the end; only the course’s teachers may change them', async () => {
    const one = await gql<{ createModule: ModuleRow }>(CREATE_MODULE, {
      i: { courseId, title: 'Week 1', startsAt: '2093-09-02' },
    });
    expect(one.data!.createModule).toMatchObject({
      order: 1,
      startsAt: '2093-09-02',
      publishedAt: null,
      isHidden: false,
      lessons: [],
    });
    m.one = one.data!.createModule.id;
    m.two = (
      await gql<{ createModule: ModuleRow }>(CREATE_MODULE, {
        i: { courseId, title: 'Week 2' },
      })
    ).data!.createModule.id;

    // The end before the start (the start is kept from before)
    expect(
      code(
        await gql(UPDATE_MODULE, { i: { id: m.one, endsAt: '2093-09-01' } }),
      ),
    ).toBe('BAD_REQUEST');
    // Another teacher: the course "does not exist" for them
    expect(
      code(
        await gql(
          CREATE_MODULE,
          { i: { courseId, title: 'Hack' } },
          token.stranger,
        ),
      ),
    ).toBe('NOT_FOUND');
    expect(
      code(
        await gql(
          UPDATE_MODULE,
          { i: { id: m.one, title: 'Hack' } },
          token.stranger,
        ),
      ),
    ).toBe('NOT_FOUND');
    // A student is stopped by the role guard
    expect(
      code(
        await gql(
          UPDATE_MODULE,
          { i: { id: m.one, title: 'Hack' } },
          token.student,
        ),
      ),
    ).toBe('FORBIDDEN');
  });

  it('modules: reorder needs every module exactly once', async () => {
    const res = await gql<{ reorderModules: ModuleRow[] }>(REORDER_MODULES, {
      i: { parentId: courseId, ids: [m.two, m.one] },
    });
    expect(res.data!.reorderModules).toEqual([
      { id: m.two, order: 1 },
      { id: m.one, order: 2 },
    ]);
    expect(
      code(
        await gql(REORDER_MODULES, { i: { parentId: courseId, ids: [m.one] } }),
      ),
    ).toBe('BAD_REQUEST');
  });

  it('lessons: defaults by type, safe links only, reorder', async () => {
    const video = await gql<{ createLesson: LessonRow }>(CREATE_LESSON, {
      i: { moduleId: m.one, title: 'Intro video', type: 'VIDEO' },
    });
    expect(video.data!.createLesson).toMatchObject({
      completionType: 'VIDEO_WATCHED',
      order: 1,
      publishedAt: null,
    });
    l.video = video.data!.createLesson.id;

    expect(
      code(
        await gql(CREATE_LESSON, {
          i: {
            moduleId: m.one,
            title: 'Bad link',
            type: 'LINK',
            body: 'javascript:alert(1)',
          },
        }),
      ),
    ).toBe('BAD_REQUEST');
    expect(
      code(
        await gql(CREATE_LESSON, {
          i: { moduleId: m.one, title: 'No link', type: 'LINK' },
        }),
      ),
    ).toBe('BAD_REQUEST');

    const link = await gql<{ createLesson: LessonRow }>(CREATE_LESSON, {
      i: {
        moduleId: m.one,
        title: 'Khan Academy',
        type: 'LINK',
        body: 'https://www.khanacademy.org',
      },
    });
    expect(link.data!.createLesson).toMatchObject({
      completionType: 'VIEW',
      order: 2,
    });
    l.link = link.data!.createLesson.id;

    const renamed = await gql<{ updateLesson: LessonRow }>(UPDATE_LESSON, {
      i: { id: l.link, title: 'Khan Academy: quadratics' },
    });
    expect(renamed.data!.updateLesson.title).toBe('Khan Academy: quadratics');
    expect(
      code(
        await gql(
          UPDATE_LESSON,
          { i: { id: l.video, title: 'Hack' } },
          token.stranger,
        ),
      ),
    ).toBe('NOT_FOUND');

    const reordered = await gql<{ reorderLessons: ModuleRow }>(
      REORDER_LESSONS,
      { i: { parentId: m.one, ids: [l.link, l.video] } },
    );
    expect(reordered.data!.reorderLessons.lessons).toEqual([
      { id: l.link, order: 1 },
      { id: l.video, order: 2 },
    ]);
  });

  it('publish now, schedule, back to draft, hide', async () => {
    const now = await gql<{ publishModule: ModuleRow }>(PUBLISH_MODULE, {
      i: { id: m.one, publish: true },
    });
    expect(now.data!.publishModule.publishedAt).not.toBeNull();

    const later = '2093-10-01T04:00:00.000Z';
    const scheduled = await gql<{ publishLesson: LessonRow }>(PUBLISH_LESSON, {
      i: { id: l.video, publish: true, publishAt: later },
    });
    expect(scheduled.data!.publishLesson.publishedAt).toBe(later);

    const draft = await gql<{ publishLesson: LessonRow }>(PUBLISH_LESSON, {
      i: { id: l.video, publish: false },
    });
    expect(draft.data!.publishLesson.publishedAt).toBeNull();

    // Hiding keeps the publish date, so un-hiding restores it
    const hidden = await gql<{ updateModule: ModuleRow }>(UPDATE_MODULE, {
      i: { id: m.one, isHidden: true },
    });
    expect(hidden.data!.updateModule).toMatchObject({
      isHidden: true,
      publishedAt: now.data!.publishModule.publishedAt,
    });
  });

  it('an archived course is read-only', async () => {
    await prisma.course.update({
      where: { id: courseId },
      data: { status: 'ARCHIVED' },
    });
    expect(
      code(await gql(CREATE_MODULE, { i: { courseId, title: 'Week 3' } })),
    ).toBe('BAD_REQUEST');
  });
});
