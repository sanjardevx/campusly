// Demo data for local development and the public demo (DECISIONS §12).
// Used by `pnpm prisma db seed` (prisma/seed.ts) and by the batch app's nightly demo reset.
// It WIPES all tables first, so every run gives the same data.
// Names follow the Stitch design (Aziz Karimov 26100042, teacher Nilufar Karimova, ...).
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import type { ParentRelation, UserStatus } from '../generated/prisma/enums';

/** A plain client for the seed (the API's PrismaService hides columns the seed writes) */
export const createSeedClient = (databaseUrl: string) =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
type SeedClient = ReturnType<typeof createSeedClient>;

export interface SeedDemoOptions {
  /** Every seeded account gets this password (from env, never from git) */
  password: string;
  /** DEMO_MODE=true: flag the showcase accounts for "Demo login" */
  demoMode: boolean;
  /** Move the demo story forward in whole weeks so "today" is close to this day (nightly reset) */
  shiftTo?: Date;
}

// One seed run at a time: seedDemo() sets these, the steps below read them
let prisma: SeedClient;
let SEED_PASSWORD = '';
let DEMO_ACCOUNTS = new Set<string>();
let shiftMs = 0;

// ───────────────────────────── helpers ─────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
/** Calendar date for @db.Date columns (no time, no timezone), moved by the week shift */
const day = (iso: string) =>
  new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + shiftMs);
/** A moment in Tashkent time (UTC+5), stored as UTC, moved by the week shift */
const tashkent = (iso: string, time = '23:59') =>
  new Date(new Date(`${iso}T${time}:00+05:00`).getTime() + shiftMs);
/** YYYY-MM-DD of a calendar date plus n days (story dates: not shifted) */
const addDays = (iso: string, n: number) =>
  new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** Seeded random numbers (mulberry32): the same "random" scores and attendance on every run */
let randomState = 2026;
function random() {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = randomState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * "Today" of the demo story. The data is written around this date (string comparisons below);
 * day() / tashkent() add the week shift when the nightly reset moves the story forward.
 */
const TODAY = '2026-10-17';

/** Whole weeks from TODAY to `to` in Tashkent: weekdays stay the same (no lessons on Sunday) */
export function weekShiftMs(to: Date): number {
  const tashkentToday = new Date(to.getTime() + 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const days = Math.round(
    (Date.parse(tashkentToday) - Date.parse(TODAY)) / DAY_MS,
  );
  return Math.max(0, Math.floor(days / 7)) * 7 * DAY_MS;
}

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
    data: { schoolName: 'Campusly School' },
  });

  const year = await prisma.academicYear.create({
    data: {
      name: '2026–27',
      startsAt: day('2026-09-02'),
      endsAt: day('2027-05-25'),
      isCurrent: true,
    },
  });

  // Uzbek school year: 4 quarters with holidays in between
  const quarterDates = [
    ['2026-09-02', '2026-10-31'],
    ['2026-11-09', '2026-12-27'],
    ['2027-01-11', '2027-03-20'],
    ['2027-03-30', '2027-05-25'],
  ];
  const quarters = [];
  for (const [i, [startsAt, endsAt]] of quarterDates.entries()) {
    quarters.push(
      await prisma.period.create({
        data: {
          academicYearId: year.id,
          kind: 'QUARTER',
          name: `Quarter ${i + 1}`,
          order: i + 1,
          startsAt: day(startsAt),
          endsAt: day(endsAt),
        },
      }),
    );
  }

  const subjects: Record<string, string> = {};
  for (const name of [
    'Algebra',
    'English',
    'Physics',
    'World History',
    'Korean',
  ]) {
    subjects[name] = (await prisma.subject.create({ data: { name } })).id;
  }

  const groups: Record<string, string> = {};
  for (const name of ['9A', '9B']) {
    groups[name] = (
      await prisma.group.create({ data: { academicYearId: year.id, name } })
    ).id;
  }

  return { yearId: year.id, quarters, subjects, groups };
}

// ──────────────────────────── 2. users ────────────────────────────

type TempPassword = 'ACTIVE_2_LEFT' | 'ACTIVE_1_LEFT' | 'EXPIRED';

interface StudentSeed {
  loginId: string;
  firstName: string;
  lastName: string;
  group: '9A' | '9B';
  status?: UserStatus;
  temp?: TempPassword;
}

