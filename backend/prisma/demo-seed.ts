// Demo data for local development and the public demo (DECISIONS §12).
// Used by `pnpm prisma db seed` (prisma/seed.ts) and by the batch app's nightly demo reset.
// It WIPES all tables first, so every run gives the same data.
// A whole school (DECISIONS §12 "School data and demo v2"): classes 1A–11B with 15 students each,
// their parents and ~30 teachers, all invented. The generators live in prisma/seed/; the names of
// the Stitch design stay (Aziz Karimov 26100042 in 9A, teacher Nilufar Karimova …).
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { calculateGrade } from '../apps/campusly-api/src/libs/utils/grade';
import { type Prisma, PrismaClient } from '../generated/prisma/client';
import { SITE_SETTINGS, seedSite } from './demo-site';
import {
  ALGEBRA_QUIZZES,
  ALL_SUBJECTS,
  type Band,
  LESSON_DAYS,
  QUIZ_QUESTIONS,
  SUBJECTS_BY_BAND,
  TOPICS,
  TOPICS_Q2,
  bandOf,
} from './seed/curriculum';
import {
  addDays,
  day,
  pick,
  random,
  startRun,
  tashkent,
  today,
  weekday,
} from './seed/clock';
import { insertAll, uuidv7 } from './seed/ids';
import {
  CLASSES,
  type TempPassword,
  generateStudentsAndParents,
  generateTeachers,
  gradeOf,
} from './seed/people';

// ───────────────────────── the school calendar ─────────────────────────
// Real dates (DECISIONS §12): the demo follows the real school year. Every run writes the story up
// to its "today": quarter 1 is over and graded, quarter 2 runs, later weeks are still drafts.

/** Uzbek school year: 4 quarters with holidays in between */
const QUARTERS = [
  { start: '2026-09-02', end: '2026-10-31', exam: '2026-10-29' },
  { start: '2026-11-09', end: '2026-12-27', exam: '2026-12-24' },
  { start: '2027-01-11', end: '2027-03-20', exam: '2027-03-18' },
  { start: '2027-03-30', end: '2027-05-25', exam: '2027-05-20' },
];

const mondays = (from: string, count: number) =>
  Array.from({ length: count }, (_, i) => addDays(from, 7 * i));

/**
 * The school weeks that have topics (Mondays), numbered across the year like the API's school
 * week: quarter 1 is weeks 1–8, quarter 2 weeks 9–15.
 */
const WEEKS = [
  ...mondays('2026-09-07', 8).map((start) => ({ start, quarter: 1 })),
  ...mondays('2026-11-09', 7).map((start) => ({ start, quarter: 2 })),
];

/** The weeks this run writes: those of every quarter that has started or starts within a week */
const seededWeeks = () =>
  WEEKS.filter((w) => QUARTERS[w.quarter - 1].start <= addDays(today(), 7));

/** Index of the week "today" is in (the last one that has started; 0 before the first) */
const currentWeek = () =>
  Math.max(0, seededWeeks().filter((w) => w.start <= today()).length - 1);

/** "2026-12-24" → "December 24" (announcement texts) */
const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(day(iso));

/** A quarter's grades are published four days after it ends ("published by November 4") */
const quarterPublished = (quarter: number) =>
  today() >= addDays(QUARTERS[quarter - 1].end, 4);

/** A plain client for the seed (the API's PrismaService hides columns the seed writes) */
export const createSeedClient = (databaseUrl: string) =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
type SeedClient = ReturnType<typeof createSeedClient>;

export interface SeedDemoOptions {
  /** Every seeded account gets this password (from env, never from git) */
  password: string;
  /** DEMO_MODE=true: flag the demo accounts for "Demo login" */
  demoMode: boolean;
  /** The moment the story is written for (default: now); tests pass a fixed one */
  now?: Date;
}

// One seed run at a time: seedDemo() sets these, the steps below read them
let prisma: SeedClient;
let SEED_PASSWORD = '';
let DEMO_ACCOUNTS = new Set<string>();

// ───────────────────────────── 0. reset ─────────────────────────────

/** Empties every table except Prisma's migration history. The callers decide whether this DB may be wiped. */
async function reset() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

// ──────────────────── 1. school, subjects, classes ────────────────────

async function seedSchool() {
  await prisma.schoolSetting.create({
    data: {
      schoolName: 'Campusly School',
      // "Reset in Telegram" under "Forgot password?" (DECISIONS §6)
      telegramBotUrl: 'https://t.me/campuslyreset_bot',
      // Public website footer and numbers strip (day 19)
      ...SITE_SETTINGS,
    },
  });

  const year = await prisma.academicYear.create({
    data: {
      name: '2026–27',
      startsAt: day('2026-09-02'),
      endsAt: day('2027-05-25'),
      isCurrent: true,
    },
  });

  const quarters = [];
  for (const [i, { start, end }] of QUARTERS.entries()) {
    quarters.push(
      await prisma.period.create({
        data: {
          academicYearId: year.id,
          kind: 'QUARTER',
          name: `Quarter ${i + 1}`,
          order: i + 1,
          startsAt: day(start),
          endsAt: day(end),
        },
      }),
    );
  }

  // Subjects by level and the classes 1A … 11B (DECISIONS §12 "School data and demo v2")
  const subjects: Record<string, string> = {};
  for (const name of ALL_SUBJECTS) subjects[name] = uuidv7();
  await prisma.subject.createMany({
    data: Object.entries(subjects).map(([name, id]) => ({ id, name })),
  });
  const groups: Record<string, string> = {};
  for (const name of CLASSES) groups[name] = uuidv7();
  await prisma.group.createMany({
    data: Object.entries(groups).map(([name, id]) => ({
      id,
      name,
      academicYearId: year.id,
    })),
  });

  return {
    yearId: year.id,
    quarterIds: quarters.map((q) => q.id),
    subjects,
    groups,
  };
}

// ──────────────────────────── 2. users ────────────────────────────

/** Temporary password states from DECISIONS §6 (3 sign-ins or 14 days) */
function tempPasswordFields(temp: TempPassword | undefined) {
  const now = Date.now();
  const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);
  switch (temp) {
    case 'ACTIVE_2_LEFT':
      return { tempPasswordUsesLeft: 2, tempPasswordExpiresAt: days(11) };
    case 'ACTIVE_1_LEFT':
      return { tempPasswordUsesLeft: 1, tempPasswordExpiresAt: days(5) };
    case 'EXPIRED':
      // Limit reached: only the "Set a new password" screen is allowed
      return {
        tempPasswordUsesLeft: 3,
        tempPasswordExpiresAt: days(-2),
        mustChangePassword: true,
      };
    default:
      return {};
  }
}

