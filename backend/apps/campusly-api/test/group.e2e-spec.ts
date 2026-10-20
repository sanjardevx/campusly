import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Uses its own year "E2E Group 2095" (not current) and subjects
// named "E2E Group ...". Everything it creates is removed after.
const PASSWORD = 'E2e-Group-Password-1';
const TAG = 'E2E Group';

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface GroupRow {
  id: string;
  name: string;
  status: string;
  studentCount: number;
}

describe('Subjects, classes and moving students (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let yearId: string;
  let studentId: string;
  const g = { one: '', two: '' };
  const course = { oneWhole: '', oneSplit: '', twoWhole: '' };

  async function gql<T>(
    query: string,
    variables: object = {},
    token: string = adminToken,
  ) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;
  const tokenFor = async (loginId: string) =>
    (
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ loginId, password: PASSWORD })
      ).body as { accessToken: string }
    ).accessToken;

  const CREATE_GROUP = `mutation($i: CreateGroupInput!) {
    createGroup(input: $i) { id name status studentCount }
  }`;
  const UPDATE_GROUP = `mutation($i: UpdateGroupInput!) {
    updateGroup(input: $i) { id name status studentCount }
  }`;
  const MOVE = `mutation($i: MoveStudentInput!) {
    moveStudent(input: $i) { id name studentCount }
  }`;
  const GROUPS = `query($y: String) { groups(academicYearId: $y) { id name studentCount } }`;
  const CREATE_SUBJECT = `mutation($i: CreateSubjectInput!) { createSubject(input: $i) { id name status } }`;
  const UPDATE_SUBJECT = `mutation($i: UpdateSubjectInput!) { updateSubject(input: $i) { id name status } }`;
  const SUBJECTS = `query($a: Boolean) { subjects(includeArchived: $a) { name status } }`;

  /** The student's enrollment status in each test course (missing = no row) */
  async function enrollments() {
    const rows = await prisma.enrollment.findMany({ where: { studentId } });
    const status = (courseId: string) =>
      rows.find((r) => r.courseId === courseId)?.status ?? 'NONE';
    return {
      oneWhole: status(course.oneWhole),
      oneSplit: status(course.oneSplit),
      twoWhole: status(course.twoWhole),
    };
  }

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { loginId: { startsWith: 'e2e-group-' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.groupMember.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2095` } },
    });
    await prisma.subject.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2095` } });
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
    for (const [loginId, role] of [
      ['e2e-group-admin', 'ADMIN'],
      ['e2e-group-student', 'STUDENT'],
    ] as const) {
      const user = await prisma.user.create({
        data: { loginId, role, passwordHash, firstName: 'E2e', lastName: TAG },
      });
      if (role === 'STUDENT') studentId = user.id;
    }
    adminToken = await tokenFor('e2e-group-admin');
    studentToken = await tokenFor('e2e-group-student');

    yearId = (
      await prisma.academicYear.create({
        data: {
          name: `${TAG} 2095`,
          startsAt: new Date('2095-09-01'),
          endsAt: new Date('2096-05-31'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('subjects: create, duplicate → CONFLICT, archive hides it from non-admin lists', async () => {
    const created = await gql<{ createSubject: { id: string } }>(
      CREATE_SUBJECT,
      { i: { name: `${TAG} Physics` } },
    );
    const id = created.data!.createSubject.id;
    expect(
      code(await gql(CREATE_SUBJECT, { i: { name: `${TAG} Physics` } })),
    ).toBe('CONFLICT');

    await gql(UPDATE_SUBJECT, { i: { id, status: 'ARCHIVED' } });
    const names = async (token: string) =>
      (
        await gql<{ subjects: { name: string }[] }>(
          SUBJECTS,
          { a: true },
          token,
        )
      ).data!.subjects.map((s) => s.name);
    expect(await names(adminToken)).toContain(`${TAG} Physics`);
    // includeArchived is ignored for a student
    expect(await names(studentToken)).not.toContain(`${TAG} Physics`);
    expect(
      code(await gql(CREATE_SUBJECT, { i: { name: 'Nope' } }, studentToken)),
    ).toBe('FORBIDDEN');
  });

  it('classes: created in upper case, unique per year, admin only', async () => {
    const one = await gql<{ createGroup: GroupRow }>(CREATE_GROUP, {
      i: { academicYearId: yearId, name: 'e2e-1' },
    });
    expect(one.data!.createGroup).toMatchObject({
      name: 'E2E-1',
      status: 'ACTIVE',
      studentCount: 0,
    });
    g.one = one.data!.createGroup.id;
    g.two = (
      await gql<{ createGroup: GroupRow }>(CREATE_GROUP, {
        i: { academicYearId: yearId, name: 'E2E-2' },
      })
    ).data!.createGroup.id;

    expect(
      code(
        await gql(CREATE_GROUP, {
          i: { academicYearId: yearId, name: 'E2E-1' },
        }),
      ),
    ).toBe('CONFLICT');
    expect(
      code(
        await gql(CREATE_GROUP, { i: { academicYearId: yearId, name: '9 A' } }),
      ),
    ).toBe('BAD_REQUEST');
    expect(code(await gql(GROUPS, { y: yearId }, studentToken))).toBe(
      'FORBIDDEN',
    );

    // Courses to watch: whole-class and split group in E2E-1, whole-class in E2E-2
    const subject = await prisma.subject.create({
      data: { name: `${TAG} Math` },
    });
    const make = async (groupId: string, title: string, isSplitGroup = false) =>
      (
        await prisma.course.create({
          data: {
            academicYearId: yearId,
            groupId,
            subjectId: subject.id,
            title: `${TAG} ${title}`,
            isSplitGroup,
          },
        })
      ).id;
    course.oneWhole = await make(g.one, 'Math 1');
    course.oneSplit = await make(g.one, 'Math 1 split', true);
    course.twoWhole = await make(g.two, 'Math 2');
  });

  it('moveStudent: joins the class and its whole-class courses (not split groups)', async () => {
    const res = await gql<{ moveStudent: GroupRow }>(MOVE, {
      i: { studentId, groupId: g.one },
    });
    expect(res.data!.moveStudent).toMatchObject({
      name: 'E2E-1',
      studentCount: 1,
    });
    expect(await enrollments()).toEqual({
      oneWhole: 'ACTIVE',
      oneSplit: 'NONE',
      twoWhole: 'NONE',
    });
    expect(code(await gql(MOVE, { i: { studentId, groupId: g.one } }))).toBe(
      'BAD_REQUEST',
    );
  });

  it('moveStudent to another class: old courses DROPPED (rows kept), new ones ACTIVE', async () => {
    // The split-group teacher had picked this student by hand
    await prisma.enrollment.create({
      data: { courseId: course.oneSplit, studentId },
    });
    await gql(MOVE, { i: { studentId, groupId: g.two } });

    expect(await enrollments()).toEqual({
      oneWhole: 'DROPPED',
      oneSplit: 'DROPPED',
      twoWhole: 'ACTIVE',
    });
    const counts = (
      await gql<{ groups: GroupRow[] }>(GROUPS, { y: yearId })
    ).data!.groups.map((x) => [x.name, x.studentCount]);
    expect(counts).toEqual([
      ['E2E-1', 0],
      ['E2E-2', 1],
    ]);
    expect(
      await prisma.groupMember.findUnique({
        where: { groupId_studentId: { groupId: g.one, studentId } },
      }),
    ).toMatchObject({ leftAt: expect.any(Date) as Date });
  });

  it('moving back reuses the same rows; archiving a class with students is refused', async () => {
    const before = await prisma.enrollment.findFirstOrThrow({
      where: { studentId, courseId: course.oneWhole },
    });
    await gql(MOVE, { i: { studentId, groupId: g.one } });
    const after = await prisma.enrollment.findFirstOrThrow({
      where: { studentId, courseId: course.oneWhole },
    });
    expect(after).toMatchObject({
      id: before.id,
      status: 'ACTIVE',
      droppedAt: null,
    });
    // The hand-picked split group is not restored automatically
    expect((await enrollments()).oneSplit).toBe('DROPPED');

    expect(
      code(await gql(UPDATE_GROUP, { i: { id: g.one, status: 'ARCHIVED' } })),
    ).toBe('BAD_REQUEST');
    const archived = await gql<{ updateGroup: GroupRow }>(UPDATE_GROUP, {
      i: { id: g.two, status: 'ARCHIVED' },
    });
    expect(archived.data!.updateGroup.status).toBe('ARCHIVED');
    // An archived class takes no new students
    expect(code(await gql(MOVE, { i: { studentId, groupId: g.two } }))).toBe(
      'NOT_FOUND',
    );

    expect(
      await prisma.auditLog.count({
        where: { action: 'student.moveClass', entityId: studentId },
      }),
    ).toBe(3);
  });
});
