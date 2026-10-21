import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { fromDbDate, todayInZone, toDbDate } from '../src/libs/utils/date';

// Needs Docker Postgres + Redis. Year "E2E Overview" around today, with a period around today.
//   course A (ACTIVE): teacher tA, students sA and sA2; course D (DRAFT) with sA;
//   course B: teacher tB, student sB. Parent pA has TWO children: sA and sB.
const PASSWORD = 'E2e-Overview-Password-1';
const TAG = 'E2E Overview';
const DAY = 86_400_000;

type Key = 'admin' | 'tA' | 'tB' | 'sA' | 'sA2' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Overview {
  student: { firstName: string; className: string | null };
  period: { name: string } | null;
  courses: {
    title: string;
    teacherName: string | null;
    score: number | null;
    isPublished: boolean;
    attendanceRate: number | null;
  }[];
  attendance: { total: number; absent: number; rate: number | null };
  upcoming: { title: string; isDone: boolean }[];
  recentGrades: { title: string; score: number; percent: number }[];
  announcements: { unread: number; list: { title: string }[] };
}

describe('studentOverview and myChildren (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '', D: '' };

  async function gql<T>(query: string, variables: object, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const OVERVIEW = `query($s: String) { studentOverview(studentId: $s) {
    student { firstName className } period { name }
    courses { title teacherName score isPublished attendanceRate }
    attendance { total absent rate }
    upcoming { title isDone }
    recentGrades { title score percent }
    announcements { unread list { title } }
  } }`;
  const CHILDREN = `{ myChildren { firstName className relation } }`;
  const overview = async (as: Key, studentId?: string) =>
    (await gql<{ studentOverview: Overview }>(OVERVIEW, { s: studentId }, as))
      .data!.studentOverview;

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
      where: { userId: { in: ids } },
    });
    await prisma.announcement.deleteMany({ where: { course: courses } });
    await prisma.attendanceRecord.deleteMany({
      where: { session: { course: courses } },
    });
    await prisma.classSession.deleteMany({ where: { course: courses } });
    await prisma.submissionAttempt.deleteMany({
      where: { submission: { assignment: { course: courses } } },
    });
    await prisma.submission.deleteMany({
      where: { assignment: { course: courses } },
    });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.groupMember.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.group.deleteMany({ where: { academicYear: { name: TAG } } });
    await prisma.period.deleteMany({ where: { academicYear: { name: TAG } } });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: TAG } });
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
    for (const [key, role, first] of [
      ['admin', 'ADMIN', 'Admin'],
      ['tA', 'TEACHER', 'Nilufar'],
      ['tB', 'TEACHER', 'Other'],
      ['sA', 'STUDENT', 'Aziz'],
      ['sA2', 'STUDENT', 'Bobur'],
      ['sB', 'STUDENT', 'Madina'],
      ['pA', 'PARENT', 'Farrukh'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-overview-${key}`,
            role,
            passwordHash,
            firstName: first,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-overview-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
    await prisma.parentStudent.createMany({
      data: [id.sA, id.sB].map((studentId) => ({
        parentId: id.pA,
        studentId,
        relation: 'FATHER' as const,
        createdById: id.admin,
      })),
    });

    // A period around today (school timezone)
    const today = toDbDate(todayInZone('Asia/Tashkent'));
    const shift = (days: number) => new Date(today.getTime() + days * DAY);
    const year = await prisma.academicYear.create({
      data: {
        name: TAG,
        startsAt: shift(-200),
        endsAt: shift(200),
        periods: {
          create: [
            {
              kind: 'QUARTER',
              name: 'Earlier quarter',
              order: 1,
              startsAt: shift(-150),
              endsAt: shift(-31),
            },
            {
              kind: 'QUARTER',
              name: 'This quarter',
              order: 2,
              startsAt: shift(-30),
              endsAt: shift(30),
            },
          ],
        },
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, students, status, groupName] of [
      ['A', id.tA, [id.sA, id.sA2], 'ACTIVE', 'E2E-OV9A'],
      ['D', id.tA, [id.sA], 'DRAFT', 'E2E-OV9A'],
      ['B', id.tB, [id.sB], 'ACTIVE', 'E2E-OV9B'],
    ] as const) {
      const group = await prisma.group.upsert({
        where: {
          academicYearId_name: { academicYearId: year.id, name: groupName },
        },
        create: { academicYearId: year.id, name: groupName },
        update: {},
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
            enrollments: {
              create: students.map((studentId) => ({ studentId })),
            },
            gradeCategories: { create: { name: 'Homework', weight: 100 } },
          },
        })
      ).id;
    }
    const group9A = await prisma.group.findFirstOrThrow({
      where: { name: 'E2E-OV9A' },
    });
    await prisma.groupMember.create({
      data: { groupId: group9A.id, studentId: id.sA },
    });

    const category = await prisma.gradeCategory.findFirstOrThrow({
      where: { courseId: course.A },
    });
    const now = Date.now();
    const assignment = async (
      title: string,
      dueInDays: number,
      opts: { published?: boolean; gradesPublished?: boolean } = {},
    ) =>
      (
        await prisma.assignment.create({
          data: {
            courseId: course.A,
            categoryId: category.id,
            type: 'HOMEWORK',
            title,
            maxScore: 10,
            dueAt: new Date(now + dueInDays * DAY),
            acceptedFileTypes: [],
            publishedAt: opts.published === false ? null : new Date(now - DAY),
            gradesPublishedAt: opts.gradesPublished
              ? new Date(now - 1000)
              : null,
            createdById: id.tA,
          },
        })
      ).id;
    const graded = await assignment('Graded yesterday', -1, {
      gradesPublished: true,
    });
    const hidden = await assignment('Graded, not published', -2);
    await assignment('Due tomorrow', 1);
    const handedIn = await assignment('Due in 3 days', 3);
    await assignment('Due in 10 days', 10);
    await assignment('Draft due tomorrow', 1, { published: false });

    await prisma.submission.createMany({
      data: [
        { assignmentId: graded, studentId: id.sA, status: 'GRADED', score: 8 },
        { assignmentId: hidden, studentId: id.sA, status: 'GRADED', score: 2 },
      ],
    });
    await prisma.submission.create({
      data: {
        assignmentId: handedIn,
        studentId: id.sA,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        attempts: { create: { number: 1, text: 'done' } },
      },
    });

    // Attendance: present one day, absent the next
    for (const [days, status] of [
      [-2, 'PRESENT'],
      [-1, 'ABSENT'],
    ] as const) {
      await prisma.classSession.create({
        data: {
          courseId: course.A,
          date: new Date(toDbDate(fromDbDate(shift(days)))),
          createdById: id.tA,
          records: {
            create: { studentId: id.sA, status, markedById: id.tA },
          },
        },
      });
    }
    await prisma.announcement.create({
      data: {
        courseId: course.A,
        authorId: id.tA,
        title: `${TAG} Quiz on Friday`,
        body: 'Text',
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('student: one query with courses, attendance, due soon, published grades and news', async () => {
    const o = await overview('sA');
    expect(o.student).toEqual({ firstName: 'Aziz', className: 'E2E-OV9A' });
    expect(o.period).toEqual({ name: 'This quarter' });

    // The draft course is left out; the grade is live (8/10) until the quarter is published
    expect(o.courses).toEqual([
      {
        title: `${TAG} A`,
        teacherName: `Nilufar ${TAG}`,
        score: 80,
        isPublished: false,
        attendanceRate: 50,
      },
    ]);
    expect(o.attendance).toEqual({ total: 2, absent: 1, rate: 50 });
    // Next 7 days, published only; handed in = done
    expect(o.upcoming).toEqual([
      { title: 'Due tomorrow', isDone: false },
      { title: 'Due in 3 days', isDone: true },
    ]);
    // The unpublished 2/10 is NOT here
    expect(o.recentGrades).toEqual([
      { title: 'Graded yesterday', score: 8, percent: 80 },
    ]);
    expect(o.announcements.list.map((a) => a.title)).toContain(
      `${TAG} Quiz on Friday`,
    );
  });

  it('myChildren: the parent’s children for the switcher', async () => {
    const res = await gql<{
      myChildren: { firstName: string; className: string | null }[];
    }>(CHILDREN, {}, 'pA');
    expect(res.data!.myChildren.map((c) => c.firstName)).toEqual([
      'Aziz',
      'Madina',
    ]);
    expect(code(await gql(CHILDREN, {}, 'sA'))).toBe('FORBIDDEN');
  });

  it('a parent with two children chooses one; each child shows only its own data', async () => {
    expect((await overview('pA', id.sA)).courses.map((c) => c.title)).toEqual([
      `${TAG} A`,
    ]);
    expect((await overview('pA', id.sB)).courses.map((c) => c.title)).toEqual([
      `${TAG} B`,
    ]);
  });

  // ───────────── isolation: who → whose overview → expected ─────────────
  const table: [string, Key, () => string | undefined, string][] = [
    ['parent with two children, no choice', 'pA', () => undefined, 'NOT_FOUND'],
    ['parent: someone else’s child', 'pA', () => id.sA2, 'NOT_FOUND'],
    ['teacher: any overview', 'tA', () => id.sA, 'FORBIDDEN'],
    ['admin: a chosen student', 'admin', () => id.sA, 'OK'],
    ['admin: no student chosen', 'admin', () => undefined, 'NOT_FOUND'],
  ];
  it.each(table)('%s → %s', async (_name, as, studentId, expected) => {
    expect(code(await gql(OVERVIEW, { s: studentId() }, as)) ?? 'OK').toBe(
      expected,
    );
  });

  it('a student asking for someone else gets their own overview', async () => {
    expect((await overview('sA', id.sB)).student.firstName).toBe('Aziz');
  });
});