// DEMO_MODE=true: the demo accounts that "Demo login" opens (DECISIONS §12, demo v2): a student
// in 9A, a student in 11A, their parent and a teacher of 9A / 11A. No admin demo: simon is a
// normal admin. Locally these stay normal accounts.
const SHOWCASE_ACCOUNTS = ['26200001', '26100042', '26100043', '901112233'];
const isDemo = (loginId: string) => DEMO_ACCOUNTS.has(loginId);

async function seedUsers(groups: Record<string, string>) {
  // Hash once: bcrypt is slow on purpose, and every seeded account shares the password
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      loginId: 'simon',
      role: 'ADMIN',
      passwordHash,
      firstName: 'Simon',
      lastName: '',
    },
  });

  const teacherSeeds = generateTeachers();
  const {
    students: studentSeeds,
    parents: parentSeeds,
    lastStudentNumber,
  } = generateStudentsAndParents();

  // Everyone in one createMany per table: ids are made here, so the profiles and links follow
  const users: Prisma.UserCreateManyInput[] = [];
  const teachers: Record<string, string> = {};
  const teacherOf = new Map<string, string>(); // "Algebra · 9A" → teacher id
  for (const t of teacherSeeds) {
    const id = uuidv7();
    teachers[t.lastName] = id;
    for (const course of t.courses) teacherOf.set(course, id);
    users.push({
      id,
      loginId: t.loginId,
      role: 'TEACHER',
      passwordHash,
      isDemo: isDemo(t.loginId),
      firstName: t.firstName,
      lastName: t.lastName,
    });
  }
  const students: Record<string, { id: string; group: string }> = {};
  for (const s of studentSeeds) {
    const id = uuidv7();
    students[s.loginId] = { id, group: s.group };
    users.push({
      id,
      loginId: s.loginId,
      role: 'STUDENT',
      status: s.status ?? 'ACTIVE',
      passwordHash,
      isDemo: isDemo(s.loginId),
      ...tempPasswordFields(s.temp),
      firstName: s.firstName,
      lastName: s.lastName,
    });
  }
  const parentIds: string[] = [];
  for (const p of parentSeeds) {
    const id = uuidv7();
    parentIds.push(id);
    users.push({
      id,
      loginId: p.phone, // parent login ID = last 9 digits of the phone
      role: 'PARENT',
      passwordHash,
      isDemo: isDemo(p.phone),
      firstName: p.firstName,
      lastName: p.lastName,
    });
  }
  await insertAll(users, (data) => prisma.user.createMany({ data }));

  await prisma.teacherProfile.createMany({
    data: teacherSeeds.map((t) => ({
      userId: teachers[t.lastName],
      title: t.title,
    })),
  });
  await insertAll(
    studentSeeds.map((s, i) => {
      // Grade g in 2026–27: started school at 7, so born in 2020 − g
      const grade = gradeOf(s.group);
      const month = String((i % 12) + 1).padStart(2, '0');
      const date = String((i % 27) + 1).padStart(2, '0');
      return {
        userId: students[s.loginId].id,
        birthDate: day(`${2020 - grade}-${month}-${date}`),
        admissionYear: 2027 - grade,
      };
    }),
    (data) => prisma.studentProfile.createMany({ data }),
  );
  await insertAll(
    studentSeeds.map((s) => ({
      groupId: groups[s.group],
      studentId: students[s.loginId].id,
    })),
    (data) => prisma.groupMember.createMany({ data }),
  );
  await insertAll(
    parentSeeds.map((p, i) => ({
      userId: parentIds[i],
      phone: `+998${p.phone}`,
    })),
    (data) => prisma.parentProfile.createMany({ data }),
  );
  await insertAll(
    parentSeeds.flatMap((p, i) =>
      p.children.map((loginId) => ({
        parentId: parentIds[i],
        studentId: students[loginId].id,
        relation: p.relation,
        createdById: admin.id,
      })),
    ),
    (data) => prisma.parentStudent.createMany({ data }),
  );

  // The next generated IDs continue after the seeded ones
  await prisma.idCounter.createMany({
    data: [
      { year: 2026, roleCode: 1, lastValue: lastStudentNumber },
      { year: 2026, roleCode: 2, lastValue: teacherSeeds.length },
    ],
  });

  return { adminId: admin.id, teachers, teacherOf, students };
}

// ─────────────────────── 3. courses and lessons ───────────────────────

interface SeededCourse {
  id: string;
  subject: string;
  group: string;
  band: Band;
  teacherId: string;
  studentIds: string[];
  categories: Record<'HOMEWORK' | 'QUIZ' | 'EXAM', string>;
  /** lesson ids per week (index 0 = week 1) */
  lessonsByWeek: string[][];
  /** module (week) ids, index 0 = week 1 */
  moduleIds: string[];
  /** topic of every school week (quarters 1 and 2), index 0 = week 1 */
  topics: string[];
}

type School = Pick<
  Awaited<ReturnType<typeof seedSchool>>,
  'yearId' | 'quarterIds' | 'subjects' | 'groups'
>;
type SeedUsers = Awaited<ReturnType<typeof seedUsers>>;

