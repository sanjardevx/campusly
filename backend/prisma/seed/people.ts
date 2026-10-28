// Everyone in the demo school (DECISIONS §12 "School data and demo v2"). Every person is invented.
// The named accounts come from the Stitch design (Aziz Karimov 26100042, Nilufar Karimova …); the
// rest are generated with the seeded random, so every run gives the same school.
import type { ParentRelation, UserStatus } from '../../generated/prisma/enums';
import { SUBJECTS_BY_BAND, bandOf } from './curriculum';
import { pick, random } from './clock';

export const STUDENTS_PER_CLASS = 15;
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const CLASSES = GRADES.flatMap((g) => [`${g}A`, `${g}B`]);
export const gradeOf = (group: string) => Number(group.slice(0, -1));

// ───────────────────────────── names ─────────────────────────────

const BOYS = [
  'Aziz',
  'Bekzod',
  'Bobur',
  'Doniyor',
  'Elyor',
  'Farrukh',
  'Islom',
  'Jahongir',
  'Javohir',
  'Jasur',
  'Kamron',
  'Mirjalol',
  'Muhammadali',
  'Nodirbek',
  'Otabek',
  'Ozodbek',
  'Rustam',
  'Sardor',
  'Sanjar',
  'Shahzod',
  'Sherzod',
  'Temur',
  'Ulugbek',
  'Umid',
  'Yusuf',
  'Zafar',
  'Akmal',
  'Abdulloh',
  'Diyorbek',
  'Asilbek',
  'Behruz',
  'Firdavs',
  'Ibrohim',
  'Lazizbek',
  'Murod',
  'Nurislom',
  'Qobil',
  'Samandar',
  'Tohir',
  'Xurshid',
];
const GIRLS = [
  'Dilnoza',
  'Madina',
  'Kamilla',
  'Laylo',
  'Malika',
  'Rayhona',
  'Sevara',
  'Shahzoda',
  'Umida',
  'Zarina',
  'Nilufar',
  'Nodira',
  'Gulnora',
  'Feruza',
  'Mohira',
  'Sitora',
  'Zilola',
  'Muslima',
  'Oysha',
  'Robiya',
  'Sabina',
  'Shahnoza',
  'Yulduz',
  'Durdona',
  'Charos',
  'Diyora',
  'Gulchehra',
  'Komila',
  'Mubina',
  'Nargiza',
  'Nozima',
  'Ozoda',
  'Parizoda',
  'Sarvinoz',
  'Shirin',
  'Iroda',
  'Marjona',
  'Ruxshona',
  'Asal',
  'Hilola',
];
/** Male form; the female form adds "a" (Karimov → Karimova) */
const SURNAMES = [
  'Karimov',
  'Aliyev',
  'Tursunov',
  'Yusupov',
  'Saidov',
  'Umarov',
  'Kadyrov',
  'Ibragimov',
  'Mahmudov',
  'Nazarov',
  'Rasulov',
  'Ergashev',
  'Mirzayev',
  'Rahimov',
  'Sobirov',
  'Xolmatov',
  'Abdullayev',
  'Raximov',
  'Qodirov',
  'Usmonov',
  'Hasanov',
  'Jurayev',
  'Normatov',
  'Ismoilov',
  'Tojiboyev',
  'Valiyev',
  'Sharipov',
  'Fayzullayev',
  'Azimov',
  'Murodov',
  'Nurmatov',
  'Olimov',
  'Po‘latov',
  'Salimov',
  'To‘xtayev',
  'Zokirov',
  'Bakirov',
  'Davletov',
  'G‘aniyev',
  'Habibullayev',
];
const female = (surname: string) => `${surname}a`;

// ───────────────────── named accounts (Stitch design) ─────────────────────

export type TempPassword = 'ACTIVE_2_LEFT' | 'ACTIVE_1_LEFT' | 'EXPIRED';

export interface StudentSeed {
  loginId: string;
  firstName: string;
  lastName: string;
  group: string;
  status?: UserStatus;
  temp?: TempPassword;
}

/**
 * Names and IDs from the Stitch design (admin "Users: Students", teacher grading, parent dashboard).
 * Madina Karimova, Aziz's sister, is the demo student of 11A.
 */
