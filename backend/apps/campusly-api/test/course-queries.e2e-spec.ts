import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. A tiny school (year "E2E Queries 2092"), removed after:
//   class A: course A (ACTIVE) and course "A draft" (DRAFT), teacher tA, student sA, parent pA
//   class B: course B (ACTIVE), teacher tB, student sB
const PASSWORD = 'E2e-Queries-Password-1';
const TAG = 'E2E Queries';

type Key = 'admin' | 'tA' | 'tB' | 'sA' | 'sB' | 'pA';
type Outcome = 'OK' | 'NOT_FOUND' | 'FORBIDDEN';

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Detail {
  courseDetail: {
    title: string;
    gradeCategories: { name: string }[];
    modules: {
      title: string;
      lessons: { title: string; tutorNotes: string | null }[];
    }[];
  };
}

describe('Course queries: isolation and visibility (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const c = { A: '', draft: '', B: '' };
  let yearId: string;

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const outcome = (body: GqlBody<unknown>): Outcome =>
    (body.errors?.[0].extensions.code as Outcome | undefined) ?? 'OK';

  const DETAIL = `query($id: String!) { courseDetail(courseId: $id) {
    title gradeCategories { name } modules { title lessons { title tutorNotes } }
  } }`;
  const MY = `query($s: String) { myCourses(studentId: $s) { title } }`;
  const TEACHING = `{ teachingCourses { title status } }`;
  const COURSES = `query($f: CoursesFilter) { courses(filter: $f) { title } }`;
  const titles = (list: { title: string }[] | undefined) =>
    (list ?? []).map((x) => x.title.replace(`${TAG} `, ''));

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
    await prisma.lesson.deleteMany({ where: { module: { course } } });
    await prisma.module.deleteMany({ where: { course } });
    await prisma.gradeCategory.deleteMany({ where: { course } });
    await prisma.enrollment.deleteMany({ where: { course } });
    await prisma.courseTeacher.deleteMany({ where: { course } });
    await prisma.course.deleteMany({ where: course });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2092` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2092` } });
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
      ['sB', 'STUDENT'],
      ['pA', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-queries-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-queries-${key}`, password: PASSWORD });
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

    yearId = (
      await prisma.academicYear.create({
        data: {
          name: `${TAG} 2092`,
          startsAt: new Date('2092-09-01'),
          endsAt: new Date('2093-05-31'),
        },
      })
    ).id;
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const course = async (
      group: string,
      title: string,
      status: 'ACTIVE' | 'DRAFT',
      teacherId: string,
      studentId: string,
    ) => {
      const groupRow = await prisma.group.upsert({
        where: { academicYearId_name: { academicYearId: yearId, name: group } },
        create: { academicYearId: yearId, name: group },
        update: {},
      });
      return (
        await prisma.course.create({
          data: {
            academicYearId: yearId,
            groupId: groupRow.id,
            subjectId: subject.id,
            title: `${TAG} ${title}`,
            status,
            teachers: { create: { teacherId } },
            enrollments: { create: { studentId } },
            gradeCategories: { create: { name: 'Homework', weight: 100 } },
          },
        })
      ).id;
    };
    c.A = await course('E2E-QA', 'A', 'ACTIVE', id.tA, id.sA);
    c.draft = await course('E2E-QA', 'A draft', 'DRAFT', id.tA, id.sA);
    c.B = await course('E2E-QB', 'B', 'ACTIVE', id.tB, id.sB);

    // Course A content: what a student may and may not see
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    const week = (title: string, order: number, data: object) =>
      prisma.module.create({
        data: { courseId: c.A, title, order, ...data },
      });
    const published = await week('Week 1', 1, { publishedAt: past });
    await week('Week 2 hidden', 2, { publishedAt: past, isHidden: true });
    await week('Week 3 draft', 3, {});
    await week('Week 4 scheduled', 4, { publishedAt: future });
    await prisma.lesson.createMany({
      data: [
        { title: 'Published', publishedAt: past, order: 1 },
        { title: 'Draft', publishedAt: null, order: 2 },
        { title: 'Scheduled', publishedAt: future, order: 3 },
      ].map((l) => ({
        ...l,
        moduleId: published.id,
        type: 'READING' as const,
        tutorNotes: 'Answer: x = 2',
      })),
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  // ───────────── the isolation table: who → which query → expected ─────────────
  const UNKNOWN = '01a00000-0000-7000-8000-000000000000';
  const table: [string, Key, string, () => object, Outcome][] = [
    ['student: own course', 'sA', DETAIL, () => ({ id: c.A }), 'OK'],
    [
      'student: another class’s course',
      'sA',
      DETAIL,
      () => ({ id: c.B }),
      'NOT_FOUND',
    ],
    [
      'student: own DRAFT course',
      'sA',
      DETAIL,
      () => ({ id: c.draft }),
      'NOT_FOUND',
    ],
    ['parent: the child’s course', 'pA', DETAIL, () => ({ id: c.A }), 'OK'],
    [
      'parent: another child’s course',
      'pA',
      DETAIL,
      () => ({ id: c.B }),
      'NOT_FOUND',
    ],
    ['teacher: own DRAFT course', 'tA', DETAIL, () => ({ id: c.draft }), 'OK'],
    [
      'teacher: another teacher’s course',
      'tB',
      DETAIL,
      () => ({ id: c.A }),
      'NOT_FOUND',
    ],
    ['admin: any course', 'admin', DETAIL, () => ({ id: c.B }), 'OK'],
    [
      'admin: unknown course',
      'admin',
      DETAIL,
      () => ({ id: UNKNOWN }),
      'NOT_FOUND',
    ],
    [
      'parent: myCourses of another child',
      'pA',
      MY,
      () => ({ s: id.sB }),
      'NOT_FOUND',
    ],
    ['teacher: myCourses', 'tA', MY, () => ({}), 'FORBIDDEN'],
    ['student: teachingCourses', 'sA', TEACHING, () => ({}), 'FORBIDDEN'],
    ['teacher: admin course list', 'tA', COURSES, () => ({}), 'FORBIDDEN'],
  ];

  it.each(table)('%s → %s', async (_name, as, query, vars, expected) => {
    expect(outcome(await gql(query, vars(), as))).toBe(expected);
  });

  it('a student sees only published, not hidden content and no tutor notes', async () => {
    const res = await gql<Detail>(DETAIL, { id: c.A }, 'sA');
    expect(res.data!.courseDetail.modules).toEqual([
      { title: 'Week 1', lessons: [{ title: 'Published', tutorNotes: null }] },
    ]);
    expect(res.data!.courseDetail.gradeCategories).toEqual([
      { name: 'Homework' },
    ]);
  });

  it('the teacher sees every week and lesson with the tutor notes', async () => {
    const res = await gql<Detail>(DETAIL, { id: c.A }, 'tA');
    const { modules } = res.data!.courseDetail;
    expect(modules.map((m) => m.title)).toEqual([
      'Week 1',
      'Week 2 hidden',
      'Week 3 draft',
      'Week 4 scheduled',
    ]);
    expect(modules[0].lessons.map((l) => l.title)).toEqual([
      'Published',
      'Draft',
      'Scheduled',
    ]);
    expect(modules[0].lessons[0].tutorNotes).toBe('Answer: x = 2');
  });

  it('lists: myCourses ignores a student’s foreign id; teaching and admin lists', async () => {
    type List = Record<string, { title: string }[]>;
    // A student sending another student's id still gets their own courses (no draft)
    const mine = await gql<List>(MY, { s: id.sB }, 'sA');
    expect(titles(mine.data?.myCourses)).toEqual(['A']);
    // A parent with one child does not have to pick
    const child = await gql<List>(MY, {}, 'pA');
    expect(titles(child.data?.myCourses)).toEqual(['A']);

    const teaching = await gql<List>(TEACHING, {}, 'tA');
    expect(titles(teaching.data?.teachingCourses)).toEqual(['A', 'A draft']);

    const all = await gql<List>(
      COURSES,
      { f: { academicYearId: yearId } },
      'admin',
    );
    expect(titles(all.data?.courses)).toEqual(['A', 'A draft', 'B']);
    const ofB = await gql<List>(
      COURSES,
      { f: { academicYearId: yearId, teacherId: id.tB } },
      'admin',
    );
    expect(titles(ofB.data?.courses)).toEqual(['B']);
  });
});