/** Every class takes every subject of its level: ~184 whole-class courses, one week per school week */
async function seedCourses(
  school: School,
  users: SeedUsers,
  classes: string[] = CLASSES,
) {
  const byGroup = new Map<string, string[]>();
  for (const s of Object.values(users.students)) {
    byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), s.id]);
  }

  const courses: SeededCourse[] = [];
  const rows = {
    courses: [] as Prisma.CourseCreateManyInput[],
    teachers: [] as Prisma.CourseTeacherCreateManyInput[],
    enrollments: [] as Prisma.EnrollmentCreateManyInput[],
    categories: [] as Prisma.GradeCategoryCreateManyInput[],
    modules: [] as Prisma.ModuleCreateManyInput[],
    lessons: [] as Prisma.LessonCreateManyInput[],
    progress: [] as Prisma.LessonProgressCreateManyInput[],
  };

  for (const group of classes) {
    const band = bandOf(gradeOf(group));
    for (const subject of SUBJECTS_BY_BAND[band]) {
      const title = `${subject} · ${group}`;
      const teacherId = users.teacherOf.get(title);
      if (!teacherId) throw new Error(`No teacher for ${title}`);
      const studentIds = byGroup.get(group) ?? [];
      const id = uuidv7();
      rows.courses.push({
        id,
        academicYearId: school.yearId,
        groupId: school.groups[group],
        subjectId: school.subjects[subject],
        title,
        status: 'ACTIVE',
      });
      rows.teachers.push({ courseId: id, teacherId, role: 'OWNER' });
      // Whole-class course: every student of the class is enrolled
      for (const studentId of studentIds) {
        rows.enrollments.push({ courseId: id, studentId });
      }

      // School default weights: Homework 30 / Quizzes 30 / Exams 40
      const categories = {} as SeededCourse['categories'];
      for (const [order, [kind, name, weight]] of (
        [
          ['HOMEWORK', 'Homework', 30],
          ['QUIZ', 'Quizzes', 30],
          ['EXAM', 'Exams', 40],
        ] as const
      ).entries()) {
        categories[kind] = uuidv7();
        rows.categories.push({
          id: categories[kind],
          courseId: id,
          name,
          weight,
          order,
        });
      }

      const topics = [...TOPICS[band][subject], ...TOPICS_Q2[band][subject]];
      const lessonsByWeek: string[][] = [];
      const moduleIds: string[] = [];
      for (const [w, { start: startsAt }] of seededWeeks().entries()) {
        const topic = topics[w];
        // Weeks that have started (plus next week) are published; later ones are still drafts
        const publishedAt =
          startsAt <= addDays(today(), 7)
            ? tashkent(addDays(startsAt, -2), '18:00')
            : null;
        const moduleId = uuidv7();
        moduleIds.push(moduleId);
        rows.modules.push({
          id: moduleId,
          courseId: id,
          title: `Week ${w + 1}: ${topic}`,
          order: w + 1,
          startsAt: day(startsAt),
          endsAt: day(addDays(startsAt, 4)),
          publishedAt,
        });
        const lessonIds = [uuidv7(), uuidv7()];
        lessonsByWeek.push(lessonIds);
        rows.lessons.push(
          {
            id: lessonIds[0],
            moduleId,
            title: topic,
            type: 'READING',
            body: `Notes for “${topic}”.`,
            completionType: 'VIEW',
            order: 1,
            publishedAt,
          },
          {
            id: lessonIds[1],
            moduleId,
            title: `Practice: ${topic}`,
            type: 'READING',
            body: `Practice problems for “${topic}”.`,
            completionType: 'MANUAL',
            order: 2,
            publishedAt,
          },
        );

        // Progress only for lessons of weeks that are already over or running
        if (startsAt <= today()) {
          for (const lessonId of lessonIds) {
            for (const studentId of studentIds) {
              const r = random();
              if (r < 0.12) continue; // not opened yet
              const doneOn = addDays(startsAt, Math.floor(random() * 4));
              // Never completed in the future: this week's later days are still to come
              const done = r > 0.3 && doneOn < today();
              rows.progress.push({
                studentId,
                lessonId,
                status: done ? 'COMPLETED' : 'IN_PROGRESS',
                completedAt: done ? tashkent(doneOn, '19:30') : null,
              });
            }
          }
        }
      }

      courses.push({
        id,
        subject,
        group,
        band,
        teacherId,
        studentIds,
        categories,
        lessonsByWeek,
        moduleIds,
        topics,
      });
    }
  }

  await insertAll(rows.courses, (data) => prisma.course.createMany({ data }));
  await insertAll(rows.teachers, (data) =>
    prisma.courseTeacher.createMany({ data }),
  );
  await insertAll(rows.enrollments, (data) =>
    prisma.enrollment.createMany({ data }),
  );
  await insertAll(rows.categories, (data) =>
    prisma.gradeCategory.createMany({ data }),
  );
  await insertAll(rows.modules, (data) => prisma.module.createMany({ data }));
  await insertAll(rows.lessons, (data) => prisma.lesson.createMany({ data }));
  await insertAll(rows.progress, (data) =>
    prisma.lessonProgress.createMany({ data }),
  );
  return courses;
}

// ─────────────────────── 4. assignments and grades ───────────────────────

// Quiz n is written at the end of these school weeks (quarter 1: 1–4, quarter 2: 5–7)
const QUIZ_WEEKS = [2, 4, 5, 7, 10, 12, 14];

/**
 * Grades older than a week are published, the newer ones are graded but still hidden. When a
 * quarter's grades come out, all of its work is published too.
 */
const isGradePublished = (due: string, quarter: number) =>
  due < addDays(today(), -7) || quarterPublished(quarter);

/** Round to 0.5 points, between 0 and max */
const roundHalf = (n: number, max: number) =>
  Math.min(max, Math.max(0, Math.round(n * 2) / 2));

