import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { SchoolService } from '../src/components/school/school.service';

// Needs Docker Postgres + Redis. Uses its own year "E2E Course 2094" (not current), class E2E-C1
// with two students, three teachers. Everything it creates is removed after.
const PASSWORD = 'E2e-Course-Password-1';
const TAG = 'E2E Course';

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface CourseRow {
  id: string;
  title: string;
  status: string;
  isSplitGroup: boolean;
  groupName: string;
  subjectName: string;
  teachers: { id: string; role: string }[];
  studentCount: number;
}

describe('Course setup (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id: Record<'admin' | 't1' | 't2' | 't3' | 's1' | 's2' | 'out', string> =
    {} as never;
  const token: Record<'admin' | 't1' | 't3', string> = {} as never;
  let groupId: string;
  let subjectId: string;
  let wholeId: string;
  let splitId: string;

  async function gql<T>(query: string, variables: object, as = token.admin) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${as}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const FIELDS = `id title status isSplitGroup groupName subjectName teachers { id role } studentCount`;
  const CREATE = `mutation($i: CreateCourseInput!) { createCourse(input: $i) { ${FIELDS} } }`;
  const UPDATE = `mutation($i: UpdateCourseInput!) { updateCourse(input: $i) { ${FIELDS} } }`;
  const TEACHERS = `mutation($i: SetCourseTeachersInput!) { setCourseTeachers(input: $i) { ${FIELDS} } }`;
  const STUDENTS = `mutation($i: SetCourseStudentsInput!) { setCourseStudents(input: $i) { ${FIELDS} } }`;

  async function enrollmentStatus(courseId: string) {
    const rows = await prisma.enrollment.findMany({ where: { courseId } });
    return Object.fromEntries(
      rows.map((r) => [r.studentId === id.s1 ? 's1' : 's2', r.status]),
    );
  }

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { loginId: { startsWith: 'e2e-course-' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.groupMember.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2094` } },
    });
    await prisma.subject.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2094` } });
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
      ['t1', 'TEACHER'],
      ['t2', 'TEACHER'],
      ['t3', 'TEACHER'],
      ['s1', 'STUDENT'],
      ['s2', 'STUDENT'],
      ['out', 'STUDENT'],
    ] as const) {
      const user = await prisma.user.create({
        data: {
          loginId: `e2e-course-${key}`,
          role,
          passwordHash,
          firstName: key,
          lastName: TAG,
        },
      });
      id[key] = user.id;
    }
    for (const key of ['admin', 't1', 't3'] as const) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-course-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2094`,
        startsAt: new Date('2094-09-01'),
        endsAt: new Date('2095-05-31'),
      },
    });
    groupId = (
      await prisma.group.create({
        data: {
          academicYearId: year.id,
          name: 'E2E-C1',
          members: {
            create: [{ studentId: id.s1 }, { studentId: id.s2 }],
          },
        },
      })
    ).id;
    subjectId = (await prisma.subject.create({ data: { name: `${TAG} Math` } }))
      .id;
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('createCourse: whole class enrolled, owner first, school default categories', async () => {
    const res = await gql<{ createCourse: CourseRow }>(CREATE, {
      i: { groupId, subjectId, teacherIds: [id.t1, id.t2] },
    });
    const course = res.data!.createCourse;
    wholeId = course.id;

    expect(course).toMatchObject({
      title: `${TAG} Math · E2E-C1`,
      status: 'DRAFT',
      isSplitGroup: false,
      studentCount: 2,
      teachers: [
        { id: id.t1, role: 'OWNER' },
        { id: id.t2, role: 'ASSISTANT' },
      ],
    });

    const settings = await app.get(SchoolService).getSettings();
    const categories = await prisma.gradeCategory.findMany({
      where: { courseId: wholeId },
      orderBy: { order: 'asc' },
    });
    expect(categories.map((c) => [c.name, c.weight])).toEqual([
      ['Homework', settings.defaultHomeworkWeight],
      ['Quizzes', settings.defaultQuizWeight],
      ['Exams', settings.defaultExamWeight],
    ]);
  });

  it('createCourse rejects wrong input and non-admins', async () => {
    // A student id as a teacher
    expect(
      code(
        await gql(CREATE, {
          i: { groupId, subjectId, teacherIds: [id.s1] },
        }),
      ),
    ).toBe('BAD_REQUEST');
    // Students are picked only for a split group
    expect(
      code(
        await gql(CREATE, {
          i: { groupId, subjectId, teacherIds: [id.t1], studentIds: [id.s1] },
        }),
      ),
    ).toBe('BAD_REQUEST');
    expect(
      code(
        await gql(
          CREATE,
          { i: { groupId, subjectId, teacherIds: [id.t1] } },
          token.t1,
        ),
      ),
    ).toBe('FORBIDDEN');
  });

  it('split group: picked students only; its teacher can change the list', async () => {
    const res = await gql<{ createCourse: CourseRow }>(CREATE, {
      i: {
        groupId,
        subjectId,
        title: `${TAG} Korean group 1`,
        teacherIds: [id.t1],
        isSplitGroup: true,
        studentIds: [id.s1],
      },
    });
    splitId = res.data!.createCourse.id;
    expect(res.data!.createCourse.studentCount).toBe(1);

    const changed = await gql<{ setCourseStudents: CourseRow }>(
      STUDENTS,
      { i: { courseId: splitId, studentIds: [id.s2] } },
      token.t1,
    );
    expect(changed.data!.setCourseStudents.studentCount).toBe(1);
    expect(await enrollmentStatus(splitId)).toEqual({
      s1: 'DROPPED',
      s2: 'ACTIVE',
    });
  });

  it('setCourseStudents: other teachers, outside students and whole-class courses are refused', async () => {
    expect(
      code(
        await gql(
          STUDENTS,
          { i: { courseId: splitId, studentIds: [id.s1] } },
          token.t3,
        ),
      ),
    ).toBe('NOT_FOUND');
    expect(
      code(
        await gql(
          STUDENTS,
          { i: { courseId: splitId, studentIds: [id.out] } },
          token.t1,
        ),
      ),
    ).toBe('BAD_REQUEST');
    expect(
      code(
        await gql(
          STUDENTS,
          { i: { courseId: wholeId, studentIds: [id.s1] } },
          token.t1,
        ),
      ),
    ).toBe('BAD_REQUEST');
  });

  it('setCourseTeachers and updateCourse (admin), all audited', async () => {
    const teachers = await gql<{ setCourseTeachers: CourseRow }>(TEACHERS, {
      i: { courseId: wholeId, teacherIds: [id.t2, id.t3] },
    });
    expect(teachers.data!.setCourseTeachers.teachers).toEqual([
      { id: id.t2, role: 'OWNER' },
      { id: id.t3, role: 'ASSISTANT' },
    ]);

    const updated = await gql<{ updateCourse: CourseRow }>(UPDATE, {
      i: { id: wholeId, status: 'ACTIVE', title: `${TAG} Algebra · E2E-C1` },
    });
    expect(updated.data!.updateCourse).toMatchObject({
      status: 'ACTIVE',
      title: `${TAG} Algebra · E2E-C1`,
    });

    const actions = await prisma.auditLog.findMany({
      where: { entityId: { in: [wholeId, splitId] } },
      select: { action: true },
    });
    expect(actions.map((a) => a.action).sort()).toEqual([
      'course.create',
      'course.create',
      'course.setStudents',
      'course.setTeachers',
      'course.update',
    ]);
  });
});
