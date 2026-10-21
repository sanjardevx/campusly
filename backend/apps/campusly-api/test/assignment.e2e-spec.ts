import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Year "E2E Assign 2088": course A (teacher tA, student sA,
// parent pA) and course B (teacher tB, student sB), each with the default grade categories
// and one lesson. Everything is removed after.
const PASSWORD = 'E2e-Assign-Password-1';
const TAG = 'E2E Assign';

type Key = 'tA' | 'tB' | 'sA' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Row {
  id: string;
  title: string;
  type: string;
  categoryName: string;
  maxScore: number;
  maxAttempts: number;
  acceptedFileTypes: string[];
  finalAnswer: string | null;
  publishedAt: string | null;
}

describe('Assignments: create, publish, who sees what (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '' };
  const lessonOf = { A: '', B: '' };
  const categoryOf = { A: '', B: '' };
  const a = { homework: '', exam: '' };

  async function gql<T>(query: string, variables: object, as: Key = 'tA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const FIELDS =
    'id title type categoryName maxScore maxAttempts acceptedFileTypes finalAnswer publishedAt';
  const CREATE = `mutation($i: CreateAssignmentInput!) { createAssignment(input: $i) { ${FIELDS} } }`;
  const UPDATE = `mutation($i: UpdateAssignmentInput!) { updateAssignment(input: $i) { ${FIELDS} } }`;
  const PUBLISH = `mutation($i: PublishInput!) { publishAssignment(input: $i) { ${FIELDS} } }`;
  const LIST = `query($c: String!) { courseAssignments(courseId: $c) { ${FIELDS} } }`;
  const ONE = `query($id: String!) { assignment(id: $id) { ${FIELDS} } }`;
  const homework = (extra: object = {}) => ({
    i: {
      courseId: course.A,
      type: 'HOMEWORK',
      title: 'Homework 1: Linear equations',
      maxScore: 20,
      dueAt: '2088-10-10T13:00:00.000Z',
      finalAnswer: 'x = 4',
      ...extra,
    },
  });
  const list = async (as: Key, courseId = course.A) =>
    gql<{ courseAssignments: Row[] }>(LIST, { c: courseId }, as);

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
    await prisma.submission.deleteMany({
      where: { assignment: { course: courses } },
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
            loginId: `e2e-assign-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-assign-${key}`, password: PASSWORD });
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
        data: { academicYearId: year.id, name: `E2E-AS${key}` },
      });
      const row = await prisma.course.create({
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
          modules: {
            create: {
              title: 'Week 1',
              order: 1,
              lessons: { create: { title: 'L1', type: 'READING', order: 1 } },
            },
          },
        },
        include: {
          gradeCategories: true,
          modules: { include: { lessons: true } },
        },
      });
      course[key] = row.id;
      categoryOf[key] = row.gradeCategories[0].id;
      lessonOf[key] = row.modules[0].lessons[0].id;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('create: default category by type, a draft, the final answer visible to the teacher', async () => {
    const res = await gql<{ createAssignment: Row }>(
      CREATE,
      homework({ lessonId: lessonOf.A }),
    );
    expect(res.data!.createAssignment).toMatchObject({
      categoryName: 'Homework',
      maxScore: 20,
      maxAttempts: 1,
      acceptedFileTypes: ['pdf', 'docx', 'jpg', 'png'],
      finalAnswer: 'x = 4',
      publishedAt: null,
    });
    a.homework = res.data!.createAssignment.id;

    // An exam is offline: no attempts, no files, whatever is sent
    const exam = await gql<{ createAssignment: Row }>(
      CREATE,
      homework({
        type: 'EXAM',
        title: 'Quarter 1 Exam',
        maxScore: 7.5,
        maxAttempts: 3,
        acceptedFileTypes: ['pdf'],
      }),
    );
    expect(exam.data!.createAssignment).toMatchObject({
      categoryName: 'Exams',
      maxScore: 7.5,
      maxAttempts: 0,
      acceptedFileTypes: [],
    });
    a.exam = exam.data!.createAssignment.id;
  });

  it('create refuses another course’s category or lesson, bad values and strangers', async () => {
    expect(
      code(await gql(CREATE, homework({ categoryId: categoryOf.B }))),
    ).toBe('NOT_FOUND');
    expect(code(await gql(CREATE, homework({ lessonId: lessonOf.B })))).toBe(
      'NOT_FOUND',
    );
    expect(code(await gql(CREATE, homework({ maxScore: 7.555 })))).toBe(
      'BAD_REQUEST',
    );
    expect(
      code(await gql(CREATE, homework({ acceptedFileTypes: ['exe'] }))),
    ).toBe('BAD_REQUEST');
    expect(code(await gql(CREATE, homework(), 'tB'))).toBe('NOT_FOUND');
    expect(code(await gql(CREATE, homework(), 'sA'))).toBe('FORBIDDEN');
  });

  it('students and parents see only published assignments, never the final answer', async () => {
    expect((await list('sA')).data!.courseAssignments).toEqual([]);

    await gql(PUBLISH, { i: { id: a.homework, publish: true } });
    const student = (await list('sA')).data!.courseAssignments;
    expect(student.map((x) => x.title)).toEqual([
      'Homework 1: Linear equations',
    ]);
    expect(student[0].finalAnswer).toBeNull();
    expect((await list('pA')).data!.courseAssignments).toHaveLength(1);

    // The teacher sees the draft exam too
    expect((await list('tA')).data!.courseAssignments).toHaveLength(2);
  });

  // ───────────── isolation: who → which assignment → expected ─────────────
  const table: [string, Key, () => string, string][] = [
    [
      'student: published assignment of own course',
      'sA',
      () => a.homework,
      'OK',
    ],
    [
      'student: draft assignment of own course',
      'sA',
      () => a.exam,
      'NOT_FOUND',
    ],
    [
      'student: assignment of another class',
      'sB',
      () => a.homework,
      'NOT_FOUND',
    ],
    ['parent: the child’s assignment', 'pA', () => a.homework, 'OK'],
    ['teacher: own draft', 'tA', () => a.exam, 'OK'],
    [
      'teacher: another teacher’s assignment',
      'tB',
      () => a.homework,
      'NOT_FOUND',
    ],
  ];
  it.each(table)('%s → %s', async (_name, as, assignmentId, expected) => {
    const res = await gql(ONE, { id: assignmentId() }, as);
    expect(code(res) ?? 'OK').toBe(expected);
  });

  it('course list of another class → NOT_FOUND', async () => {
    expect(code(await list('sB', course.A))).toBe('NOT_FOUND');
  });

  it('after students work on it: max score locked once graded, no going back to draft', async () => {
    await prisma.submission.create({
      data: {
        assignmentId: a.homework,
        studentId: id.sA,
        status: 'GRADED',
        submittedAt: new Date(),
        score: 18,
      },
    });
    expect(
      code(await gql(UPDATE, { i: { id: a.homework, maxScore: 10 } })),
    ).toBe('BAD_REQUEST');
    // The same max score (or other fields) is fine
    const renamed = await gql<{ updateAssignment: Row }>(UPDATE, {
      i: { id: a.homework, maxScore: 20, title: 'Homework 1 (updated)' },
    });
    expect(renamed.data!.updateAssignment.title).toBe('Homework 1 (updated)');

    expect(
      code(await gql(PUBLISH, { i: { id: a.homework, publish: false } })),
    ).toBe('BAD_REQUEST');

    // An exam stays offline
    const exam = await gql<{ updateAssignment: Row }>(UPDATE, {
      i: { id: a.exam, maxAttempts: 2 },
    });
    expect(exam.data!.updateAssignment.maxAttempts).toBe(0);
  });
});