async function seedAssignments(courses: SeededCourse[], users: SeedUsers) {
  // A stable "ability" per student (a rough bell curve around 78 %), so the same student is
  // strong or weak in every assignment
  const ability: Record<string, number> = {};
  for (const s of Object.values(users.students)) {
    const bell = (random() + random() + random()) / 3 - 0.5;
    ability[s.id] = Math.min(0.99, Math.max(0.45, 0.78 + bell * 0.5));
  }
  const aziz = users.students['26100042'].id;

  const rows = {
    assignments: [] as Prisma.AssignmentCreateManyInput[],
    questions: [] as Prisma.QuizQuestionCreateManyInput[],
    submissions: [] as Prisma.SubmissionCreateManyInput[],
    attempts: [] as Prisma.SubmissionAttemptCreateManyInput[],
    comments: [] as Prisma.SubmissionCommentCreateManyInput[],
  };
  // Every published score, for the quarter grades
  const scores: PublishedScore[] = [];

  const weeks = seededWeeks();
  for (const course of courses) {
    const items: {
      type: 'HOMEWORK' | 'QUIZ' | 'EXAM';
      title: string;
      due: string;
      maxScore: number;
      week: number;
      quarter: number;
    }[] = [];
    // Homework n belongs to week n: same topic, due on that week's Saturday
    // (Algebra 9A: "Homework 5: Factoring Higher Degree Polynomials", as in the design)
    for (const [i, { start, quarter }] of weeks.entries()) {
      items.push({
        type: 'HOMEWORK',
        title: `Homework ${i + 1}: ${course.topics[i]}`,
        due: addDays(start, 5),
        maxScore: 10,
        week: i + 1,
        quarter,
      });
    }
    for (const [i, week] of QUIZ_WEEKS.entries()) {
      if (week > weeks.length) break;
      const name =
        course.subject === 'Algebra' && course.band === 'MIDDLE' && i < 4
          ? ALGEBRA_QUIZZES[i]
          : course.topics[week - 1];
      items.push({
        type: 'QUIZ',
        title: `Quiz ${i + 1}: ${name}`,
        due: addDays(weeks[week - 1].start, 5),
        maxScore: 20,
        week,
        quarter: weeks[week - 1].quarter,
      });
    }
    // One written exam in the last week of every quarter
    for (const quarter of new Set(weeks.map((w) => w.quarter))) {
      items.push({
        type: 'EXAM',
        title: `Quarter ${quarter} Exam`,
        due: QUARTERS[quarter - 1].exam,
        maxScore: 100,
        week: weeks.filter((w) => w.quarter <= quarter).length,
        quarter,
      });
    }

    for (const item of items) {
      const isPast = item.due < today();
      const isPublished = isPast && isGradePublished(item.due, item.quarter);
      const assignmentId = uuidv7();
      rows.assignments.push({
        id: assignmentId,
        courseId: course.id,
        // The week it sits in on the course page
        moduleId: course.moduleIds[item.week - 1],
        lessonId: course.lessonsByWeek[item.week - 1][1],
        categoryId: course.categories[item.type],
        type: item.type,
        title: item.title,
        instructions:
          item.type === 'EXAM'
            ? 'Written exam in class. Grade only, no upload.'
            : item.type === 'QUIZ'
              ? 'Answer every question in 15 minutes. One attempt.'
              : 'Upload your solution as a PDF or photo.',
        maxScore: item.maxScore,
        dueAt: tashkent(item.due),
        allowLate: item.type === 'HOMEWORK',
        maxAttempts: item.type === 'HOMEWORK' ? 2 : 1,
        acceptedFileTypes:
          item.type === 'HOMEWORK' ? ['pdf', 'jpg', 'png'] : [],
        timeLimitMin: item.type === 'QUIZ' ? 15 : null,
        tutorMode: item.type === 'HOMEWORK' ? 'HINTS' : 'OFF',
        publishedAt: tashkent(addDays(item.due, -6), '18:00'),
        gradesPublishedAt: isPublished
          ? tashkent(addDays(item.due, 3), '17:00')
          : null,
        createdById: course.teacherId,
      });

      // Every quiz gets four questions worth 5 points each (= maxScore 20)
      if (item.type === 'QUIZ') {
        for (const [order, q] of QUIZ_QUESTIONS[course.subject].entries()) {
          rows.questions.push({ ...q, assignmentId, order, points: 5 });
        }
      }

      // Future and today's work has no grades yet
      if (item.due > today()) continue;
      // The teacher grades about two days after the deadline (never "graded" in the future)
      const gradingDone = addDays(item.due, 2) < today();

      // Exams are written in class: a mark for everyone, no upload
      if (item.type === 'EXAM') {
        if (!isPublished && !gradingDone) continue;
        for (const studentId of course.studentIds) {
          const score = roundHalf(
            item.maxScore * (ability[studentId] + (random() - 0.5) * 0.2),
            item.maxScore,
          );
          rows.submissions.push({
            assignmentId,
            studentId,
            status: 'GRADED',
            score,
            gradedById: course.teacherId,
            gradedAt: tashkent(addDays(item.due, 2), '16:00'),
          });
          if (isPublished) {
            scores.push({ course, studentId, item, score });
          }
        }
        continue;
      }

      for (const studentId of course.studentIds) {
        const isAzizHw5 =
          studentId === aziz &&
          course.subject === 'Algebra' &&
          course.group === '9A' &&
          item.title.startsWith('Homework 5');
        const r = random();
        // Weaker students miss more work
        if (r < 0.04 + (1 - ability[studentId]) * 0.15 && !isAzizHw5) {
          // Did not submit: after publishing the teacher pressed "Give 0 to not submitted"
          if (isPublished) {
            rows.submissions.push({
              assignmentId,
              studentId,
              status: 'MISSING',
              score: 0,
              gradedById: course.teacherId,
              gradedAt: tashkent(addDays(item.due, 2), '16:00'),
            });
            scores.push({ course, studentId, item, score: 0 });
          }
          continue;
        }

        const isLate =
          r > 0.92 &&
          item.type === 'HOMEWORK' &&
          addDays(item.due, 1) < today();
        const submittedAt = isAzizHw5
          ? tashkent(item.due, '21:14')
          : isLate
            ? tashkent(addDays(item.due, 1), '10:20')
            : tashkent(addDays(item.due, -Math.floor(random() * 3)), '20:05');
        // Published items are fully graded; the next ones about 70% (the teacher is still grading)
        const isGraded =
          isPast &&
          (isPublished || isAzizHw5 || (gradingDone && random() < 0.7));
        const score = isAzizHw5
          ? 9
          : roundHalf(
              item.maxScore * (ability[studentId] + (random() - 0.5) * 0.2),
              item.maxScore,
            );
        if (isPublished) scores.push({ course, studentId, item, score });

        const submissionId = uuidv7();
        rows.submissions.push({
          id: submissionId,
          assignmentId,
          studentId,
          status: isGraded ? 'GRADED' : isLate ? 'LATE' : 'SUBMITTED',
          score: isGraded ? score : null,
          feedback:
            isGraded && score >= item.maxScore * 0.9
              ? 'Excellent work, keep it up!'
              : null,
          gradedById: isGraded ? course.teacherId : null,
          gradedAt: isGraded ? tashkent(addDays(item.due, 2), '16:00') : null,
          submittedAt,
        });
        rows.attempts.push({
          submissionId,
          number: 1,
          text: isAzizHw5 ? 'My solution is in the attached PDF.' : null,
          isLate,
          submittedAt,
        });
        if (isAzizHw5) {
          rows.comments.push(
            {
              submissionId,
              authorId: aziz,
              body: 'I double-checked problem 6 using synthetic division as recommended in Wednesday’s lecture. Hope the grouping notation is clear!',
              createdAt: submittedAt,
            },
            {
              submissionId,
              authorId: course.teacherId,
              body: 'Watch sign distribution when factoring -(2x - 3). Remember (x² - 3) factors further over the reals into (x - √3)(x + √3).',
              createdAt: tashkent(addDays(item.due, 2), '15:40'),
            },
          );
        }
      }
    }
  }

  await insertAll(rows.assignments, (data) =>
    prisma.assignment.createMany({ data }),
  );
  await insertAll(rows.questions, (data) =>
    prisma.quizQuestion.createMany({ data }),
  );
  await insertAll(rows.submissions, (data) =>
    prisma.submission.createMany({ data }),
  );
  await insertAll(rows.attempts, (data) =>
    prisma.submissionAttempt.createMany({ data }),
  );
  await prisma.submissionComment.createMany({ data: rows.comments });
  return scores;
}

interface PublishedScore {
  course: SeededCourse;
  studentId: string;
  item: {
    type: 'HOMEWORK' | 'QUIZ' | 'EXAM';
    maxScore: number;
    quarter: number;
  };
  score: number;
}

/**
 * The quarter grades of every quarter whose grades are out (DECISIONS §10): each teacher pressed
 * "Publish quarter grades", so every student has a snapshot of the weighted % from the published
 * scores, the same math as the gradebook (calculateGrade).
 */