// Names and IDs from the Stitch design (admin "Users: Students", teacher grading, parent dashboard)
const STUDENTS: StudentSeed[] = [
  { loginId: '26100042', firstName: 'Aziz', lastName: 'Karimov', group: '9A' },
  {
    loginId: '26100031',
    firstName: 'Azizbek',
    lastName: 'Aliyev',
    group: '9A',
  },
  {
    loginId: '26100032',
    firstName: 'Dilnoza',
    lastName: 'Karimova',
    group: '9A',
  },
  {
    loginId: '26100055',
    firstName: 'Madina',
    lastName: 'Aliyeva',
    group: '9A',
  },
  {
    loginId: '26100089',
    firstName: 'Jasur',
    lastName: 'Mirzayev',
    group: '9A',
  },
  { loginId: '26100104', firstName: 'Elena', lastName: 'Rostova', group: '9A' },
  {
    loginId: '26100118',
    firstName: 'Sardor',
    lastName: 'Bekmuratov',
    group: '9A',
  },
  {
    loginId: '26100012',
    firstName: 'Kamilla',
    lastName: 'Bakhromova',
    group: '9A',
  },
  {
    loginId: '26100067',
    firstName: 'Farrukh',
    lastName: 'Tursunov',
    group: '9A',
  },
  {
    loginId: '26100035',
    firstName: 'Nodirbek',
    lastName: 'Saidov',
    group: '9A',
  },
  {
    loginId: '26100043',
    firstName: 'Madina',
    lastName: 'Karimova',
    group: '9B',
  },
  {
    loginId: '26100033',
    firstName: 'Jasurbek',
    lastName: 'Tursunov',
    group: '9B',
    temp: 'ACTIVE_2_LEFT',
  },
  {
    loginId: '26100034',
    firstName: 'Madina',
    lastName: 'Yusupova',
    group: '9B',
  },
  {
    loginId: '26100036',
    firstName: 'Rayhona',
    lastName: 'Umarova',
    group: '9B',
  },
  {
    loginId: '26100037',
    firstName: 'Sarvar',
    lastName: 'Kadyrov',
    group: '9B',
    status: 'BLOCKED',
    temp: 'ACTIVE_1_LEFT',
  },
  {
    loginId: '26100038',
    firstName: 'Shakhzoda',
    lastName: 'Ibragimova',
    group: '9B',
    temp: 'EXPIRED',
  },
  {
    loginId: '26100039',
    firstName: 'Temur',
    lastName: 'Mahmudov',
    group: '9B',
  },
  {
    loginId: '26100040',
    firstName: 'Umida',
    lastName: 'Nazarova',
    group: '9B',
  },
  {
    loginId: '26100044',
    firstName: 'Bekzod',
    lastName: 'Rasulov',
    group: '9B',
  },
  {
    loginId: '26100045',
    firstName: 'Laylo',
    lastName: 'Ergasheva',
    group: '9B',
  },
];

