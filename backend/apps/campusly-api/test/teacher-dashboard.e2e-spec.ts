import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { toDbDate } from '../src/libs/utils/date';

// Needs Docker Postgres + Redis. The dashboard shows this year's courses, so the test courses go
// into the current academic year (a temporary one is made when there is none, e.g. in CI).
// Teacher A has two courses; teacher B (the foreign user) has one and must see none of A's data.
const PASSWORD = 'E2e-Teacher-Dashboard-Password-1';
const TAG = 'E2E TDash';
const DAY = 86_400_000;

type Key = 'tA' | 'tB' | 'admin' | 'student';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Grading {
  title: string;
  courseTitle: string;
  toGrade: number;
  submitted: number;
  graded: number;
  students: number;
  readyToPublish: boolean;
}
interface Dashboard {
  today: string;
  holiday: string | null;
  todayCourses: { title: string; students: number; marked: number }[];
  toGradeTotal: number;
  grading: Grading[];
  courses: {
    title: string;
    status: string;
    students: number;
    week: number | null;
  }[];
  deadlines: { kind: string; title: string; courseTitles: string[] }[];
  announcements: { title: string; reads: number; audience: number | null }[];
}

const DASHBOARD = `{ teacherDashboard { today holiday
  todayCourses { title students marked } toGradeTotal
  grading { title courseTitle toGrade submitted graded students readyToPublish }
  courses { title status students week }
  deadlines { kind title courseTitles }
  announcements { title reads audience } } }`;