async function seedQuarterGrades(
  school: School,
  courses: SeededCourse[],
  scores: PublishedScore[],
) {
  const rows: Prisma.PeriodGradeCreateManyInput[] = [];
  const quarters = [...new Set(seededWeeks().map((w) => w.quarter))].filter(
    quarterPublished,
  );
  for (const quarter of quarters) {
    const publishedAt = tashkent(
      addDays(QUARTERS[quarter - 1].end, 4),
      '17:00',
    );
    for (const course of courses) {
      const categories = [
        { id: course.categories.HOMEWORK, name: 'Homework', weight: 30 },
        { id: course.categories.QUIZ, name: 'Quizzes', weight: 30 },
        { id: course.categories.EXAM, name: 'Exams', weight: 40 },
      ];
      const own = scores.filter(
        (s) => s.course === course && s.item.quarter === quarter,
      );
      for (const studentId of course.studentIds) {
        const { percent } = calculateGrade(
          categories,
          own
            .filter((s) => s.studentId === studentId)
            .map((s) => ({
              categoryId: course.categories[s.item.type],
              score: s.score,
              maxScore: s.item.maxScore,
            })),
          // Only the % is stored; the mark is worked out from the school's thresholds when shown
          { mark5MinPercent: 86, mark4MinPercent: 71, mark3MinPercent: 56 },
        );
        if (percent === null) continue;
        rows.push({
          studentId,
          courseId: course.id,
          periodId: school.quarterIds[quarter - 1],
          computedScore: percent,
          publishedAt,
          publishedById: course.teacherId,
        });
      }
    }
  }
  await insertAll(rows, (data) => prisma.periodGrade.createMany({ data }));
}

// ─────────────────── 5. attendance and announcements ───────────────────

/** Aziz's two excused absences from the parent dashboard design */
const AZIZ_EXCUSED = ['2026-09-18', '2026-10-02'];

/** One session per lesson day of every school week up to yesterday; ~93 % present overall */
async function seedAttendance(courses: SeededCourse[], users: SeedUsers) {
  const aziz = users.students['26100042'].id;
  const sessions: Prisma.ClassSessionCreateManyInput[] = [];
  const records: Prisma.AttendanceRecordCreateManyInput[] = [];

  // Monday–Friday of each school week (the holidays between quarters have no lessons)
  const schoolDays: { date: string; week: number }[] = [];
  for (const [w, { start }] of seededWeeks().entries()) {
    for (let i = 0; i < 5; i++) {
      const date = addDays(start, i);
      if (date < today()) schoolDays.push({ date, week: w + 1 });
    }
  }

  for (const course of courses) {
    const dates = schoolDays.filter((d) =>
      LESSON_DAYS[course.subject].includes(weekday(d.date)),
    );

    for (const [i, { date, week }] of dates.entries()) {
      const sessionId = uuidv7();
      sessions.push({
        id: sessionId,
        courseId: course.id,
        date: day(date),
        lessonId: course.lessonsByWeek[week - 1][0],
        createdById: course.teacherId,
      });

      // English 9A's last lesson is left unmarked: it shows up in "Attendance to take"
      if (
        course.subject === 'English' &&
        course.group === '9A' &&
        i === dates.length - 1
      )
        continue;

      for (const studentId of course.studentIds) {
        const r = random();
        const status =
          studentId === aziz && AZIZ_EXCUSED.includes(date)
            ? 'EXCUSED'
            : studentId === aziz
              ? 'PRESENT'
              : r < 0.93
                ? 'PRESENT'
                : r < 0.96
                  ? 'LATE'
                  : r < 0.985
                    ? 'ABSENT'
                    : 'EXCUSED';
        records.push({
          sessionId,
          studentId,
          status,
          note: status === 'EXCUSED' ? 'Note from parent' : null,
          markedById: course.teacherId,
          markedAt: tashkent(date, '09:10'),
        });
      }
    }
  }

  await insertAll(sessions, (data) => prisma.classSession.createMany({ data }));
  await insertAll(records, (data) =>
    prisma.attendanceRecord.createMany({ data }),
  );
}

/**
 * The design's announcements, then one note per other course. `withSchool` false (the partial
 * reset): only the given courses' announcements, the school-wide ones belong to the admin.
 */