// phone (9 digits after +998) → parent; children by student login ID
const PARENTS: {
  phone: string;
  firstName: string;
  lastName: string;
  relation: ParentRelation;
  children: string[];
}[] = [
  // One family, two parents, two children: shows ParentStudent is many-to-many in both directions
  {
    phone: '901112233',
    firstName: 'Farrukh',
    lastName: 'Karimov',
    relation: 'FATHER',
    children: ['26100042', '26100043'],
  },
  {
    phone: '901114455',
    firstName: 'Gulchehra',
    lastName: 'Karimova',
    relation: 'MOTHER',
    children: ['26100042', '26100043'],
  },
  {
    phone: '901234567',
    firstName: 'Sardor',
    lastName: 'Aliyev',
    relation: 'FATHER',
    children: ['26100031'],
  },
  {
    phone: '912345678',
    firstName: 'Rustam',
    lastName: 'Karimov',
    relation: 'FATHER',
    children: ['26100032'],
  },
  {
    phone: '933456789',
    firstName: 'Malika',
    lastName: 'Tursunova',
    relation: 'MOTHER',
    children: ['26100033'],
  },
  {
    phone: '974567890',
    firstName: 'Bekzod',
    lastName: 'Yusupov',
    relation: 'FATHER',
    children: ['26100034'],
  },
  {
    phone: '905678901',
    firstName: 'Olim',
    lastName: 'Saidov',
    relation: 'FATHER',
    children: ['26100035'],
  },
  {
    phone: '946789012',
    firstName: 'Shakhnoza',
    lastName: 'Umarova',
    relation: 'MOTHER',
    children: ['26100036'],
  },
  {
    phone: '997890123',
    firstName: 'Farrukh',
    lastName: 'Kadyrov',
    relation: 'FATHER',
    children: ['26100037'],
  },
  {
    phone: '918901234',
    firstName: 'Ravshan',
    lastName: 'Ibragimov',
    relation: 'FATHER',
    children: ['26100038'],
  },
  {
    phone: '939012345',
    firstName: 'Gulnora',
    lastName: 'Mahmudova',
    relation: 'MOTHER',
    children: ['26100039'],
  },
  {
    phone: '970123456',
    firstName: 'Sherzod',
    lastName: 'Nazarov',
    relation: 'FATHER',
    children: ['26100040'],
  },
  {
    phone: '903210055',
    firstName: 'Nodira',
    lastName: 'Aliyeva',
    relation: 'MOTHER',
    children: ['26100055'],
  },
  {
    phone: '903210089',
    firstName: 'Anvar',
    lastName: 'Mirzayev',
    relation: 'FATHER',
    children: ['26100089'],
  },
  {
    phone: '903210104',
    firstName: 'Irina',
    lastName: 'Rostova',
    relation: 'MOTHER',
    children: ['26100104'],
  },
  {
    phone: '903210118',
    firstName: 'Ulugbek',
    lastName: 'Bekmuratov',
    relation: 'FATHER',
    children: ['26100118'],
  },
  {
    phone: '903210012',
    firstName: 'Zarina',
    lastName: 'Bakhromova',
    relation: 'MOTHER',
    children: ['26100012'],
  },
  {
    phone: '903210067',
    firstName: 'Akmal',
    lastName: 'Tursunov',
    relation: 'FATHER',
    children: ['26100067'],
  },
  {
    phone: '903210044',
    firstName: 'Dilshod',
    lastName: 'Rasulov',
    relation: 'FATHER',
    children: ['26100044'],
  },
  {
    phone: '903210045',
    firstName: 'Feruza',
    lastName: 'Ergasheva',
    relation: 'GUARDIAN',
    children: ['26100045'],
  },
];

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

// DEMO_MODE=true (the public demo server): one showcase account per role opens from the landing
// page's "Demo login" (DECISIONS §12). Locally these stay normal accounts.
const SHOWCASE_ACCOUNTS = ['simon', '26200001', '26100042', '901112233'];
const isDemo = (loginId: string) => DEMO_ACCOUNTS.has(loginId);

