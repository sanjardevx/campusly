import { HttpException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AccessPolicy } from '../src/components/auth/policies/access.policy';
import { PrismaService } from '../src/database/prisma.service';
import { validateEnv } from '../src/libs/config';
import type { Role } from '../src/libs/enums/user.enum';
import type { AuthUser } from '../src/libs/types/auth';

// Needs the Docker Postgres. Builds a tiny school (all names "E2E Policy ...") and removes it.
//   class A: course A (teacher tA), student sA, parent pA
//   class B: course B (teacher tB), student sB, a former parent of sB (link revoked)
const TAG = 'E2E Policy';

type Outcome = 'OK' | 'NOT_FOUND' | 'FORBIDDEN';

describe('AccessPolicy isolation table (e2e)', () => {
  let prisma: PrismaService;
  let policy: AccessPolicy;
  const u: Record<
    'admin' | 'tA' | 'tB' | 'sA' | 'sB' | 'pA' | 'pFormer',
    AuthUser
  > = {} as never;
  const c = { A: '', B: '' };

  const as = (id: string, role: Role): AuthUser => ({
    id,
    role,
    sessionId: 'e2e',
    mustChangePassword: false,
    isDemo: false,
  });

  /** Runs a policy check and turns the result into OK / NOT_FOUND / FORBIDDEN */
  async function outcome(run: () => Promise<unknown>): Promise<Outcome> {
    try {
      await run();
      return 'OK';
    } catch (err) {
      return ((err as HttpException).getResponse() as { code: Outcome }).code;
    }
  }

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((x) => x.id);
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.courseTeacher.deleteMany({
      where: { teacherId: { in: ids } },
    });
    await prisma.groupMember.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.group.deleteMany({ where: { name: { startsWith: 'E2EP' } } });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: TAG } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ validate: validateEnv })],
      providers: [PrismaService, AccessPolicy],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    policy = moduleRef.get(AccessPolicy);
    await cleanUp();

    const user = async (key: keyof typeof u, role: Role) => {
      const created = await prisma.user.create({
        data: {
          loginId: `e2e-policy-${key}`,
          role,
          passwordHash: 'x',
          firstName: key,
          lastName: TAG,
        },
      });
      u[key] = as(created.id, role);
    };
    await user('admin', 'ADMIN');
    await user('tA', 'TEACHER');
    await user('tB', 'TEACHER');
    await user('sA', 'STUDENT');
    await user('sB', 'STUDENT');
    await user('pA', 'PARENT');
    await user('pFormer', 'PARENT');

    const year = await prisma.academicYear.create({
      data: {
        name: TAG,
        startsAt: new Date('2096-09-01'),
        endsAt: new Date('2097-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacher, student] of [
      ['A', u.tA, u.sA],
      ['B', u.tB, u.sB],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2EP-${key}` },
      });
      const course = await prisma.course.create({
        data: {
          academicYearId: year.id,
          groupId: group.id,
          subjectId: subject.id,
          title: `${TAG} ${key}`,
          status: 'ACTIVE',
          teachers: { create: { teacherId: teacher.id } },
          enrollments: { create: { studentId: student.id } },
        },
      });
      c[key] = course.id;
    }
    await prisma.parentStudent.createMany({
      data: [
        {
          parentId: u.pA.id,
          studentId: u.sA.id,
          relation: 'FATHER',
          createdById: u.admin.id,
        },
        // Unlinked: a former parent must lose access
        {
          parentId: u.pFormer.id,
          studentId: u.sB.id,
          relation: 'MOTHER',
          createdById: u.admin.id,
          revokedAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  // ───────────── the isolation table: who → what → expected ─────────────
  const UNKNOWN = '01a00000-0000-7000-8000-000000000000';
  const table: [string, () => Promise<unknown>, Outcome][] = [
    // view a course
    [
      'student views own course',
      () => policy.assertCanViewCourse(u.sA, c.A),
      'OK',
    ],
    [
      'student views a course of another class',
      () => policy.assertCanViewCourse(u.sA, c.B),
      'NOT_FOUND',
    ],
    [
      'parent views the child’s course',
      () => policy.assertCanViewCourse(u.pA, c.A),
      'OK',
    ],
    [
      'parent views a course of another child',
      () => policy.assertCanViewCourse(u.pA, c.B),
      'NOT_FOUND',
    ],
    [
      'former parent (link revoked) views the course',
      () => policy.assertCanViewCourse(u.pFormer, c.B),
      'NOT_FOUND',
    ],
    [
      'teacher views own course',
      () => policy.assertCanViewCourse(u.tA, c.A),
      'OK',
    ],
    [
      'teacher views another teacher’s course',
      () => policy.assertCanViewCourse(u.tA, c.B),
      'NOT_FOUND',
    ],
    [
      'admin views any course',
      () => policy.assertCanViewCourse(u.admin, c.B),
      'OK',
    ],
    [
      'admin views a course that does not exist',
      () => policy.assertCanViewCourse(u.admin, UNKNOWN),
      'NOT_FOUND',
    ],
    // change a course
    ['teacher edits own course', () => policy.assertTeacherOf(u.tA, c.A), 'OK'],
    [
      'teacher edits another teacher’s course',
      () => policy.assertTeacherOf(u.tB, c.A),
      'NOT_FOUND',
    ],
    [
      'student edits own course (related, not allowed)',
      () => policy.assertTeacherOf(u.sA, c.A),
      'FORBIDDEN',
    ],
    [
      'parent edits the child’s course (related, not allowed)',
      () => policy.assertTeacherOf(u.pA, c.A),
      'FORBIDDEN',
    ],
    [
      'student edits a course of another class',
      () => policy.assertTeacherOf(u.sB, c.A),
      'NOT_FOUND',
    ],
    [
      'admin edits any course',
      () => policy.assertTeacherOf(u.admin, c.A),
      'OK',
    ],
    // a student inside a course
    [
      'teacher views a student of own course',
      () => policy.assertCanViewStudentInCourse(u.tA, c.A, u.sA.id),
      'OK',
    ],
    [
      'teacher asks own course for a student of another class',
      () => policy.assertCanViewStudentInCourse(u.tA, c.A, u.sB.id),
      'NOT_FOUND',
    ],
    [
      'teacher views a student through another teacher’s course',
      () => policy.assertCanViewStudentInCourse(u.tB, c.A, u.sA.id),
      'NOT_FOUND',
    ],
    // which student a request is about
    [
      'parent asks for another child',
      () => policy.resolveStudentScope(u.pA, u.sB.id),
      'NOT_FOUND',
    ],
    [
      'former parent asks for the child',
      () => policy.resolveStudentScope(u.pFormer, u.sB.id),
      'NOT_FOUND',
    ],
    [
      'admin asks without a student id',
      () => policy.resolveStudentScope(u.admin),
      'NOT_FOUND',
    ],
    [
      'teacher uses the student view',
      () => policy.resolveStudentScope(u.tA, u.sA.id),
      'FORBIDDEN',
    ],
  ];

  it.each(table)('%s → %s', async (_name, run, expected) => {
    expect(await outcome(run)).toBe(expected);
  });

  it('resolveStudentScope picks the right student', async () => {
    // A student always gets themselves, even when sending someone else's id
    expect(await policy.resolveStudentScope(u.sA, u.sB.id)).toBe(u.sA.id);
    // A parent with one child does not have to choose
    expect(await policy.resolveStudentScope(u.pA)).toBe(u.sA.id);
    expect(await policy.resolveStudentScope(u.admin, u.sB.id)).toBe(u.sB.id);
  });

  it('courseScope lists only the courses a user may see', async () => {
    const titles = async (user: AuthUser) =>
      (
        await prisma.course.findMany({
          where: {
            AND: [policy.courseScope(user), { title: { startsWith: TAG } }],
          },
          orderBy: { title: 'asc' },
        })
      ).map((x) => x.title);

    expect(await titles(u.sA)).toEqual([`${TAG} A`]);
    expect(await titles(u.pA)).toEqual([`${TAG} A`]);
    expect(await titles(u.pFormer)).toEqual([]);
    expect(await titles(u.tB)).toEqual([`${TAG} B`]);
    expect(await titles(u.admin)).toEqual([`${TAG} A`, `${TAG} B`]);
  });
});