async function seedAnnouncements(
  courses: SeededCourse[],
  users: SeedUsers,
  withSchool = true,
) {
  // undefined: the course is not part of this run (the partial reset rewrites 9A / 11A only)
  const course = (title: string) =>
    courses.find((c) => `${c.subject} · ${c.group}` === title)?.id;
  const [q1, q2] = QUARTERS;
  const story: {
    courseId: string | null | undefined;
    authorId: string;
    title: string;
    body: string;
    isPinned: boolean;
    eventDate: string | null;
    at: string;
  }[] = [
    {
      courseId: null,
      authorId: users.adminId,
      title: 'Quarter 1 ends on October 31',
      body: 'Quarter grades are published by November 4. The autumn break is November 1–8.',
      isPinned: today() <= q1.end,
      eventDate: '2026-10-31',
      at: '2026-10-12',
    },
    // Once quarter 1 is over: its grades, then the plan of quarter 2
    ...(quarterPublished(1)
      ? [
          {
            courseId: null,
            authorId: users.adminId,
            title: 'Quarter 1 grades are published',
            body: `Every student and parent can see them on the Grades page. Quarter 2 runs from ${longDate(q2.start)} to ${longDate(q2.end)}.`,
            isPinned: false,
            eventDate: null,
            at: addDays(q1.end, 4),
          },
        ]
      : []),
    ...(today() >= q2.start
      ? [
          {
            courseId: null,
            authorId: users.adminId,
            title: `Quarter 2 exams in the week of ${longDate(addDays(q2.end, -6))}`,
            body: `Each subject writes its quarter exam in the last week. The winter break starts on ${longDate(addDays(q2.end, 1))}.`,
            isPinned: true,
            eventDate: q2.exam,
            at: q2.start,
          },
        ]
      : []),
    {
      courseId: null,
      authorId: users.adminId,
      title: 'Parent–teacher meeting',
      body: 'Parents of grade 9 are invited on Saturday, October 24 at 10:00 in the assembly hall.',
      isPinned: false,
      eventDate: '2026-10-24',
      at: '2026-10-15',
    },
    {
      courseId: course('Algebra · 9A'),
      authorId: users.teachers.Karimova,
      title: 'Quiz 4: Discriminant on Saturday',
      body: 'Review weeks 5–6. Calculators are not allowed.',
      isPinned: false,
      eventDate: '2026-10-24',
      at: '2026-10-16',
    },
    {
      courseId: course('Algebra · 9B'),
      authorId: users.teachers.Karimova,
      title: 'Homework 6 hints',
      body: 'Start with the discriminant before solving each equation.',
      isPinned: false,
      eventDate: null,
      at: '2026-10-14',
    },
    {
      courseId: course('English · 9A'),
      authorId: users.teachers.Smith,
      title: 'Bring Animal Farm to class',
      body: 'We will discuss chapters 4–6 on Tuesday.',
      isPinned: false,
      eventDate: null,
      at: '2026-10-13',
    },
    {
      courseId: course('Physics · 9A'),
      authorId: users.teachers.Aliyev,
      title: 'Lab Protocol 4 deadline extended',
      body: 'You can submit Lab Protocol 4 until Friday with full credit.',
      isPinned: false,
      eventDate: null,
      at: '2026-10-15',
    },
  ];

  const items = story
    .filter(
      (a) => a.courseId !== undefined && (withSchool || a.courseId !== null),
    )
    .map((a) => ({ ...a, courseId: a.courseId ?? null }));

  // Every course gets one recent note from its teacher about the current week
  const weeks = seededWeeks();
  const now = currentWeek();
  const quarter = weeks[now].quarter;
  const inQuarter = weeks
    .map((w, i) => ({ ...w, number: i + 1 }))
    .filter((w) => w.quarter === quarter);
  const [first, last] = [inQuarter[0].number, inQuarter.at(-1)!.number];
  const lastDone = Math.max(now, 1); // the latest week whose homework is graded
  const daysAgo = (n: number) => addDays(today(), -n);
  const notes = [
    (c: SeededCourse) => ({
      title: `This week: ${c.topics[now]}`,
      body: `Read the notes lesson of week ${now + 1} before class and bring your questions.`,
      at: daysAgo(1),
    }),
    (c: SeededCourse) => ({
      title: 'Bring your notebooks on Monday',
      body: `We start “${c.topics[Math.min(now + 1, weeks.length - 1)]}”. Please bring your notebook and a pencil.`,
      at: daysAgo(2),
    }),
    () => ({
      title: `Quarter ${quarter} exam on ${longDate(QUARTERS[quarter - 1].exam)}`,
      body: `The exam covers weeks ${first}–${last - 1}. Week ${last} is for review.`,
      at: daysAgo(3),
    }),
    (c: SeededCourse) => ({
      title: `Great work on Homework ${lastDone}`,
      body: `Most of you did very well on “${c.topics[lastDone - 1]}”. Corrections are in your feedback.`,
      at: daysAgo(4),
    }),
  ];
  courses.forEach((c, i) => {
    const note = notes[i % notes.length](c);
    items.push({
      courseId: c.id,
      authorId: c.teacherId,
      isPinned: false,
      eventDate: null,
      ...note,
    });
  });

  // About two thirds of the audience has read each one (read receipts on the teacher side)
  const everyone = Object.values(users.students).map((s) => s.id);
  const audience = new Map(courses.map((c) => [c.id, c.studentIds]));
  const announcements: Prisma.AnnouncementCreateManyInput[] = [];
  const reads: Prisma.AnnouncementReadCreateManyInput[] = [];
  for (const a of items) {
    const id = uuidv7();
    const publishedAt = tashkent(a.at, '12:00');
    announcements.push({
      id,
      courseId: a.courseId,
      authorId: a.authorId,
      title: a.title,
      body: a.body,
      isPinned: a.isPinned,
      eventDate: a.eventDate ? day(a.eventDate) : null,
      publishedAt,
      createdAt: publishedAt,
    });
    for (const userId of a.courseId
      ? (audience.get(a.courseId) ?? [])
      : everyone) {
      if (random() < 0.66) {
        reads.push({
          announcementId: id,
          userId,
          readAt: tashkent(a.at, '20:30'),
        });
      }
    }
  }
  await prisma.announcement.createMany({ data: announcements });
  await insertAll(reads, (data) =>
    prisma.announcementRead.createMany({ data }),
  );

  const aziz = users.students['26100042'].id;
  await prisma.notification.createMany({
    data: [
      {
        userId: aziz,
        type: 'GRADE_PUBLISHED',
        title: 'Homework 3: Factoring Trinomials was graded',
        link: '/student/grades',
        createdAt: tashkent('2026-09-29', '17:00'),
      },
      // This week's homework of Algebra 9A, sent on the Sunday evening before
      {
        userId: aziz,
        type: 'ASSIGNMENT_DUE',
        title: `Homework ${now + 1}: ${courses.find((c) => c.subject === 'Algebra' && c.group === '9A')?.topics[now]} is due on Saturday`,
        link: '/student/todo',
        createdAt: tashkent(addDays(weeks[now].start, -1), '18:00'),
      },
      ...(quarterPublished(1)
        ? [
            {
              userId: aziz,
              type: 'GRADE_PUBLISHED' as const,
              title: 'Quarter 1 grades were published',
              link: '/student/grades',
              createdAt: tashkent(addDays(q1.end, 4), '17:00'),
            },
          ]
        : []),
      {
        userId: aziz,
        type: 'ANNOUNCEMENT',
        title: 'Quarter 1 ends on October 31',
        link: '/student/announcements',
        createdAt: tashkent('2026-10-12', '12:00'),
      },
    ],
  });
}

// ──────────────────────────────── 7. Q&A ────────────────────────────────