describe('Teacher dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const token = {} as Record<Key, string>;
  const id: Record<string, string> = {};
  let madeYear = false;
  let mine: Dashboard;
  let foreign: Dashboard;

  async function gql<T>(query: string, as: Key) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query });
    return res.body as GqlBody<T>;
  }
  const dashboard = async (as: Key) =>
    (await gql<{ teacherDashboard: Dashboard }>(DASHBOARD, as)).data!
      .teacherDashboard;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    await prisma.schoolEvent.deleteMany({
      where: { title: { startsWith: TAG } },
    });
    await prisma.announcementRead.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.announcement.deleteMany({ where: { authorId: { in: ids } } });
    await prisma.attendanceRecord.deleteMany({
      where: { session: { course: courses } },
    });
    await prisma.classSession.deleteMany({ where: { course: courses } });
    await prisma.submission.deleteMany({
      where: { assignment: { course: courses } },
    });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.module.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({
      where: { name: { startsWith: 'E2E-TD' } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.academicYear.deleteMany({ where: { name: TAG } });
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
      ['admin', 'ADMIN'],
      ['student', 'STUDENT'],
      ['s2', 'STUDENT'],
      ['s3', 'STUDENT'],
      ['parent', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-tdash-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      if (['tA', 'tB', 'admin', 'student'].includes(key)) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ loginId: `e2e-tdash-${key}`, password: PASSWORD });
        token[key as Key] = (res.body as { accessToken: string }).accessToken;
      }
    }
    const today = (await dashboard('tA')).today;
    const day = toDbDate(today);

    let year = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });
    if (!year) {
      madeYear = true;
      year = await prisma.academicYear.create({
        data: {
          name: TAG,
          startsAt: new Date(day.getTime() - 60 * DAY),
          endsAt: new Date(day.getTime() + 200 * DAY),
          isCurrent: true,
        },
      });
    }
    const subject = await prisma.subject.create({ data: { name: TAG } });
    const course = async (key: string, teacher: string, students: string[]) => {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-TD-${key}` },
      });
      const c = await prisma.course.create({
        data: {
          academicYearId: year.id,
          groupId: group.id,
          subjectId: subject.id,
          title: `${TAG} ${key}`,
          status: 'ACTIVE',
          teachers: { create: { teacherId: id[teacher] } },
          enrollments: {
            create: students.map((s) => ({ studentId: id[s] })),
          },
          gradeCategories: { create: { name: 'Homework', weight: 100 } },
        },
        include: { gradeCategories: true },
      });
      id[key] = c.id;
      id[`${key}-cat`] = c.gradeCategories[0].id;
    };
    await course('A1', 'tA', ['student', 's2', 's3']);
    await course('A2', 'tA', ['student']);
    await course('B1', 'tB', ['s2']);

    // A1 is in week 3 today; attendance is taken in A1 (one mark), not in A2
    await prisma.module.create({
      data: {
        courseId: id.A1,
        title: 'Week 3',
        order: 3,
        startsAt: new Date(day.getTime() - DAY),
        endsAt: new Date(day.getTime() + DAY),
      },
    });
    await prisma.classSession.create({
      data: {
        courseId: id.A1,
        date: day,
        createdById: id.tA,
        records: {
          create: { studentId: id.student, markedById: id.tA },
        },
      },
    });

    const assignment = (
      key: string,
      courseKey: string,
      title: string,
      type: 'HOMEWORK' | 'EXAM',
      dueAt: Date,
      extra = {},
    ) =>
      prisma.assignment
        .create({
          data: {
            courseId: id[courseKey],
            categoryId: id[`${courseKey}-cat`],
            type,
            title: `${TAG} ${title}`,
            maxScore: 10,
            dueAt,
            maxAttempts: 1,
            acceptedFileTypes: [],
            publishedAt: new Date(Date.now() - 5 * DAY),
            createdById: id.tA,
            ...extra,
          },
        })
        .then((a) => (id[key] = a.id));
    const past = new Date(Date.now() - 2 * DAY);
    const soon = new Date(Date.now() + 2 * DAY);
    // Homework: 2 waiting (one late), 1 graded
    await assignment('hw', 'A1', 'Homework', 'HOMEWORK', past);
    // Exam of 3 students, 1 scored → 2 to grade
    await assignment('exam', 'A1', 'Exam', 'EXAM', past);
    // Everything graded, not published → "ready to publish"
    await assignment('done', 'A1', 'Done', 'HOMEWORK', past);
    // Published grades: not on the dashboard at all
    await assignment('published', 'A1', 'Published', 'HOMEWORK', past, {
      gradesPublishedAt: new Date(),
    });
    // The same homework in A1 and A2 → one deadline row
    await assignment('soon1', 'A1', 'Soon', 'HOMEWORK', soon);
    await assignment('soon2', 'A2', 'Soon', 'HOMEWORK', soon);
    // Teacher B's homework with work to grade
    await assignment('foreignHw', 'B1', 'Foreign', 'HOMEWORK', past);

    const submission = (
      assignmentKey: string,
      student: string,
      status: string,
    ) =>
      prisma.submission.create({
        data: {
          assignmentId: id[assignmentKey],
          studentId: id[student],
          status: status as 'SUBMITTED',
          score: status === 'GRADED' ? 8 : null,
        },
      });
    await submission('hw', 'student', 'SUBMITTED');
    await submission('hw', 's2', 'LATE');
    await submission('hw', 's3', 'GRADED');
    await submission('exam', 'student', 'GRADED');
    await submission('done', 'student', 'GRADED');
    await submission('published', 'student', 'SUBMITTED');
    await submission('foreignHw', 's2', 'SUBMITTED');

    // A's announcement: 3 students, 1 of them read it; a parent's read does not count
    const announcement = await prisma.announcement.create({
      data: {
        courseId: id.A1,
        authorId: id.tA,
        title: `${TAG} news`,
        body: 'Hello',
      },
    });
    await prisma.announcementRead.createMany({
      data: [
        { announcementId: announcement.id, userId: id.student },
        { announcementId: announcement.id, userId: id.parent },
      ],
    });
    await prisma.schoolEvent.create({
      data: {
        kind: 'HOLIDAY',
        title: `${TAG} holiday`,
        startsOn: day,
        endsOn: day,
        createdById: id.admin,
      },
    });

    mine = await dashboard('tA');
    foreign = await dashboard('tB');
  });

  afterAll(async () => {
    await cleanUp();
    if (madeYear) {
      await prisma.academicYear.deleteMany({ where: { name: TAG } });
    }
    await app.close();
  });

  const tagged = <T extends { title: string }>(rows: T[]) =>
    rows.filter((r) => r.title.startsWith(TAG));
  const item = (title: string) =>
    mine.grading.find((g) => g.title === `${TAG} ${title}`);

  it('attendance today: every active course, marks in today’s session; a holiday is named', () => {
    expect(tagged(mine.todayCourses)).toEqual([
      { title: `${TAG} A1`, students: 3, marked: 1 },
      { title: `${TAG} A2`, students: 1, marked: 0 },
    ]);
    expect(mine.holiday).toBe(`${TAG} holiday`);
  });

  it('my courses: students and this week’s module', () => {
    expect(tagged(mine.courses)).toEqual([
      { title: `${TAG} A1`, status: 'ACTIVE', students: 3, week: 3 },
      { title: `${TAG} A2`, status: 'ACTIVE', students: 1, week: null },
    ]);
  });

  it('needs grading: submitted + late wait; an exam waits for the unscored students', () => {
    expect(item('Homework')).toMatchObject({
      toGrade: 2,
      submitted: 3,
      graded: 1,
      students: 3,
      readyToPublish: false,
    });
    expect(item('Exam')).toMatchObject({ toGrade: 2, graded: 1 });
    expect(mine.toGradeTotal).toBe(4);
  });

  it('fully graded and past due → ready to publish; published grades are gone', () => {
    expect(item('Done')).toMatchObject({ toGrade: 0, readyToPublish: true });
    expect(item('Published')).toBeUndefined();
  });

  it('deadlines: the same homework in two courses is one row', () => {
    const soon = mine.deadlines.filter((d) => d.title === `${TAG} Soon`);
    expect(soon).toEqual([
      {
        kind: 'ASSIGNMENT',
        title: `${TAG} Soon`,
        courseTitles: [`${TAG} A1`, `${TAG} A2`],
      },
    ]);
  });

  it('announcements: read receipts count the course’s students only', () => {
    expect(tagged(mine.announcements)).toEqual([
      { title: `${TAG} news`, reads: 1, audience: 3 },
    ]);
  });

  it('foreign teacher: none of the other teacher’s courses, work or announcements', () => {
    expect(tagged(foreign.todayCourses).map((c) => c.title)).toEqual([
      `${TAG} B1`,
    ]);
    expect(tagged(foreign.courses).map((c) => c.title)).toEqual([`${TAG} B1`]);
    expect(foreign.grading.map((g) => g.title)).toEqual([`${TAG} Foreign`]);
    expect(foreign.toGradeTotal).toBe(1);
    expect(tagged(foreign.deadlines)).toEqual([]);
    expect(tagged(foreign.announcements)).toEqual([]);
    expect(tagged(mine.grading).map((g) => g.title)).not.toContain(
      `${TAG} Foreign`,
    );
  });

  it.each(['admin', 'student'] as const)('%s → FORBIDDEN', async (as) => {
    expect((await gql(DASHBOARD, as)).errors?.[0].extensions.code).toBe(
      'FORBIDDEN',
    );
  });
});