const NAMED_STUDENTS: StudentSeed[] = [
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
    group: '11A',
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

export interface ParentSeed {
  phone: string;
  firstName: string;
  lastName: string;
  relation: ParentRelation;
  /** Student login IDs */
  children: string[];
}

const NAMED_PARENTS: ParentSeed[] = [
  // One family, two parents, two children (9A and 11A): ParentStudent is many-to-many both ways
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

// ───────────────────────────── students and parents ─────────────────────────────

/** Families with two children in the school: their parent account links both (DECISIONS §12) */
const SIBLING_FAMILIES = 70;

/**
 * 15 students in each of the 22 classes: the named ones first, then generated names. Login IDs
 * continue the 2026 student series (26100001 …), skipping the named IDs. Families: one parent
 * account each (the named family has two), 70 of them with two children in different classes.
 */
export function generateStudentsAndParents() {
  const taken = new Set(NAMED_STUDENTS.map((s) => Number(s.loginId.slice(3))));
  let next = 1;
  const nextId = () => {
    while (taken.has(next)) next++;
    taken.add(next);
    return `261${String(next).padStart(5, '0')}`;
  };

  // The generated slots, class by class; their names come with the family below
  const slots: { loginId: string; group: string; girl: boolean }[] = [];
  for (const group of CLASSES) {
    const named = NAMED_STUDENTS.filter((s) => s.group === group).length;
    for (let i = named; i < STUDENTS_PER_CLASS; i++) {
      slots.push({ loginId: nextId(), group, girl: random() < 0.5 });
    }
  }

  // Pair slots of different classes into sibling families (seeded shuffle, then pairs)
  const order = slots
    .map((s, i) => ({ s, k: random(), i }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.s);
  const families: (typeof slots)[] = [];
  const pool = [...order];
  for (let f = 0; f < SIBLING_FAMILIES && pool.length > 1; f++) {
    const first = pool.shift()!;
    const at = pool.findIndex((x) => x.group !== first.group);
    const [second] = pool.splice(at, 1);
    families.push([first, second]);
  }
  for (const single of pool) families.push([single]);

  const usedPhones = new Set(NAMED_PARENTS.map((p) => p.phone));
  const phone = () => {
    for (;;) {
      const p = `${pick(['90', '91', '93', '94', '95', '97', '99', '33', '88'])}${String(Math.floor(random() * 1e7)).padStart(7, '0')}`;
      if (!usedPhones.has(p)) {
        usedPhones.add(p);
        return p;
      }
    }
  };

  const students: StudentSeed[] = [...NAMED_STUDENTS];
  const parents: ParentSeed[] = [...NAMED_PARENTS];
  // No two students of one class share a full name (the teacher could not tell them apart)
  const inClass = new Set(
    students.map((s) => `${s.group} ${s.firstName} ${s.lastName}`),
  );
  for (const children of families) {
    const surname = pick(SURNAMES);
    for (const c of children) {
      const lastName = c.girl ? female(surname) : surname;
      let firstName = pick(c.girl ? GIRLS : BOYS);
      while (inClass.has(`${c.group} ${firstName} ${lastName}`)) {
        firstName = pick(c.girl ? GIRLS : BOYS);
      }
      inClass.add(`${c.group} ${firstName} ${lastName}`);
      students.push({
        loginId: c.loginId,
        firstName,
        lastName,
        group: c.group,
      });
    }
    const mother = random() < 0.55;
    parents.push({
      phone: phone(),
      firstName: pick(mother ? GIRLS : BOYS),
      lastName: mother ? female(surname) : surname,
      relation: mother ? 'MOTHER' : 'FATHER',
      children: children.map((c) => c.loginId),
    });
  }
  return { students, parents, lastStudentNumber: Math.max(...[...taken]) };
}

// ───────────────────────────── teachers ─────────────────────────────

export interface TeacherSeed {
  loginId: string;
  firstName: string;
  lastName: string;
  title: string;
  /** Courses as "Subject · Class" */
  courses: string[];
}

/** Teacher names (the first ones also appear in "Our team" on the public site) */
const TEACHER_NAMES: [string, string][] = [
  ['Nilufar', 'Karimova'],
  ['John', 'Smith'],
  ['Bobur', 'Aliyev'],
  ['Ji-yeon', 'Park'],
  ['Bekzod', 'Rashidov'],
  ['Malika', 'Yusupova'],
  ['Gulnora', 'Abdullayeva'],
  ['Dilfuza', 'Sobirova'],
  ['Mavluda', 'Xolmatova'],
  ['Shoira', 'Qodirova'],
  ['Nargiza', 'Usmonova'],
  ['Zulfiya', 'Hasanova'],
  ['Saodat', 'Jurayeva'],
  ['Feruza', 'Normatova'],
  ['Emma', 'Brown'],
  ['Alisher', 'Ismoilov'],
  ['Rustam', 'Tojiboyev'],
  ['Lola', 'Valiyeva'],
  ['Sherzod', 'Sharipov'],
  ['Kamola', 'Fayzullayeva'],
  ['Botir', 'Azimov'],
  ['Dilnoza', 'Murodova'],
  ['Akbar', 'Nurmatov'],
  ['Malohat', 'Olimova'],
  ['Oybek', 'Salimov'],
  ['Hye-jin', 'Kim'],
  ['Anvar', 'Zokirov'],
  ['Nodira', 'Bakirova'],
  ['Timur', 'Davletov'],
  ['Shahnoza', 'G‘aniyeva'],
];

/**
 * ~30 teachers with realistic loads. Grades 1–4: one class teacher per class (mother tongue, maths,
 * natural science) plus one teacher each for English, art and PE. Grades 5–11: subject teachers,
 * each taking a run of classes. Nilufar Karimova (the demo teacher) teaches algebra and geometry
 * in 9A and 11A only; Smith, Aliyev and Park keep their 9A courses from the design.
 */
export function generateTeachers(): TeacherSeed[] {
  const names = [...TEACHER_NAMES];
  const take = (first?: string) => {
    const at = first ? names.findIndex(([f]) => f === first) : 0;
    if (at < 0) throw new Error(`Teacher ${first} is already taken`);
    return names.splice(at, 1)[0];
  };
  const teachers: TeacherSeed[] = [];
  const add = (name: [string, string], title: string, courses: string[]) =>
    teachers.push({
      loginId: '',
      firstName: name[0],
      lastName: name[1],
      title,
      courses,
    });

  const primary = CLASSES.filter((c) => bandOf(gradeOf(c)) === 'PRIMARY');
  const upper = CLASSES.filter((c) => bandOf(gradeOf(c)) !== 'PRIMARY');
  const teaches = (subject: string, group: string) =>
    SUBJECTS_BY_BAND[bandOf(gradeOf(group))].includes(subject);
  const runs = <T>(list: T[], n: number) =>
    Array.from({ length: n }, (_, i) =>
      list.slice(
        Math.round((i * list.length) / n),
        Math.round(((i + 1) * list.length) / n),
      ),
    );

  // The four named teachers keep their login IDs 26200001 … (the demo teacher first)
  const karimova = take('Nilufar');
  add(
    karimova,
    'Mathematics',
    ['9A', '11A'].flatMap((g) => [`Algebra · ${g}`, `Geometry · ${g}`]),
  );
  const smith = take('John');
  const aliyev = take('Bobur');
  const park = take('Ji-yeon');
  const rashidov = take('Bekzod');
  const yusupova = take('Malika');
  // A native speaker teaches English in grades 1–4
  const brown = take('Emma');

  // Subject teachers of grades 5–11 take runs of classes. The named ones (Smith, Aliyev, Park)
  // keep the run with 9A and are added before everyone else, so they get 26200002 … 26200004.
  const later: (() => void)[] = [];
  const subjectTeachers = (
    subject: string,
    names: ([string, string] | null)[],
  ) => {
    const chunks = runs(
      upper.filter((g) => teaches(subject, g)),
      names.length,
    ).sort((a, b) => Number(b.includes('9A')) - Number(a.includes('9A')));
    chunks.forEach((chunk, i) => {
      const courses = chunk.map((g) => `${subject} · ${g}`);
      const name = names[i];
      if (i === 0 && name) add(name, subject, courses);
      else later.push(() => add(name ?? take(), subject, courses));
    });
  };
  subjectTeachers('English', [smith, null]);
  subjectTeachers('Physics', [aliyev, null]);
  subjectTeachers('Korean', [park, take('Hye-jin')]);
  later.splice(0).forEach((addTeacher) => addTeacher());
  // Algebra and geometry of the other 12 classes: three teachers, four classes each, both subjects
  const mathClasses = upper.filter((g) => g !== '9A' && g !== '11A');
  for (const chunk of runs(mathClasses, 3))
    add(
      take(),
      'Mathematics',
      chunk.flatMap((g) => [`Algebra · ${g}`, `Geometry · ${g}`]),
    );
  subjectTeachers('Chemistry', [null, null]);
  subjectTeachers('Biology', [null, null]);
  subjectTeachers('History', [null, null]);
  subjectTeachers('Geography', [null]);
  subjectTeachers('Informatics', [null, null]);
  later.splice(0).forEach((addTeacher) => addTeacher());

  // Grades 1–4
  for (const g of primary)
    add(take(), 'Primary school', [
      `Mother Tongue · ${g}`,
      `Mathematics · ${g}`,
      `Natural Science · ${g}`,
    ]);
  add(
    brown,
    'English',
    primary.map((g) => `English · ${g}`),
  );
  add(
    yusupova,
    'Art',
    primary.map((g) => `Art · ${g}`),
  );
  add(
    rashidov,
    'Physical Education',
    primary.map((g) => `Physical Education · ${g}`),
  );

  teachers.forEach(
    (t, i) => (t.loginId = `262${String(i + 1).padStart(5, '0')}`),
  );
  return teachers;
}