/** Course Q&A threads from the Stitch Q&A screens: two unanswered ones fill the teacher's inbox */
async function seedQuestions(courses: SeededCourse[], users: SeedUsers) {
  const course = (title: string) =>
    courses.find((c) => `${c.subject} · ${c.group}` === title)!;
  const student = (loginId: string) => users.students[loginId].id;
  const lesson = async (courseId: string, title: string) =>
    (
      await prisma.lesson.findFirstOrThrow({
        where: { title, module: { courseId } },
        select: { id: true },
      })
    ).id;
  const assignment = async (courseId: string, prefix: string) =>
    (
      await prisma.assignment.findFirstOrThrow({
        where: { courseId, title: { startsWith: prefix } },
        select: { id: true },
      })
    ).id;

  const algebra = course('Algebra · 9A');
  const physics = course('Physics · 9A');
  const karimova = users.teachers.Karimova;
  type Reply = { by: string; staff?: true; body: string; at: string };
  const items: {
    courseId: string;
    by: string;
    title: string;
    body: string;
    at: string;
    lessonId?: string;
    assignmentId?: string;
    isPrivate?: true;
    isPinned?: true;
    resolved?: true;
    replies: Reply[];
  }[] = [
    {
      courseId: algebra.id,
      by: student('26100032'),
      title: 'How is the quarter grade calculated?',
      body: 'Do quizzes count more than homework?',
      at: '2026-09-12 16:20',
      isPinned: true,
      resolved: true,
      replies: [
        {
          by: karimova,
          staff: true,
          body: 'Homework 30%, quizzes 30%, exams 40%. Each category is the average of its scores, and the Grades page shows your running total.',
          at: '2026-09-12 18:05',
        },
        { by: student('26100055'), body: 'Thank you!', at: '2026-09-12 19:10' },
      ],
    },
    {
      courseId: algebra.id,
      by: student('26100089'),
      title: 'What does the discriminant tell us?',
      body: 'Does a negative discriminant only mean no real roots, or does it also tell anything about the graph?',
      at: '2026-10-12 15:40',
      lessonId: await lesson(algebra.id, 'The Discriminant'),
      replies: [
        {
          by: student('26100055'),
          body: 'If it is negative, the parabola never touches the x-axis.',
          at: '2026-10-12 17:00',
        },
        {
          by: karimova,
          staff: true,
          body: 'Exactly: D < 0 means the graph does not cross the x-axis. D = 0 means it touches it once (the vertex is on the axis).',
          at: '2026-10-12 19:30',
        },
      ],
    },
    {
      courseId: algebra.id,
      by: student('26100042'),
      title: 'Question about my Quiz 3 score',
      body: 'I got 9/10 — which question did I lose the point on?',
      at: '2026-10-07 18:15',
      isPrivate: true,
      resolved: true,
      replies: [
        {
          by: karimova,
          staff: true,
          body: 'Question 8: the roots were right, but the answer needed both of them. Good work overall!',
          at: '2026-10-08 09:10',
        },
      ],
    },
    {
      courseId: algebra.id,
      by: student('26100055'),
      title: 'Can we use a calculator on Quiz 4?',
      body: 'Will scientific calculators be allowed, or should we do everything by hand?',
      at: '2026-10-16 17:30',
      replies: [
        {
          by: karimova,
          staff: true,
          body: 'No calculators on Quiz 4 — the numbers are small on purpose.',
          at: '2026-10-16 18:00',
        },
      ],
    },
    {
      courseId: algebra.id,
      by: student('26100042'),
      title: 'Problem 7 — why is the last factor (x + 3)?',
      body: 'In step 4 I factored x²(x + 2) − 9(x + 2) and got (x + 2)(x² − 9). Why does the answer key end with (x − 3)(x + 3)? Did I miss a step?',
      at: '2026-10-16 19:40',
      assignmentId: await assignment(algebra.id, 'Homework 5'),
      replies: [
        {
          by: student('26100055'),
          body: 'x² − 9 is a difference of squares, so you can split it again.',
          at: '2026-10-16 20:05',
        },
      ],
    },
    {
      courseId: algebra.id,
      by: student('26100104'),
      title: 'Is synthetic division the same as long division?',
      body: 'Can we use synthetic division on the test, or do we have to write out every step of long division?',
      at: '2026-10-17 08:10',
      lessonId: await lesson(algebra.id, 'Factoring Higher Degree Polynomials'),
      replies: [],
    },
    {
      courseId: physics.id,
      by: student('26100118'),
      title: 'Lab 4: do we include air resistance?',
      body: 'The block moves slowly, so I think we can ignore it — is that right?',
      at: '2026-10-16 16:45',
      replies: [],
    },
  ];

  // Every other grade 5–11 course: most get a question from a student about this week's topic,
  // usually answered by the teacher, sometimes only by a classmate
  const asks = [
    (topic: string) => ({
      title: `Can you explain “${topic}” again?`,
      body: 'I did not understand the example from the last lesson.',
      answer:
        'Of course! Look at the practice lesson of this week — I added two worked examples.',
    }),
    (topic: string) => ({
      title: `Is there extra practice for “${topic}”?`,
      body: 'I want to prepare better before the quiz.',
      answer:
        'Yes — the practice lesson has extra problems. Bring your questions to class.',
    }),
    () => ({
      title: `What will the Quarter ${quarter} exam look like?`,
      body: 'Will it be like the quizzes or longer problems?',
      answer: `Like the quizzes, plus two longer problems. Week ${lastWeek} is for review.`,
    }),
  ];
  // The current week and its quarter's last (review) week
  const weeks = seededWeeks();
  const now = currentWeek();
  const quarter = weeks[now].quarter;
  const lastWeek = weeks.filter((w) => w.quarter <= quarter).length;
  const story = new Set([algebra.id, physics.id]);
  for (const c of courses) {
    if (c.band === 'PRIMARY' || story.has(c.id) || random() < 0.35) continue;
    const ask = pick(asks)(c.topics[now]);
    const by = pick(c.studentIds);
    const classmate = pick(c.studentIds.filter((id) => id !== by));
    // Asked in the last few days, answered the same evening
    const date = addDays(today(), -1 - Math.floor(random() * 4));
    const r = random();
    const replies: Reply[] =
      r < 0.65
        ? [
            {
              by: c.teacherId,
              staff: true,
              body: ask.answer,
              at: `${date} 20:40`,
            },
          ]
        : r < 0.85
          ? [
              {
                by: classmate,
                body: 'Check the practice lesson, it helped me.',
                at: `${date} 21:10`,
              },
            ]
          : [];
    items.push({
      courseId: c.id,
      by,
      title: ask.title,
      body: ask.body,
      at: `${date} 18:${String(Math.floor(random() * 50) + 10)}`,
      lessonId: ask.answer.startsWith('Like')
        ? undefined
        : c.lessonsByWeek[now][0],
      resolved: r < 0.3 ? true : undefined,
      replies,
    });
  }

  /** "2026-10-16 19:40" → that moment in Tashkent */
  const at = (value: string) => {
    const [date, time] = value.split(' ');
    return tashkent(date, time);
  };
  for (const item of items) {
    const staffReply = item.replies.find((r) => r.staff);
    const lastReply = item.replies.at(-1);
    await prisma.courseQuestion.create({
      data: {
        courseId: item.courseId,
        authorId: item.by,
        lessonId: item.lessonId,
        assignmentId: item.assignmentId,
        title: item.title,
        body: item.body,
        isPrivate: item.isPrivate ?? false,
        isPinned: item.isPinned ?? false,
        answeredAt: staffReply ? at(staffReply.at) : null,
        resolvedAt: item.resolved && lastReply ? at(lastReply.at) : null,
        createdAt: at(item.at),
        answers: {
          create: item.replies.map((r) => ({
            authorId: r.by,
            body: r.body,
            isStaff: r.staff ?? false,
            createdAt: at(r.at),
          })),
        },
      },
    });
  }
}

// ─────────────────────────── partial nightly reset ───────────────────────────

/** The classes that belong to the demo (DECISIONS §12, demo v2): the nightly reset rewrites them */
export const DEMO_CLASSES = ['9A', '11A'];

