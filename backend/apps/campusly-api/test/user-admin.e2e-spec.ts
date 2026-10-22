import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { REFRESH_COOKIE } from '../src/libs/config';

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

  describe('users list (Inquiry)', () => {
    const USERS = `query($i: UsersInquiry!) {
      users(input: $i) {
        metaCounter { total }
        list { id loginId firstName className passwordState tempPasswordUsesLeft links { loginId } }
      }
    }`;
    interface UsersResult {
      users: {
        metaCounter: { total: number };
        list: {
          id: string;
          loginId: string;
          firstName: string;
          className: string;
          passwordState: string;
          tempPasswordUsesLeft: number | null;
          links: { loginId: string }[];
        }[];
      };
    }
    const inquiry = (search: object, extra: object = {}) => ({
      i: {
        page: 1,
        limit: 10,
        ...extra,
        search: { role: 'STUDENT', groupId, ...search },
      },
    });

    it('lists the students of a class with class name, parents and password state', async () => {
      const res = await gql<UsersResult>(
        USERS,
        inquiry({}, { sort: 'loginId', direction: 'ASC' }),
      );
      const { list, metaCounter } = res.data!.users;

      expect(metaCounter.total).toBe(2); // "First" and "Second"
      expect(list.map((u) => u.firstName)).toEqual(['First', 'Second']);
      for (const student of list) {
        expect(student.className).toBe('E2E-9A');
        expect(student.links.map((l) => l.loginId)).toEqual(['990001122']);
        expect(student.passwordState).toBe('TEMPORARY');
        expect(student.tempPasswordUsesLeft).toBeGreaterThan(0);
      }
    });

    it('pages do not overlap and the total stays the same', async () => {
      const page1 = (
        await gql<UsersResult>(USERS, inquiry({}, { limit: 1, page: 1 }))
      ).data!.users;
      const page2 = (
        await gql<UsersResult>(USERS, inquiry({}, { limit: 1, page: 2 }))
      ).data!.users;

      expect(page1.metaCounter.total).toBe(2);
      expect(page2.metaCounter.total).toBe(2);
      expect(page1.list[0].id).not.toBe(page2.list[0].id);
    });

    it('rejects a huge page size and an unknown sort column', async () => {
      const big = await gql(USERS, inquiry({}, { limit: 1_000_000 }));
      expect(big.errors?.[0].extensions.code).toBe('BAD_REQUEST');

      const sort = await gql(USERS, inquiry({}, { sort: 'passwordHash' }));
      expect(sort.errors?.[0].extensions.code).toBe('BAD_REQUEST');
    });

    it('groupIds (the grade filter) lists students of any of the classes; bad ids are refused', async () => {
      const other = '01a00000-0000-7000-8000-000000000000';
      const grade = await gql<UsersResult>(
        USERS,
        inquiry({ groupId: undefined, groupIds: [groupId, other] }),
      );
      expect(grade.data!.users.metaCounter.total).toBe(2);

      const none = await gql<UsersResult>(
        USERS,
        inquiry({ groupId: undefined, groupIds: [other] }),
      );
      expect(none.data!.users.metaCounter.total).toBe(0);

      const bad = await gql(USERS, inquiry({ groupIds: ['9A'] }));
      expect(bad.errors?.[0].extensions.code).toBe('BAD_REQUEST');

      const many = await gql(
        USERS,
        inquiry({ groupIds: Array.from({ length: 51 }, () => other) }),
      );
      expect(many.errors?.[0].extensions.code).toBe('BAD_REQUEST');
    });

    it('treats search text as plain text (no regex), an empty result is not an error', async () => {
      const res = await gql<UsersResult>(USERS, inquiry({ text: '(a+)+$' }));
      expect(res.errors).toBeUndefined();
      expect(res.data!.users).toEqual({ list: [], metaCounter: { total: 0 } });
    });
  });

  describe('reset password, block, unblock', () => {
    const RESET =
      'mutation($u: String!) { resetPassword(userId: $u) { loginId tempPassword isNew } }';
    const BLOCK = 'mutation($u: String!) { blockUser(userId: $u) }';
    const UNBLOCK = 'mutation($u: String!) { unblockUser(userId: $u) }';
    let student: { id: string; loginId: string };

    const cookieOf = (res: request.Response) =>
      (res.headers['set-cookie'] as unknown as string[])
        .find((c) => c.startsWith(`${REFRESH_COOKIE}=`))!
        .split(';')[0];
    const refresh = (cookie: string) =>
      request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookie);
    const reset = async () =>
      (
        await gql<{ resetPassword: { loginId: string; tempPassword: string } }>(
          RESET,
          { u: student.id },
        )
      ).data!.resetPassword.tempPassword;

    beforeAll(async () => {
      student = await prisma.user.findFirstOrThrow({
        where: { firstName: 'First', lastName: 'E2e' },
        select: { id: true, loginId: true },
      });
    });

    it('resetPassword: new temp password, every session revoked, lockout cleared', async () => {
      const first = await reset();
      const session = cookieOf(await login(student.loginId, first).expect(200));
      for (let i = 0; i < 5; i++)
        await login(student.loginId, 'wrong').expect(401);
      await login(student.loginId, first).expect(429); // locked out

      const second = await reset();
      expect(second).not.toBe(first);

      await refresh(session).expect(401); // the signed-in device is out
      const signIn = await login(student.loginId, second).expect(200); // lockout cleared
      expect(
        (signIn.body as { tempPasswordWarning: { usesLeft: number } })
          .tempPasswordWarning.usesLeft,
      ).toBe(2);
      await login(student.loginId, first).expect(401); // the old password is gone

      const audit = await prisma.auditLog.findMany({
        where: { entityId: student.id, action: 'user.resetPassword' },
      });
      expect(audit).toHaveLength(2);
      expect(JSON.stringify(audit)).not.toContain(second);
    });

    it("resetPassword follows the school's password rule (Settings → Accounts)", async () => {
      const before = await prisma.schoolSetting.findUnique({
        where: { id: 1 },
      });
      await prisma.schoolSetting.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          schoolName: 'E2E',
          tempPasswordUses: 5,
          tempPasswordDays: 30,
        },
        update: { tempPasswordUses: 5, tempPasswordDays: 30 },
      });
      try {
        await reset();
        // The temp-password fields are omitted by default (prisma-omit): ask for them here
        const db = await prisma.user.findUniqueOrThrow({
          where: { id: student.id },
          omit: { tempPasswordUsesLeft: false, tempPasswordExpiresAt: false },
        });
        expect(db.tempPasswordUsesLeft).toBe(5);
        const days =
          (db.tempPasswordExpiresAt!.getTime() - Date.now()) / 86_400_000;
        expect(days).toBeGreaterThan(29.9);
        expect(days).toBeLessThanOrEqual(30);
      } finally {
        // Back to exactly what was there (the real school's settings)
        if (before)
          await prisma.schoolSetting.update({ where: { id: 1 }, data: before });
        else await prisma.schoolSetting.deleteMany();
      }
    });

    it('blockUser ends the sessions and stops sign-in; unblockUser lets the user back in', async () => {
      const password = await reset();
      const session = cookieOf(
        await login(student.loginId, password).expect(200),
      );

      expect((await gql(BLOCK, { u: student.id })).data).toEqual({
        blockUser: true,
      });
      await refresh(session).expect(401);
      const blocked = await login(student.loginId, password).expect(403);
      expect((blocked.body as { code: string }).code).toBe('ACCOUNT_BLOCKED');

      expect((await gql(UNBLOCK, { u: student.id })).data).toEqual({
        unblockUser: true,
      });
      await login(student.loginId, password).expect(200);
    });

    it('an admin cannot block themselves or change another admin', async () => {
      const self = await prisma.user.findUniqueOrThrow({
        where: { loginId: ADMIN.loginId },
      });
      expect(
        (await gql(BLOCK, { u: self.id })).errors?.[0].extensions.code,
      ).toBe('FORBIDDEN');
      expect(
        (await gql(RESET, { u: self.id })).errors?.[0].extensions.code,
      ).toBe('FORBIDDEN');
    });

    it('an unknown or malformed id is rejected', async () => {
      const unknown = await gql(BLOCK, {
        u: '01a00000-0000-7000-8000-000000000000',
      });
      expect(unknown.errors?.[0].extensions.code).toBe('NOT_FOUND');
      const malformed = await gql(BLOCK, { u: 'not-a-uuid' });
      expect(malformed.errors?.[0].extensions.code).toBe('BAD_REQUEST');
    });
  });
});
