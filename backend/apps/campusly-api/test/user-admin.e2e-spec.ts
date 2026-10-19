import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

// Needs Docker Postgres + Redis. Creates its own admin, school year, class and course (all named
// "E2E ...") and removes everything afterwards, so it works on the empty CI database.
const ADMIN = { loginId: 'e2e-admin', password: 'E2e-Admin-Password-1' };
const PHONE = '+998 99 000-11-22'; // stored as +998990001122, parent login 990001122

interface Slip {
  userId: string;
  loginId: string;
  role: string;
  tempPassword: string | null;
  isNew: boolean;
}
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}

describe('User admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let groupId: string;
  let courseId: string;
  const createdUserIds: string[] = [];
  let countersBefore: { year: number; roleCode: number; lastValue: number }[];

  const login = (loginId: string, password: string) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ loginId, password });

  async function gql<T>(query: string, variables: object, token = adminToken) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }

  const CREATE_STUDENT = `mutation($input: CreateStudentInput!) {
    createStudent(input: $input) {
      student { userId loginId role tempPassword isNew }
      parent { userId loginId role tempPassword isNew }
    }
  }`;
  const studentInput = (firstName: string, parentPhone = PHONE) => ({
    input: {
      firstName,
      lastName: 'E2e',
      groupId,
      parent: {
        phone: parentPhone,
        firstName: 'Parent',
        lastName: 'E2e',
        relation: 'FATHER',
      },
    },
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const redis = app.get(RedisService);
    const keys = await redis.keys('login:fail:*');
    if (keys.length) await redis.del(...keys);

    countersBefore = await prisma.idCounter.findMany();
    const admin = await prisma.user.create({
      data: {
        loginId: ADMIN.loginId,
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(ADMIN.password, 10),
        firstName: 'E2e',
        lastName: 'Admin',
      },
    });
    createdUserIds.push(admin.id);
    const year = await prisma.academicYear.create({
      data: {
        name: 'E2E 2099',
        startsAt: new Date('2099-09-01'),
        endsAt: new Date('2100-05-31'),
      },
    });
    const group = await prisma.group.create({
      data: { academicYearId: year.id, name: 'E2E-9A' },
    });
    const subject = await prisma.subject.create({
      data: { name: 'E2E Subject' },
    });
    const course = await prisma.course.create({
      data: {
        academicYearId: year.id,
        groupId: group.id,
        subjectId: subject.id,
        title: 'E2E Subject · E2E-9A',
        status: 'ACTIVE',
      },
    });
    groupId = group.id;
    courseId = course.id;
    adminToken = (
      (await login(ADMIN.loginId, ADMIN.password)).body as {
        accessToken: string;
      }
    ).accessToken;
  });

  afterAll(async () => {
    // Every user created by the test (the admin plus students/teachers/parents it created)
    const users = await prisma.user.findMany({
      where: {
        OR: [{ id: { in: createdUserIds } }, { lastName: 'E2e' }],
      },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.teacherProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.group.deleteMany({ where: { id: groupId } });
    await prisma.subject.deleteMany({ where: { name: 'E2E Subject' } });
    await prisma.academicYear.deleteMany({ where: { name: 'E2E 2099' } });
    // Give the real login-ID counters back their values
    await prisma.idCounter.deleteMany();
    await prisma.idCounter.createMany({ data: countersBefore });
    await app.close();
  });

  it('only an admin may create users', async () => {
    const teacherSlip = await gql<{ createTeacher: Slip }>(
      'mutation($input: CreateTeacherInput!) { createTeacher(input: $input) { loginId tempPassword } }',
      { input: { firstName: 'Teacher', lastName: 'E2e' } },
    );
    const teacher = teacherSlip.data!.createTeacher;
    const teacherToken = (
      (await login(teacher.loginId, teacher.tempPassword!)).body as {
        accessToken: string;
      }
    ).accessToken;

    const res = await gql(
      CREATE_STUDENT,
      studentInput('Blocked'),
      teacherToken,
    );
    expect(res.errors?.[0].extensions.code).toBe('FORBIDDEN');
  });

  it('creates a student with a new parent; both can sign in with the printed passwords', async () => {
    const res = await gql<{ createStudent: { student: Slip; parent: Slip } }>(
      CREATE_STUDENT,
      studentInput('First'),
    );
    const { student, parent } = res.data!.createStudent;
    createdUserIds.push(student.userId, parent.userId);

    expect(student.loginId).toMatch(/^\d{2}1\d{5}$/); // YY + 1 + sequence
    expect(student.isNew).toBe(true);
    expect(parent).toMatchObject({
      loginId: '990001122',
      role: 'PARENT',
      isNew: true,
    });
    expect(parent.tempPassword).toMatch(
      /^[A-Z][aeiou][a-z][2-9]{4}[#@$%&*!?]$/,
    );

    // "Done when" of day 4: both sign in with the temp passwords from the slip
    for (const slip of [student, parent]) {
      const signIn = await login(slip.loginId, slip.tempPassword!).expect(200);
      expect(
        (signIn.body as { tempPasswordWarning: { usesLeft: number } })
          .tempPasswordWarning.usesLeft,
      ).toBe(2);
    }

    // Joined the class and its whole-class course; audit rows written
    const db = await prisma.user.findUniqueOrThrow({
      where: { id: student.userId },
      include: { groupMemberships: true, enrollments: true, parents: true },
    });
    expect(db.groupMemberships.map((m) => m.groupId)).toEqual([groupId]);
    expect(db.enrollments.map((e) => e.courseId)).toEqual([courseId]);
    expect(db.parents).toHaveLength(1);
    expect(
      await prisma.auditLog.count({
        where: { entityId: { in: [student.userId, parent.userId] } },
      }),
    ).toBe(2);
  });

  it('a second child links the SAME parent (phone in another format), password unchanged', async () => {
    const res = await gql<{ createStudent: { student: Slip; parent: Slip } }>(
      CREATE_STUDENT,
      studentInput('Second', '990001122'),
    );
    const { student, parent } = res.data!.createStudent;
    createdUserIds.push(student.userId);

    expect(parent).toMatchObject({
      loginId: '990001122',
      isNew: false,
      tempPassword: null,
    });
    const children = await prisma.parentStudent.count({
      where: { parentId: parent.userId, revokedAt: null },
    });
    expect(children).toBe(2);
  });

  it('a bad phone creates nothing at all (one transaction)', async () => {
    const usersBefore = await prisma.user.count();
    const counterBefore = await prisma.idCounter.findMany();

    const res = await gql(CREATE_STUDENT, studentInput('Third', '12345'));
    expect(res.errors?.[0].extensions.code).toBe('BAD_REQUEST');
    expect(await prisma.user.count()).toBe(usersBefore);
    expect(await prisma.idCounter.findMany()).toEqual(counterBefore); // no ID used up
  });

  it('an unknown class is NOT_FOUND', async () => {
    const res = await gql(CREATE_STUDENT, {
      input: {
        firstName: 'Nobody',
        lastName: 'E2e',
        groupId: '01a00000-0000-7000-8000-000000000000',
      },
    });
    expect(res.errors?.[0].extensions.code).toBe('NOT_FOUND');
  });

  it('unlinkParent keeps the row with revokedAt; linking again re-activates it', async () => {
    const student = await prisma.user.findFirstOrThrow({
      where: { firstName: 'First', lastName: 'E2e' },
    });
    const parent = await prisma.user.findUniqueOrThrow({
      where: { loginId: '990001122' },
    });
    const UNLINK =
      'mutation($s: String!, $p: String!) { unlinkParent(studentId: $s, parentId: $p) }';

    expect(
      (
        await gql<{ unlinkParent: boolean }>(UNLINK, {
          s: student.id,
          p: parent.id,
        })
      ).data,
    ).toEqual({
      unlinkParent: true,
    });
    const link = await prisma.parentStudent.findUniqueOrThrow({
      where: {
        parentId_studentId: { parentId: parent.id, studentId: student.id },
      },
    });
    expect(link.revokedAt).not.toBeNull();
    expect(
      (await gql(UNLINK, { s: student.id, p: parent.id })).errors?.[0]
        .extensions.code,
    ).toBe('NOT_FOUND');

    const relinked = await gql<{ linkParent: Slip }>(
      'mutation($s: String!, $input: ParentInput!) { linkParent(studentId: $s, input: $input) { loginId isNew } }',
      {
        s: student.id,
        input: {
          phone: PHONE,
          firstName: 'Parent',
          lastName: 'E2e',
          relation: 'FATHER',
        },
      },
    );
    expect(relinked.data?.linkParent).toEqual({
      loginId: '990001122',
      isNew: false,
    });
    const again = await prisma.parentStudent.findUniqueOrThrow({
      where: { id: link.id },
    });
    expect(again.revokedAt).toBeNull(); // the same row, active again
  });
});