/** The current year's school structure and courses of the demo classes, read from the database */
async function loadSchool() {
  const year = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });
  if (!year)
    throw new Error('No current academic year: run the full seed first');
  const groups: Record<string, string> = {};
  for (const g of await prisma.group.findMany({
    where: { academicYearId: year.id, name: { in: DEMO_CLASSES } },
  })) {
    groups[g.name] = g.id;
  }
  const missing = DEMO_CLASSES.filter((name) => !groups[name]);
  if (missing.length)
    throw new Error(`Demo classes missing: ${missing.join(', ')}`);
  const subjects: Record<string, string> = {};
  for (const sub of await prisma.subject.findMany())
    subjects[sub.name] = sub.id;
  const courses = await prisma.course.findMany({
    where: { academicYearId: year.id, groupId: { in: Object.values(groups) } },
    select: { id: true },
  });
  // The admin's quarters (the full seed wrote them with the real dates of QUARTERS)
  const quarters = await prisma.period.findMany({
    where: { academicYearId: year.id, kind: 'QUARTER' },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  return {
    yearId: year.id,
    quarterIds: quarters.map((q) => q.id),
    groups,
    subjects,
    courseIds: courses.map((c) => c.id),
  };
}

/**
 * The people the demo classes need, as the full seed would have returned them: their students
 * (current members), the teachers of the seeded timetable (found by login ID) and the admin.
 */
async function loadUsers(
  groups: Record<string, string>,
): Promise<SeedUsers & { demoIds: string[] }> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { loginId: 'asc' },
  });
  const teacherRows = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, loginId: true, lastName: true },
  });
  const byLogin = new Map(teacherRows.map((t) => [t.loginId, t.id]));
  const teachers: Record<string, string> = {};
  for (const t of teacherRows) teachers[t.lastName] = t.id;
  const teacherOf = new Map<string, string>();
  for (const t of generateTeachers()) {
    const id = byLogin.get(t.loginId);
    if (!id)
      throw new Error(
        `Teacher ${t.loginId} is missing: run the full seed first`,
      );
    for (const course of t.courses) teacherOf.set(course, id);
  }
  const groupName = new Map(
    Object.entries(groups).map(([name, id]) => [id, name]),
  );
  const members = await prisma.groupMember.findMany({
    where: { groupId: { in: Object.values(groups) }, leftAt: null },
    select: { groupId: true, student: { select: { id: true, loginId: true } } },
  });
  const students: Record<string, { id: string; group: string }> = {};
  for (const m of members) {
    students[m.student.loginId] = {
      id: m.student.id,
      group: groupName.get(m.groupId)!,
    };
  }
  const demo = await prisma.user.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  return {
    adminId: admin?.id ?? '',
    teachers,
    teacherOf,
    students,
    demoIds: demo.map((u) => u.id),
  };
}

/**
 * Everything of the demo classes' courses, child rows first (foreign keys), plus what the demo
 * accounts left anywhere else (reads, tutor chats, notifications, their audit rows). This is the
 * one place rows are really deleted: demo data is rebuilt every night, nothing in it is a record.
 */
async function deleteDemoData(courseIds: string[], demoIds: string[]) {
  const inCourses = { courseId: { in: courseIds } };
  const ofAssignment = { assignment: inCourses };
  await prisma.quizAnswer.deleteMany({ where: { attempt: ofAssignment } });
  await prisma.quizAttempt.deleteMany({ where: ofAssignment });
  await prisma.submissionFile.deleteMany({
    where: { attempt: { submission: ofAssignment } },
  });
  await prisma.submissionComment.deleteMany({
    where: { submission: ofAssignment },
  });
  await prisma.submissionAttempt.deleteMany({
    where: { submission: ofAssignment },
  });
  await prisma.submission.deleteMany({ where: ofAssignment });
  await prisma.assignmentFile.deleteMany({ where: ofAssignment });
  await prisma.quizQuestion.deleteMany({ where: ofAssignment });
  await prisma.documentChunk.deleteMany({ where: inCourses });
  const tutor = { OR: [inCourses, { studentId: { in: demoIds } }] };
  await prisma.tutorMessage.deleteMany({ where: { conversation: tutor } });
  await prisma.tutorConversation.deleteMany({ where: tutor });
  await prisma.courseAnswer.deleteMany({
    where: { OR: [{ question: inCourses }, { authorId: { in: demoIds } }] },
  });
  await prisma.courseQuestion.deleteMany({ where: inCourses });
  await prisma.periodGrade.deleteMany({ where: inCourses });
  await prisma.attendanceRecord.deleteMany({ where: { session: inCourses } });
  await prisma.classSession.deleteMany({ where: inCourses });
  const ofLesson = { lesson: { module: inCourses } };
  await prisma.lessonProgress.deleteMany({ where: ofLesson });
  await prisma.lessonResource.deleteMany({ where: ofLesson });
  await prisma.announcementRead.deleteMany({
    where: { OR: [{ announcement: inCourses }, { userId: { in: demoIds } }] },
  });
  await prisma.announcementFile.deleteMany({
    where: { announcement: inCourses },
  });
  await prisma.announcement.deleteMany({ where: inCourses });
  await prisma.assignment.deleteMany({ where: inCourses });
  await prisma.lesson.deleteMany({ where: { module: inCourses } });
  await prisma.module.deleteMany({ where: inCourses });
  await prisma.gradeCategory.deleteMany({ where: inCourses });
  await prisma.enrollment.deleteMany({ where: inCourses });
  await prisma.courseTeacher.deleteMany({ where: inCourses });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: demoIds } } });
}

/**
 * The nightly demo reset (DECISIONS §12, demo v2): only 9A / 11A and the demo accounts' traces
 * are rewritten from the seed, up to the real "today" (new weeks, grades, quarter grades). The
 * admin's data (users, classes, settings, calendar, website, uploads) and the other 20 classes
 * are never touched. One transaction: a failed reset leaves yesterday's demo as it was.
 */
export async function resetDemoClasses(
  client: SeedClient,
  options: { now: Date },
) {
  startRun(options.now);
  return client.$transaction(
    async (tx) => {
      prisma = tx as unknown as SeedClient;
      const school = await loadSchool();
      const users = await loadUsers(school.groups);
      await deleteDemoData(school.courseIds, users.demoIds);
      const courses = await seedCourses(school, users, DEMO_CLASSES);
      const scores = await seedAssignments(courses, users);
      await seedQuarterGrades(school, courses, scores);
      await seedAttendance(courses, users);
      await seedAnnouncements(courses, users, false);
      await seedQuestions(courses, users);
      return { today: today(), courses: courses.length };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

// ───────────────────────────── summary ─────────────────────────────

/** Rows per non-empty table, for the summary */
export async function countRows(client: SeedClient) {
  prisma = client;
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename`;
  const rows: Record<string, number> = {};
  for (const { tablename } of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) FROM "${tablename}"`,
    );
    if (count > 0n) rows[tablename] = Number(count);
  }
  return rows;
}

/**
 * Wipes the database and writes the demo data. Only call it for a local or demo database:
 * the CLI (prisma/seed.ts) and the batch reset check that before calling.
 */
export async function seedDemo(client: SeedClient, options: SeedDemoOptions) {
  if (options.password.length < 8) {
    throw new Error('SEED_PASSWORD must be at least 8 characters');
  }
  prisma = client;
  SEED_PASSWORD = options.password;
  DEMO_ACCOUNTS = new Set(options.demoMode ? SHOWCASE_ACCOUNTS : []);
  startRun(options.now ?? new Date());

  await reset();
  const school = await seedSchool();
  const users = await seedUsers(school.groups);
  const courses = await seedCourses(school, users);
  const scores = await seedAssignments(courses, users);
  await seedQuarterGrades(school, courses, scores);
  await seedAttendance(courses, users);
  await seedAnnouncements(courses, users);
  await seedQuestions(courses, users);
  await seedSite(prisma, {
    adminId: users.adminId,
    day,
    tashkent,
    students: users.students,
  });
  return { today: today() };
}