async function seedUsers(groups: Record<string, string>) {
  // Hash once: bcrypt is slow on purpose, and every demo account shares the password
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      loginId: 'simon',
      role: 'ADMIN',
      passwordHash,
      isDemo: isDemo('simon'),
      firstName: 'Simon',
      lastName: '',
    },
  });

  const teacherSeeds = [
    {
      loginId: '26200001',
      firstName: 'Nilufar',
      lastName: 'Karimova',
      title: 'Mathematics',
    },
    {
      loginId: '26200002',
      firstName: 'John',
      lastName: 'Smith',
      title: 'English',
    },
    {
      loginId: '26200003',
      firstName: 'Bobur',
      lastName: 'Aliyev',
      title: 'Physics',
    },
  ];
  const teachers: Record<string, string> = {};
  for (const { title, ...t } of teacherSeeds) {
    const teacher = await prisma.user.create({
      data: {
        ...t,
        role: 'TEACHER',
        passwordHash,
        isDemo: isDemo(t.loginId),
        teacherProfile: { create: { title } },
      },
    });
    teachers[t.lastName] = teacher.id;
  }

  const students: Record<string, { id: string; group: '9A' | '9B' }> = {};
  for (const [i, s] of STUDENTS.entries()) {
    const student = await prisma.user.create({
      data: {
        loginId: s.loginId,
        role: 'STUDENT',
        status: s.status ?? 'ACTIVE',
        passwordHash,
        isDemo: isDemo(s.loginId),
        ...tempPasswordFields(s.temp),
        firstName: s.firstName,
        lastName: s.lastName,
        // Grade 9 in 2026–27: born in 2011, started school in 2018
        studentProfile: {
          create: {
            birthDate: day(
              `2011-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
            ),
            admissionYear: 2018,
          },
        },
        groupMemberships: { create: { groupId: groups[s.group] } },
      },
    });
    students[s.loginId] = { id: student.id, group: s.group };
  }

  for (const p of PARENTS) {
    await prisma.user.create({
      data: {
        loginId: p.phone, // parent login ID = last 9 digits of the phone
        role: 'PARENT',
        passwordHash,
        isDemo: isDemo(p.phone),
        firstName: p.firstName,
        lastName: p.lastName,
        parentProfile: { create: { phone: `+998${p.phone}` } },
        children: {
          create: p.children.map((loginId) => ({
            studentId: students[loginId].id,
            relation: p.relation,
            createdById: admin.id,
          })),
        },
      },
    });
  }

  // Next generated IDs continue after the seeded ones: 26100119 and 26200004
  const lastStudent = Math.max(
    ...STUDENTS.map((s) => Number(s.loginId.slice(3))),
  );
  await prisma.idCounter.createMany({
    data: [
      { year: 2026, roleCode: 1, lastValue: lastStudent },
      { year: 2026, roleCode: 2, lastValue: teacherSeeds.length },
    ],
  });

  return { adminId: admin.id, teachers, students };
}

// ─────────────────────── 3. courses and lessons ───────────────────────

// 8 weeks of quarter 1 (Mondays). Topics follow the Stitch design (Algebra 9A course page).
const WEEK_STARTS = [
  '2026-09-07',
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
  '2026-10-19',
  '2026-10-26',
];
const TOPICS: Record<string, string[]> = {
  Algebra: [
    'Linear Equations Review',
    'Quadratic Equations',
    'Factoring Trinomials',
    'Quadratic Roots',
    'Factoring Higher Degree Polynomials',
    'The Discriminant',
    'Rational Root Test',
    'Quarter 1 Review',
  ],
  English: [
    'Present Tenses',
    'Narrative Writing',
    'Animal Farm: Chapters 1–3',
    'Animal Farm: Chapters 4–6',
    'Essay Structure',
    'Essay on Orwell',
    'Debate Skills',
    'Quarter 1 Review',
  ],
  Physics: [
    'Units and Measurement',
    'Motion in a Straight Line',
    'Kinematic Equations',
    'Free Fall',
    'Lab Protocol 3: Pendulum',
    'Newton’s Laws',
    'Lab Protocol 4: Friction',
    'Quarter 1 Review',
  ],
};

interface SeededCourse {
  id: string;
  subject: string;
  group: '9A' | '9B';
  teacherId: string;
  studentIds: string[];
  categories: Record<'HOMEWORK' | 'QUIZ' | 'EXAM', string>;
  /** lesson ids per week (index 0 = week 1) */
  lessonsByWeek: string[][];
  /** module (week) ids, index 0 = week 1 */
  moduleIds: string[];
}

async function seedCourses(
  school: Awaited<ReturnType<typeof seedSchool>>,
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  const plan = [
    { subject: 'Algebra', group: '9A', teacher: 'Karimova' },
    { subject: 'Algebra', group: '9B', teacher: 'Karimova' },
    { subject: 'English', group: '9A', teacher: 'Smith' },
    { subject: 'Physics', group: '9A', teacher: 'Aliyev' },
  ] as const;

  const courses: SeededCourse[] = [];
  for (const p of plan) {
    // Whole-class course: every student of the class is enrolled automatically
    const studentIds = Object.values(users.students)
      .filter((s) => s.group === p.group)
      .map((s) => s.id);
    const teacherId = users.teachers[p.teacher];

    const course = await prisma.course.create({
      data: {
        academicYearId: school.yearId,
        groupId: school.groups[p.group],
        subjectId: school.subjects[p.subject],
        title: `${p.subject} · ${p.group}`,
        status: 'ACTIVE',
        teachers: { create: { teacherId, role: 'OWNER' } },
        enrollments: { create: studentIds.map((studentId) => ({ studentId })) },
      },
    });

    // School default weights: Homework 30 / Quizzes 30 / Exams 40
    const categories = {} as SeededCourse['categories'];
    for (const [order, [kind, name, weight]] of (
      [
        ['HOMEWORK', 'Homework', 30],
        ['QUIZ', 'Quizzes', 30],
        ['EXAM', 'Exams', 40],
      ] as const
    ).entries()) {
      categories[kind] = (
        await prisma.gradeCategory.create({
          data: { courseId: course.id, name, weight, order },
        })
      ).id;
    }

    const lessonsByWeek: string[][] = [];
    const moduleIds: string[] = [];
    for (const [w, startsAt] of WEEK_STARTS.entries()) {
      const topic = TOPICS[p.subject][w];
      // Weeks that have started (plus next week) are published; later ones are still drafts
      const isPublished = startsAt <= addDays(TODAY, 7);
      const publishedAt = isPublished
        ? tashkent(addDays(startsAt, -2), '18:00')
        : null;
      const module = await prisma.module.create({
        data: {
          courseId: course.id,
          title: `Week ${w + 1}: ${topic}`,
          order: w + 1,
          startsAt: day(startsAt),
          endsAt: day(addDays(startsAt, 4)),
          publishedAt,
          lessons: {
            create: [
              {
                title: topic,
                type: 'READING',
                body: `Notes for “${topic}”.`,
                completionType: 'VIEW',
                order: 1,
                publishedAt,
              },
              {
                title: `Practice: ${topic}`,
                type: 'READING',
                body: `Practice problems for “${topic}”.`,
                completionType: 'MANUAL',
                order: 2,
                publishedAt,
              },
            ],
          },
        },
        include: { lessons: { orderBy: { order: 'asc' } } },
      });
      lessonsByWeek.push(module.lessons.map((l) => l.id));
      moduleIds.push(module.id);

      // Progress only for lessons of weeks that are already over or running
      if (startsAt <= TODAY) {
        for (const lessonId of lessonsByWeek[w]) {
          for (const studentId of studentIds) {
            const r = random();
            if (r < 0.12) continue; // not opened yet
            const done = r > 0.3;
            await prisma.lessonProgress.create({
              data: {
                studentId,
                lessonId,
                status: done ? 'COMPLETED' : 'IN_PROGRESS',
                completedAt: done
                  ? tashkent(
                      addDays(startsAt, Math.floor(random() * 4)),
                      '19:30',
                    )
                  : null,
              },
            });
          }
        }
      }
    }

    courses.push({
      id: course.id,
      subject: p.subject,
      group: p.group,
      teacherId,
      studentIds,
      categories,
      lessonsByWeek,
      moduleIds,
    });
  }
  return courses;
}

// ─────────────────────── 4. assignments and grades ───────────────────────

const ALGEBRA_QUIZZES = [
  'Linear Equations',
  'Quadratic Equations',
  'Quadratic Roots',
  'Discriminant',
];
// Quiz n is written at the end of these weeks
const QUIZ_WEEKS = [2, 4, 5, 7];
/** Up to this date grades are already published; later ones are graded but still hidden */
const PUBLISHED_UNTIL = '2026-10-01';

/** Round to 0.5 points, between 0 and max */
const roundHalf = (n: number, max: number) =>
  Math.min(max, Math.max(0, Math.round(n * 2) / 2));

async function seedAssignments(
  courses: SeededCourse[],
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  // A stable "ability" per student, so the same student is strong in every assignment
  const ability: Record<string, number> = {};
  for (const s of Object.values(users.students))
    ability[s.id] = 0.62 + random() * 0.36;
  const aziz = users.students['26100042'].id;

  for (const course of courses) {
    const items: {
      type: 'HOMEWORK' | 'QUIZ' | 'EXAM';
      title: string;
      due: string;
      maxScore: number;
      week: number;
    }[] = [];
    // Homework n belongs to week n: same topic, due on that week's Saturday
    // (Algebra: "Homework 5: Factoring Higher Degree Polynomials", as in the design)
    for (let n = 1; n <= 8; n++) {
      const topic = TOPICS[course.subject][n - 1];
      items.push({
        type: 'HOMEWORK',
        title: `Homework ${n}: ${topic}`,
        due: addDays(WEEK_STARTS[n - 1], 5),
        maxScore: 10,
        week: n,
      });
    }
    for (let n = 1; n <= 4; n++) {
      const title =
        course.subject === 'Algebra'
          ? `Quiz ${n}: ${ALGEBRA_QUIZZES[n - 1]}`
          : `Quiz ${n}`;
      const week = QUIZ_WEEKS[n - 1];
      items.push({
        type: 'QUIZ',
        title,
        due: addDays(WEEK_STARTS[week - 1], 5),
        maxScore: 20,
        week,
      });
    }
    items.push({
      type: 'EXAM',
      title: 'Quarter 1 Exam',
      due: '2026-10-29',
      maxScore: 100,
      week: 8,
    });

    for (const item of items) {
      const dueAt = tashkent(item.due);
      const isPast = item.due < TODAY;
      const isPublished = item.due <= PUBLISHED_UNTIL;
      const assignment = await prisma.assignment.create({
        data: {
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
              : 'Upload your solution as a PDF or photo.',
          maxScore: item.maxScore,
          dueAt,
          allowLate: item.type === 'HOMEWORK',
          maxAttempts: item.type === 'HOMEWORK' ? 2 : 1,
          acceptedFileTypes: item.type === 'EXAM' ? [] : ['pdf', 'jpg', 'png'],
          tutorMode: item.type === 'HOMEWORK' ? 'HINTS' : 'OFF',
          publishedAt: tashkent(addDays(item.due, -6), '18:00'),
          gradesPublishedAt: isPublished
            ? tashkent(addDays(item.due, 3), '17:00')
            : null,
          createdById: course.teacherId,
        },
      });

      // Exams are offline; future and today's work has no grades yet
      if (item.type === 'EXAM' || item.due > TODAY) continue;

      for (const studentId of course.studentIds) {
        const isAzizHw5 =
          studentId === aziz &&
          item.title.startsWith('Homework 5') &&
          course.group === '9A';
        const r = random();
        if (r < 0.1 && !isAzizHw5) {
          // Did not submit: after publishing the teacher pressed "Give 0 to not submitted"
          if (isPublished) {
            await prisma.submission.create({
              data: {
                assignmentId: assignment.id,
                studentId,
                status: 'MISSING',
                score: 0,
                gradedById: course.teacherId,
                gradedAt: tashkent(addDays(item.due, 2), '16:00'),
              },
            });
          }
          continue;
        }

        const isLate = r > 0.92 && item.type === 'HOMEWORK';
        const submittedAt = isAzizHw5
          ? tashkent(item.due, '21:14')
          : isLate
            ? tashkent(addDays(item.due, 1), '10:20')
            : tashkent(addDays(item.due, -Math.floor(random() * 3)), '20:05');
        // Published items are fully graded; the next ones about 70% (the teacher is still grading)
        const isGraded = isPast && (isPublished || isAzizHw5 || random() < 0.7);
        const score = isAzizHw5
          ? 9
          : roundHalf(
              item.maxScore * (ability[studentId] + (random() - 0.5) * 0.2),
              item.maxScore,
            );

        await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
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
            attempts: {
              create: {
                number: 1,
                text: isAzizHw5 ? 'My solution is in the attached PDF.' : null,
                isLate,
                submittedAt,
              },
            },
            comments: isAzizHw5
              ? {
                  create: [
                    {
                      authorId: aziz,
                      body: 'I double-checked problem 6 using synthetic division as recommended in Wednesday’s lecture. Hope the grouping notation is clear!',
                      createdAt: submittedAt,
                    },
                    {
                      authorId: course.teacherId,
                      body: 'Watch sign distribution when factoring -(2x - 3). Remember (x² - 3) factors further over the reals into (x - √3)(x + √3).',
                      createdAt: tashkent(addDays(item.due, 2), '15:40'),
                    },
                  ],
                }
              : undefined,
          },
        });
      }
    }
  }
}

// ─────────────────── 5. attendance and announcements ───────────────────

/** Weekdays a subject is taught: 1 = Monday ... 5 = Friday */
const LESSON_DAYS: Record<string, number[]> = {
  Algebra: [1, 3, 5],
  English: [2, 4],
  Physics: [1, 4],
};
/** Aziz's two excused absences from the parent dashboard design */
const AZIZ_EXCUSED = ['2026-09-18', '2026-10-02'];

async function seedAttendance(
  courses: SeededCourse[],
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  const aziz = users.students['26100042'].id;

  for (const course of courses) {
    const dates: string[] = [];
    for (let d = '2026-09-07'; d < TODAY; d = addDays(d, 1)) {
      if (LESSON_DAYS[course.subject].includes(day(d).getUTCDay()))
        dates.push(d);
    }

    for (const [i, date] of dates.entries()) {
      const week = WEEK_STARTS.filter((w) => w <= date).length; // 1-based week of this date
      const session = await prisma.classSession.create({
        data: {
          courseId: course.id,
          date: day(date),
          lessonId: course.lessonsByWeek[week - 1][0],
          createdById: course.teacherId,
        },
      });

      // The last English lesson is left unmarked: it shows up in "Attendance to take"
      if (course.subject === 'English' && i === dates.length - 1) continue;

      await prisma.attendanceRecord.createMany({
        data: course.studentIds.map((studentId) => {
          const r = random();
          const status =
            studentId === aziz && AZIZ_EXCUSED.includes(date)
              ? 'EXCUSED'
              : studentId === aziz
                ? 'PRESENT'
                : r < 0.92
                  ? 'PRESENT'
                  : r < 0.95
                    ? 'LATE'
                    : r < 0.98
                      ? 'ABSENT'
                      : 'EXCUSED';
          return {
            sessionId: session.id,
            studentId,
            status,
            note: status === 'EXCUSED' ? 'Note from parent' : null,
            markedById: course.teacherId,
            markedAt: tashkent(date, '09:10'),
          };
        }),
      });
    }
  }
}

async function seedAnnouncements(
  courses: SeededCourse[],
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  const course = (title: string) =>
    courses.find((c) => `${c.subject} · ${c.group}` === title)!;
  const items = [
    {
      courseId: null,
      authorId: users.adminId,
      title: 'Quarter 1 ends on October 31',
      body: 'Quarter grades are published by November 4. The autumn break is November 1–8.',
      isPinned: true,
      eventDate: '2026-10-31',
      at: '2026-10-12',
    },
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
      courseId: course('Algebra · 9A').id,
      authorId: users.teachers.Karimova,
      title: 'Quiz 4: Discriminant on Saturday',
      body: 'Review weeks 5–6. Calculators are not allowed.',
      isPinned: false,
      eventDate: '2026-10-24',
      at: '2026-10-16',
    },
    {
      courseId: course('Algebra · 9B').id,
      authorId: users.teachers.Karimova,
      title: 'Homework 6 hints',
      body: 'Start with the discriminant before solving each equation.',
      isPinned: false,
      eventDate: null,
      at: '2026-10-14',
    },
    {
      courseId: course('English · 9A').id,
      authorId: users.teachers.Smith,
      title: 'Bring Animal Farm to class',
      body: 'We will discuss chapters 4–6 on Tuesday.',
      isPinned: false,
      eventDate: null,
      at: '2026-10-13',
    },
    {
      courseId: course('Physics · 9A').id,
      authorId: users.teachers.Aliyev,
      title: 'Lab Protocol 4 deadline extended',
      body: 'You can submit Lab Protocol 4 until Friday with full credit.',
      isPinned: false,
      eventDate: null,
      at: '2026-10-15',
    },
  ];

  const readers = [...Object.values(users.students).map((s) => s.id)];
  for (const a of items) {
    const publishedAt = tashkent(a.at, '12:00');
    const announcement = await prisma.announcement.create({
      data: {
        courseId: a.courseId,
        authorId: a.authorId,
        title: a.title,
        body: a.body,
        isPinned: a.isPinned,
        eventDate: a.eventDate ? day(a.eventDate) : null,
        publishedAt,
        createdAt: publishedAt,
      },
    });
    // About two thirds of the students have read it (read receipts on the teacher side)
    await prisma.announcementRead.createMany({
      data: readers
        .filter(() => random() < 0.66)
        .map((userId) => ({
          announcementId: announcement.id,
          userId,
          readAt: tashkent(addDays(a.at, 1), '08:30'),
        })),
    });
  }

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
      {
        userId: aziz,
        type: 'ASSIGNMENT_DUE',
        title: 'Homework 7: Rational Root Test is due on Saturday',
        link: '/student/todo',
        createdAt: tashkent('2026-10-17', '08:00'),
      },
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
  shiftMs = options.shiftTo ? weekShiftMs(options.shiftTo) : 0;
  randomState = 2026; // same "random" scores on every run, also in a long-running worker

  await reset();
  const school = await seedSchool();
  const users = await seedUsers(school.groups);
  const courses = await seedCourses(school, users);
  await seedAssignments(courses, users);
  await seedAttendance(courses, users);
  await seedAnnouncements(courses, users);
  return { shiftedWeeks: shiftMs / (7 * DAY_MS) };
}
