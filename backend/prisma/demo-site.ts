// Demo content of the public website (day 19): News & Events, Programs & clubs, Our team;
// day 20: Mock tests, Open Courses (real YouTube videos), Honor Students (seeded students).
// Text the visitor reads is in four languages (DECISIONS §14); names, rooms and times are not.
// Pictures are the Stitch placeholders under frontend/public/site until the school uploads its own.
import type { PrismaClient } from '../generated/prisma/client';

type Text = { en: string; uz: string; ru: string; ko: string };
const t = (en: string, uz: string, ru: string, ko: string): Text => ({
  en,
  uz,
  ru,
  ko,
});

export interface SiteSeedHelpers {
  adminId: string;
  /** Calendar date moved by the demo week shift */
  day: (iso: string) => Date;
  /** Tashkent moment moved by the demo week shift */
  tashkent: (iso: string, time?: string) => Date;
  /** Seeded students by login ID (honor students point at real profiles) */
  students: Record<string, { id: string; group: string }>;
}

/** The website part of the school settings (footer, numbers strip) */
export const SITE_SETTINGS = {
  contactPhone: '+998 93 890 03 26, +82 10 4393 0340',
  officeHours: 'Mon–Fri · 08:30–17:30',
  siteAddress: '12 Academic Street, Chilanzar, Tashkent',
  siteMetro: 'Nearest metro: Chilanzar, 5 min walk',
  siteEmail: 'campusly.aws@gmail.com',
  foundedYear: 2014,
};

export interface ProgramSeed {
  category: 'LANGUAGE' | 'SPORTS' | 'IT' | 'ARTS' | 'READING' | 'OTHER';
  /** A picture under frontend/public/site (placeholders until the school uploads its own) */
  photo: string;
  name: Text;
  grades: [number, number];
  levelNote: Text;
  days: string[];
  time: [string, string];
  description: Text;
  room?: string;
  teachers?: string[];
  showOnSite?: boolean;
}

/** One SiteProgram row; `teamIds` maps "Our team" last names to their ids */
export const programData = (
  p: ProgramSeed,
  order: number,
  teamIds: Map<string, string>,
  updatedById: string | null,
) => ({
  order,
  category: p.category,
  name: p.name,
  gradeFrom: p.grades[0],
  gradeTo: p.grades[1],
  levelNote: p.levelNote,
  days: p.days,
  startTime: p.time[0],
  endTime: p.time[1],
  room: p.room ?? null,
  teacherIds: (p.teachers ?? []).flatMap((name) => teamIds.get(name) ?? []),
  description: p.description,
  photoPath: `/site/${p.photo}.jpg`,
  showOnSite: p.showOnSite ?? true,
  updatedById,
});

/**
 * Programs & clubs, in their site order (the home page shows the first 6 that are on the site).
 * IELTS, SAT, TOPIK, IT and sport lead (DECISIONS §12): they are site programs, not portal courses.
 * `teachers` are "Our team" last names. Also read by prisma/add-programs.ts, which adds the
 * missing ones to a database that is never seeded again (prod).
 */
export const SITE_PROGRAMS: ProgramSeed[] = [
  {
    category: 'LANGUAGE',
    photo: 'news-ielts',
    name: t(
      'IELTS Preparation',
      'IELTSga tayyorlov',
      'Подготовка к IELTS',
      'IELTS 대비',
    ),
    grades: [9, 11],
    levelNote: t(
      'Band 5.5 → 7.0+',
      'Ball 5.5 → 7.0+',
      'Балл 5.5 → 7.0+',
      '밴드 5.5 → 7.0+',
    ),
    days: ['TUE', 'THU'],
    time: ['16:00', '17:30'],
    description: t(
      'All four skills, timed practice tests and mock speaking interviews.',
      'To‘rt ko‘nikma, vaqtli sinov testlari va og‘zaki nutq sinov suhbatlari.',
      'Все четыре навыка, тесты на время и пробные устные собеседования.',
      '4개 영역, 시간 제한 모의고사, 스피킹 모의 인터뷰.',
    ),
    room: 'Room 115',
    teachers: ['Smith', 'Rahimov'],
  },
  {
    category: 'OTHER',
    photo: 'news-olympiad',
    name: t(
      'SAT Preparation',
      'SATga tayyorlov',
      'Подготовка к SAT',
      'SAT 대비',
    ),
    grades: [10, 11],
    levelNote: t(
      'Math, Reading & Writing',
      'Matematika, o‘qish va yozish',
      'Математика, чтение и письмо',
      '수학, 읽기·쓰기',
    ),
    days: ['MON', 'WED'],
    time: ['16:00', '17:30'],
    description: t(
      'Digital SAT strategy, weekly practice sections and score reviews.',
      'Digital SAT strategiyasi, haftalik mashq bo‘limlari va natijalar tahlili.',
      'Стратегия Digital SAT, еженедельные практические секции и разбор баллов.',
      '디지털 SAT 전략, 주간 실전 섹션, 점수 분석.',
    ),
    room: 'Room 301',
    teachers: ['Rahimov'],
  },
  {
    category: 'LANGUAGE',
    photo: 'program-korean',
    name: t(
      'Korean Language (TOPIK prep)',
      'Koreys tili (TOPIKga tayyorlov)',
      'Корейский язык (подготовка к TOPIK)',
      '한국어 (TOPIK 대비)',
    ),
    grades: [7, 11],
    levelNote: t(
      'Beginner → TOPIK II',
      'Boshlang‘ich → TOPIK II',
      'С нуля → TOPIK II',
      '초급 → TOPIK II',
    ),
    days: ['MON', 'THU'],
    time: ['15:30', '17:00'],
    description: t(
      'Speaking, reading and TOPIK practice in small groups.',
      'Kichik guruhlarda nutq, o‘qish va TOPIK mashqlari.',
      'Разговор, чтение и практика TOPIK в малых группах.',
      '소그룹으로 진행하는 말하기, 읽기, TOPIK 연습.',
    ),
    room: 'Room 204',
    teachers: ['Park'],
  },
  {
    category: 'IT',
    photo: 'program-it',
    name: t(
      'IT & Coding Club',
      'IT va dasturlash to‘garagi',
      'Клуб IT и программирования',
      'IT·코딩 클럽',
    ),
    grades: [6, 11],
    levelNote: t(
      'Python, Web & Robotics',
      'Python, veb va robototexnika',
      'Python, веб и робототехника',
      '파이썬, 웹, 로보틱스',
    ),
    days: ['WED', 'SAT'],
    time: ['14:30', '16:30'],
    description: t(
      'Hands-on microcontrollers, software design and hackathons.',
      'Mikrokontrollerlar bilan amaliyot, dastur loyihalash va xakatonlar.',
      'Практика с микроконтроллерами, проектирование программ и хакатоны.',
      '마이크로컨트롤러 실습, 소프트웨어 설계, 해커톤.',
    ),
    room: 'IT lab',
  },
  {
    category: 'SPORTS',
    photo: 'program-taekwondo',
    name: t(
      'Taekwondo Club',
      'Taekvondo to‘garagi',
      'Секция тхэквондо',
      '태권도 클럽',
    ),
    grades: [1, 8],
    levelNote: t(
      'All belt divisions',
      'Barcha kamar darajalari',
      'Все пояса',
      '모든 띠 등급',
    ),
    days: ['MON', 'WED', 'FRI'],
    time: ['16:00', '17:30'],
    description: t(
      'Olympic sparring, discipline drills and certified belt grading.',
      'Olimpiya sparringi, intizom mashqlari va rasmiy kamar attestatsiyasi.',
      'Олимпийский спарринг, дисциплина и официальная аттестация на пояса.',
      '올림픽 겨루기, 규율 훈련, 공인 승급 심사.',
    ),
    room: 'Sports hall',
    teachers: ['Rashidov'],
  },
  {
    category: 'LANGUAGE',
    photo: 'program-english',
    name: t(
      'English with native teachers',
      'Ona tilida so‘zlashuvchi ustozlar bilan ingliz tili',
      'Английский с носителями языка',
      '원어민 교사와 함께하는 영어',
    ),
    grades: [5, 11],
    levelNote: t(
      'Intermediate → Fluent (IELTS)',
      'O‘rta → Erkin (IELTS)',
      'Средний → свободный (IELTS)',
      '중급 → 유창함 (IELTS)',
    ),
    days: ['TUE', 'FRI'],
    time: ['15:30', '17:00'],
    description: t(
      'Debate club, academic writing and spoken fluency workshops.',
      'Munozara klubi, akademik yozuv va og‘zaki nutq mashg‘ulotlari.',
      'Дебатный клуб, академическое письмо и практика устной речи.',
      '토론 클럽, 학술 글쓰기, 말하기 유창성 워크숍.',
    ),
    room: 'Room 112',
    teachers: ['Smith'],
  },
  {
    category: 'ARTS',
    photo: 'program-art',
    name: t(
      'Art Studio',
      'San’at studiyasi',
      'Художественная студия',
      '미술 스튜디오',
    ),
    grades: [1, 7],
    levelNote: t(
      'Drawing & watercolour',
      'Rasm va akvarel',
      'Рисунок и акварель',
      '드로잉·수채화',
    ),
    days: ['TUE', 'THU'],
    time: ['15:00', '16:30'],
    description: t(
      'Academic drawing, watercolour techniques and a yearly exhibition.',
      'Akademik rasm, akvarel texnikasi va yillik ko‘rgazma.',
      'Академический рисунок, техники акварели и ежегодная выставка.',
      '아카데믹 드로잉, 수채화 기법, 연례 전시회.',
    ),
    room: 'Art studio',
    teachers: ['Yusupova'],
  },
  {
    category: 'READING',
    photo: 'program-reading',
    name: t(
      'Reading Club',
      'Kitobxonlar klubi',
      'Читательский клуб',
      '독서 클럽',
    ),
    grades: [1, 5],
    levelNote: t(
      'Literature & comprehension',
      'Adabiyot va matnni tushunish',
      'Литература и понимание текста',
      '문학과 독해',
    ),
    days: ['MON', 'FRI'],
    time: ['14:00', '15:30'],
    description: t(
      'Reading circles, book talks and storytelling games.',
      'Kitob o‘qish davralari, kitob muhokamalari va hikoya o‘yinlari.',
      'Читательские кружки, обсуждение книг и игры в истории.',
      '독서 모임, 책 이야기, 스토리텔링 게임.',
    ),
    room: 'Library',
  },
  {
    category: 'SPORTS',
    photo: 'program-chess',
    name: t('Chess Club', 'Shaxmat to‘garagi', 'Шахматный клуб', '체스 클럽'),
    grades: [5, 11],
    levelNote: t(
      'From first moves to tournaments',
      'Birinchi yurishlardan turnirlargacha',
      'От первых ходов до турниров',
      '첫수부터 대회까지',
    ),
    days: ['TUE', 'THU'],
    time: ['15:30', '17:00'],
    description: t(
      'Openings, tactics and school tournaments every term.',
      'Debyutlar, taktika va har chorakda maktab turnirlari.',
      'Дебюты, тактика и школьные турниры каждую четверть.',
      '오프닝, 전술, 매 학기 교내 대회.',
    ),
    showOnSite: false,
  },
  {
    category: 'SPORTS',
    photo: 'program-football',
    name: t(
      'Football Club',
      'Futbol to‘garagi',
      'Футбольная секция',
      '축구 클럽',
    ),
    grades: [7, 11],
    levelNote: t(
      'Boys and girls teams',
      'O‘g‘il va qiz bolalar jamoalari',
      'Команды мальчиков и девочек',
      '남녀 팀',
    ),
    days: ['WED', 'FRI'],
    time: ['16:00', '17:30'],
    description: t(
      'Training twice a week and the city school league.',
      'Haftada ikki marta mashg‘ulot va shahar maktablar ligasi.',
      'Тренировки дважды в неделю и городская школьная лига.',
      '주 2회 훈련과 시 학교 리그.',
    ),
    showOnSite: false,
  },
];

export async function seedSite(prisma: PrismaClient, h: SiteSeedHelpers) {
  // ───────────── Our team (first: programs and mock tests name their teachers) ─────────────
  const person = async (
    order: number,
    firstName: string,
    lastName: string,
    photo: string,
    role: Text,
    note: Text | null,
    extra: { isDirector?: boolean; showOnSite?: boolean } = {},
  ) =>
    (
      await prisma.sitePerson.create({
        data: {
          firstName,
          lastName,
          role,
          note: note ?? undefined,
          photoPath: `/site/${photo}.jpg`,
          order,
          isDirector: extra.isDirector ?? false,
          showOnSite: extra.showOnSite ?? true,
        },
      })
    ).id;

  await person(
    0,
    'Dr. Alisher',
    'Vakhidov',
    'person-vakhidov',
    t('School Director', 'Maktab direktori', 'Директор школы', '교장'),
    t(
      'We want every child to feel seen, challenged and safe — that is what a good school does.',
      'Biz har bir bola o‘zini ko‘rilgan, sinovdan o‘tayotgan va xavfsiz his qilishini istaymiz — yaxshi maktab aynan shuni qiladi.',
      'Мы хотим, чтобы каждый ребёнок чувствовал, что его видят, ставят перед ним задачи и берегут, — именно это делает хорошая школа.',
      '우리는 모든 아이가 존중받고, 도전하며, 안전하다고 느끼기를 바랍니다. 그것이 좋은 학교가 하는 일입니다.',
    ),
    { isDirector: true },
  );
  await person(
    1,
    'Nodirbek',
    'Salimov',
    'person-salimov',
    t('CEO', 'Bosh ijrochi direktor', 'Генеральный директор', '최고경영자'),
    null,
  );
  await person(
    2,
    'Nilufar',
    'Karimova',
    'person-karimova',
    t(
      'Mathematics teacher',
      'Matematika o‘qituvchisi',
      'Учитель математики',
      '수학 교사',
    ),
    t(
      '12 years of teaching',
      '12 yillik pedagogik tajriba',
      '12 лет преподавания',
      '교직 경력 12년',
    ),
  );
  await person(
    3,
    'John',
    'Smith',
    'person-smith',
    t(
      'English teacher',
      'Ingliz tili o‘qituvchisi',
      'Учитель английского языка',
      '영어 교사',
    ),
    t(
      'CELTA, 9 years in Tashkent',
      'CELTA, Toshkentda 9 yil',
      'CELTA, 9 лет в Ташкенте',
      'CELTA 자격, 타슈켄트 9년 경력',
    ),
  );
  const park = await person(
    4,
    'Ji-yeon',
    'Park',
    'person-park',
    t(
      'Korean teacher',
      'Koreys tili o‘qituvchisi',
      'Учитель корейского языка',
      '한국어 교사',
    ),
    t(
      'TOPIK examiner',
      'TOPIK imtihonchisi',
      'Экзаменатор TOPIK',
      'TOPIK 시험관',
    ),
  );
  await person(
    5,
    'Bekzod',
    'Rashidov',
    'person-rashidov',
    t(
      'Taekwondo coach',
      'Taekvondo murabbiyi',
      'Тренер по тхэквондо',
      '태권도 코치',
    ),
    t(
      '4th Dan black belt',
      '4-dan qora kamar',
      'Чёрный пояс, 4-й дан',
      '검은 띠 4단',
    ),
  );
  await person(
    6,
    'Malika',
    'Yusupova',
    'person-yusupova',
    t(
      'Art teacher',
      'Tasviriy san’at o‘qituvchisi',
      'Учитель изобразительного искусства',
      '미술 교사',
    ),
    null,
  );
  const rahimov = await person(
    7,
    'Jasur',
    'Rahimov',
    'person-rahimov',
    t(
      'Test coordinator',
      'Test koordinatori',
      'Координатор тестирования',
      '시험 코디네이터',
    ),
    t(
      'IELTS and SAT mock tests',
      'IELTS va SAT sinov imtihonlari',
      'Пробные экзамены IELTS и SAT',
      'IELTS·SAT 모의시험 담당',
    ),
  );

  // ───────────── Programs & clubs ─────────────
  const team = await prisma.sitePerson.findMany({
    select: { id: true, lastName: true },
  });
  const teamIds = new Map(team.map((m) => [m.lastName, m.id]));
  await prisma.siteProgram.createMany({
    data: SITE_PROGRAMS.map((p, i) =>
      programData(p, i + 1, teamIds, h.adminId),
    ),
  });

  // ───────────── News & Events ─────────────
  const post = (data: {
    type: 'NEWS' | 'EVENT';
    cover: string;
    title: Text;
    summary: Text;
    body?: Text;
    eventDate?: string;
    time?: [string, string];
    place?: Text;
    carouselOrder?: number;
    status: 'DRAFT' | 'PUBLISHED';
    publishedAt?: Date;
  }) =>
    prisma.sitePost.create({
      data: {
        type: data.type,
        title: data.title,
        summary: data.summary,
        body: data.body,
        coverPath: `/site/${data.cover}.jpg`,
        eventDate: data.eventDate ? h.day(data.eventDate) : null,
        startTime: data.time?.[0] ?? null,
        endTime: data.time?.[1] ?? null,
        place: data.place,
        carouselOrder: data.carouselOrder ?? null,
        status: data.status,
        publishedAt: data.publishedAt ?? null,
        createdById: h.adminId,
        updatedById: h.adminId,
      },
    });

  const mainHall = t(
    'Main Hall, Campusly School',
    'Campusly maktabi, katta zal',
    'Актовый зал, Campusly School',
    'Campusly School 대강당',
  );
  await post({
    type: 'EVENT',
    cover: 'news-open-day',
    title: t(
      'Open Day for Parents & Prospective Students',
      'Ota-onalar va bo‘lajak o‘quvchilar uchun ochiq eshiklar kuni',
      'День открытых дверей для родителей и будущих учеников',
      '학부모와 예비 학생을 위한 학교 공개의 날',
    ),
    summary: t(
      'Meet our teachers, visit classrooms and labs, and ask the admissions team anything.',
      'Ustozlarimiz bilan tanishing, sinf va laboratoriyalarni ko‘ring, qabul bo‘limiga istalgan savolni bering.',
      'Познакомьтесь с учителями, посетите классы и лаборатории и задайте любые вопросы приёмной комиссии.',
      '선생님들을 만나고, 교실과 실험실을 둘러보고, 입학 담당자에게 무엇이든 물어보세요.',
    ),
    body: t(
      'We invite families to visit Campusly School. Meet our teachers, see the classrooms, science labs and library, and learn how our English and Korean programs work.\n\nGuided tours start every 30 minutes. At 12:00 the admissions team will answer questions in the Main Hall.',
      'Oilalarni Campusly maktabiga taklif qilamiz. Ustozlarimiz bilan tanishing, sinflar, ilmiy laboratoriyalar va kutubxonani ko‘ring, ingliz va koreys tili dasturlarimiz qanday ishlashini bilib oling.\n\nEkskursiyalar har 30 daqiqada boshlanadi. Soat 12:00 da qabul bo‘limi katta zalda savollarga javob beradi.',
      'Приглашаем семьи в Campusly School. Познакомьтесь с учителями, посмотрите классы, научные лаборатории и библиотеку, узнайте, как устроены наши программы английского и корейского языков.\n\nЭкскурсии начинаются каждые 30 минут. В 12:00 приёмная комиссия ответит на вопросы в актовом зале.',
      'Campusly School에 가족 여러분을 초대합니다. 선생님들을 만나고 교실, 과학 실험실, 도서관을 둘러보며 영어·한국어 프로그램이 어떻게 운영되는지 알아보세요.\n\n학교 투어는 30분마다 시작됩니다. 12시에는 입학 담당자가 대강당에서 질문에 답해 드립니다.',
    ),
    eventDate: '2026-10-24',
    time: ['10:00', '13:00'],
    place: mainHall,
    carouselOrder: 1,
    status: 'PUBLISHED',
    publishedAt: h.tashkent('2026-10-10', '09:00'),
  });
  await post({
    type: 'EVENT',
    cover: 'news-olympiad',
    title: t(
      'Inter-school Math Olympiad',
      'Maktablararo matematika olimpiadasi',
      'Межшкольная олимпиада по математике',
      '학교 대항 수학 올림피아드',
    ),
    summary: t(
      'Teams from twelve Tashkent schools compete in algebra, geometry and logic.',
      'Toshkentning o‘n ikki maktabidan jamoalar algebra, geometriya va mantiq bo‘yicha bellashadi.',
      'Команды двенадцати школ Ташкента соревнуются в алгебре, геометрии и логике.',
      '타슈켄트 12개 학교 팀이 대수, 기하, 논리 문제로 겨룹니다.',
    ),
    eventDate: '2026-11-20',
    time: ['09:00', '14:00'],
    place: mainHall,
    carouselOrder: 2,
    status: 'PUBLISHED',
    publishedAt: h.tashkent('2026-10-20', '09:00'),
  });
  await post({
    type: 'NEWS',
    cover: 'news-ielts',
    title: t(
      'IELTS Mock Test results are out',
      'IELTS sinov imtihoni natijalari e’lon qilindi',
      'Результаты пробного IELTS опубликованы',
      'IELTS 모의고사 결과 발표',
    ),
    summary: t(
      'Grade 11 averaged band 6.5; eight students reached 7.0 or higher.',
      '11-sinflarning o‘rtacha bali 6.5; sakkiz o‘quvchi 7.0 va undan yuqori natija ko‘rsatdi.',
      'Средний балл 11-х классов — 6.5; восемь учеников набрали 7.0 и выше.',
      '11학년 평균 6.5밴드, 8명의 학생이 7.0 이상을 받았습니다.',
    ),
    carouselOrder: 3,
    status: 'PUBLISHED',
    publishedAt: h.tashkent('2026-10-12', '10:00'),
  });
  await post({
    type: 'NEWS',
    cover: 'news-lab',
    title: t(
      'New science lab opened',
      'Yangi ilmiy laboratoriya ochildi',
      'Открылась новая научная лаборатория',
      '새 과학 실험실 개관',
    ),
    summary: t(
      'Middle school classes now run chemistry and biology experiments every week.',
      'O‘rta sinflar endi har hafta kimyo va biologiya tajribalarini o‘tkazadi.',
      'Средние классы теперь каждую неделю проводят опыты по химии и биологии.',
      '중학교 학급은 이제 매주 화학·생물 실험을 합니다.',
    ),
    status: 'PUBLISHED',
    publishedAt: h.tashkent('2026-10-05', '10:00'),
  });
  await post({
    type: 'EVENT',
    cover: 'news-sports',
    title: t(
      'Autumn Sports Festival',
      'Kuzgi sport festivali',
      'Осенний спортивный фестиваль',
      '가을 체육 대회',
    ),
    summary: t(
      'Relays, football and taekwondo demonstrations for every grade.',
      'Barcha sinflar uchun estafetalar, futbol va taekvondo ko‘rgazmalari.',
      'Эстафеты, футбол и показательные выступления по тхэквондо для всех классов.',
      '전 학년이 참여하는 계주, 축구, 태권도 시범.',
    ),
    eventDate: '2026-11-02',
    time: ['10:00', '15:00'],
    place: t(
      'School stadium',
      'Maktab stadioni',
      'Школьный стадион',
      '학교 운동장',
    ),
    status: 'DRAFT',
  });
  await post({
    type: 'EVENT',
    cover: 'news-meetings',
    title: t(
      'Parent–teacher meetings, Quarter 1',
      'Ota-onalar majlisi, 1-chorak',
      'Родительские собрания, 1-я четверть',
      '1분기 학부모 상담',
    ),
    summary: t(
      'Fifteen-minute talks with each teacher about your child’s first quarter.',
      'Har bir ustoz bilan farzandingizning birinchi choragi haqida o‘n besh daqiqalik suhbat.',
      'Пятнадцатиминутные беседы с каждым учителем о первой четверти вашего ребёнка.',
      '각 선생님과 자녀의 1분기에 대해 15분간 상담합니다.',
    ),
    eventDate: '2026-10-30',
    time: ['15:00', '18:00'],
    place: t('Classrooms', 'Sinf xonalari', 'Учебные классы', '각 교실'),
    status: 'PUBLISHED',
    publishedAt: h.tashkent('2026-10-15', '09:00'),
  });
  await post({
    type: 'NEWS',
    cover: 'news-camp',
    title: t(
      'Summer camp photos',
      'Yozgi lager suratlari',
      'Фото из летнего лагеря',
      '여름 캠프 사진',
    ),
    summary: t(
      'Two weeks in the mountains: hiking, science projects and new friends.',
      'Tog‘larda ikki hafta: sayohatlar, ilmiy loyihalar va yangi do‘stlar.',
      'Две недели в горах: походы, научные проекты и новые друзья.',
      '산에서 보낸 2주: 하이킹, 과학 프로젝트, 새로운 친구들.',
    ),
    status: 'PUBLISHED',
    publishedAt: h.tashkent('2026-08-25', '10:00'),
  });

  // ───────────── Mock tests (register by phone; one past test for the admin list) ─────────────
  const mock = (data: {
    exam: 'IELTS' | 'TOPIK' | 'SAT' | 'OTHER';
    title: Text;
    included: Text;
    date: string;
    start: string;
    durationMin: number;
    location: Text;
    price: number;
    seats: [number, number];
    contactPersonId: string;
    contactPhone?: string;
  }) =>
    prisma.siteMockTest.create({
      data: {
        exam: data.exam,
        title: data.title,
        included: data.included,
        examDate: h.day(data.date),
        startTime: data.start,
        durationMin: data.durationMin,
        location: data.location,
        price: data.price,
        takenSeats: data.seats[0],
        totalSeats: data.seats[1],
        contactPersonId: data.contactPersonId,
        contactPhone: data.contactPhone ?? '+998 71 200 34 44',
      },
    });
  const ieltsTitle = t(
    'IELTS Academic Mock Test',
    'IELTS Academic sinov imtihoni',
    'Пробный экзамен IELTS Academic',
    'IELTS Academic 모의시험',
  );
  const ieltsIncluded = t(
    'Full simulation: Listening, Reading, Writing & 1-on-1 Speaking',
    'To‘liq simulyatsiya: Listening, Reading, Writing va yakkama-yakka Speaking',
    'Полная симуляция: Listening, Reading, Writing и Speaking один на один',
    '전체 시뮬레이션: 듣기, 읽기, 쓰기, 1:1 말하기',
  );
  const room204 = t(
    'Room 204, Campusly School',
    '204-xona, Campusly School',
    'Кабинет 204, Campusly School',
    'Campusly School 204호',
  );
  await mock({
    exam: 'IELTS',
    title: ieltsTitle,
    included: ieltsIncluded,
    date: '2026-11-07',
    start: '09:00',
    durationMin: 180,
    location: room204,
    price: 120_000,
    seats: [12, 30],
    contactPersonId: rahimov,
  });
  await mock({
    exam: 'TOPIK',
    title: t(
      'TOPIK I & II Mock Test',
      'TOPIK I va II sinov imtihoni',
      'Пробный экзамен TOPIK I и II',
      'TOPIK I·II 모의시험',
    ),
    included: t(
      'Real test conditions, checked by our Korean teachers',
      'Haqiqiy imtihon sharoiti, koreys tili ustozlarimiz tekshiradi',
      'Реальные условия экзамена, проверяют наши преподаватели корейского',
      '실제 시험 환경, 한국어 교사가 채점',
    ),
    date: '2026-11-15',
    start: '09:30',
    durationMin: 180,
    location: t(
      'Language Lab, 2nd floor',
      'Til laboratoriyasi, 2-qavat',
      'Лингафонный кабинет, 2-й этаж',
      '2층 어학실',
    ),
    price: 100_000,
    seats: [25, 40],
    contactPersonId: park,
    contactPhone: '+998 71 200 34 45',
  });
  await mock({
    exam: 'SAT',
    title: t(
      'SAT Practice Test',
      'SAT sinov testi',
      'Пробный тест SAT',
      'SAT 모의고사',
    ),
    included: t(
      'Reading & Writing and Math, with a score report',
      'Reading & Writing va Math, natijalar hisoboti bilan',
      'Reading & Writing и Math, с отчётом о баллах',
      '읽기·쓰기와 수학, 점수 리포트 제공',
    ),
    date: '2026-11-28',
    start: '09:00',
    durationMin: 135,
    location: t(
      'Room 301, Campusly School',
      '301-xona, Campusly School',
      'Кабинет 301, Campusly School',
      'Campusly School 301호',
    ),
    price: 150_000,
    seats: [30, 30],
    contactPersonId: rahimov,
  });
  await mock({
    exam: 'IELTS',
    title: ieltsTitle,
    included: ieltsIncluded,
    date: '2026-10-10',
    start: '09:00',
    durationMin: 180,
    location: room204,
    price: 120_000,
    seats: [30, 30],
    contactPersonId: rahimov,
  });

  // ───────────── Open Courses (real YouTube videos, checked with oEmbed) ─────────────
  const course = (
    order: number,
    category: 'IT' | 'MATH' | 'AI' | 'STUDY_ABROAD',
    title: Text,
    source: string,
    description: Text,
    lessons: [string, string][],
  ) =>
    prisma.siteOpenCourse.create({
      data: {
        category,
        title,
        source,
        description,
        status: 'PUBLISHED',
        order,
        lessons: {
          create: lessons.map(([youtubeId, title], i) => ({
            order: i,
            youtubeId,
            title,
          })),
        },
      },
    });
  await course(
    1,
    'IT',
    t(
      'Intro to Python',
      'Python’ga kirish',
      'Введение в Python',
      '파이썬 입문',
    ),
    'Programming with Mosh · freeCodeCamp',
    t(
      'Programming basics with Python: variables, conditions, loops and functions.',
      'Python yordamida dasturlash asoslari: o‘zgaruvchilar, shartlar, sikllar va funksiyalar.',
      'Основы программирования на Python: переменные, условия, циклы и функции.',
      '파이썬으로 배우는 프로그래밍 기초: 변수, 조건문, 반복문, 함수.',
    ),
    [
      ['kqtD5dpn9C8', 'Python for Beginners in 1 Hour'],
      ['_uQrJ0TkZlc', 'Python Full Course for Beginners'],
      ['rfscVS0vtbw', 'Learn Python – Full Course for Beginners'],
    ],
  );
  await course(
    2,
    'IT',
    t(
      'HTML & CSS basics',
      'HTML va CSS asoslari',
      'Основы HTML и CSS',
      'HTML·CSS 기초',
    ),
    'freeCodeCamp',
    t(
      'Build your first web page and style it step by step.',
      'Birinchi veb-sahifangizni yarating va uni bosqichma-bosqich bezang.',
      'Создайте свою первую веб-страницу и оформите её шаг за шагом.',
      '첫 웹 페이지를 만들고 단계별로 꾸며 봅니다.',
    ),
    [
      ['pQN-pnXPaVg', 'HTML Full Course – Build a Website'],
      ['1Rs2ND1ryYc', 'CSS Tutorial – Zero to Hero'],
      ['mU6anWqZJcc', 'Learn HTML5 and CSS3 From Scratch'],
    ],
  );
  await course(
    3,
    'IT',
    t(
      'Algorithms for beginners',
      'Boshlovchilar uchun algoritmlar',
      'Алгоритмы для начинающих',
      '초보자를 위한 알고리즘',
    ),
    'freeCodeCamp',
    t(
      'Searching, sorting and the data structures behind them, explained simply.',
      'Qidirish, saralash va ularning ortidagi ma’lumotlar tuzilmalari — sodda tilda.',
      'Поиск, сортировка и структуры данных за ними — простым языком.',
      '탐색, 정렬, 그리고 그 뒤의 자료구조를 쉽게 설명합니다.',
    ),
    [
      ['8hly31xKli0', 'Algorithms and Data Structures for Beginners'],
      ['RBSGKlAvoiM', 'Data Structures Easy to Advanced'],
    ],
  );
  await course(
    4,
    'IT',
    t(
      'JavaScript for beginners',
      'Boshlovchilar uchun JavaScript',
      'JavaScript для начинающих',
      '초보자를 위한 자바스크립트',
    ),
    'Programming with Mosh · freeCodeCamp',
    t(
      'The language of the web: variables, functions, objects and the DOM.',
      'Veb tili: o‘zgaruvchilar, funksiyalar, obyektlar va DOM.',
      'Язык веба: переменные, функции, объекты и DOM.',
      '웹의 언어: 변수, 함수, 객체, DOM.',
    ),
    [
      ['W6NZfCO5SIk', 'JavaScript Course for Beginners'],
      ['PkZNo7MFNFg', 'Learn JavaScript – Full Course for Beginners'],
      ['jS4aFq5-91M', 'JavaScript Programming – Full Course'],
    ],
  );
  await course(
    5,
    'MATH',
    t(
      'Essence of linear algebra',
      'Chiziqli algebra mohiyati',
      'Суть линейной алгебры',
      '선형대수의 본질',
    ),
    '3Blue1Brown',
    t(
      'Vectors, span and matrices — seen as pictures, not formulas.',
      'Vektorlar, chiziqli qobiq va matritsalar — formulalar emas, tasvirlar orqali.',
      'Векторы, линейная оболочка и матрицы — в картинках, а не формулах.',
      '벡터, 생성, 행렬을 공식이 아닌 그림으로 이해합니다.',
    ),
    [
      ['fNk_zzaMoSs', 'Vectors'],
      ['k7RM-ot2NWY', 'Linear combinations, span, and basis vectors'],
      ['kYB8IZa5AuE', 'Linear transformations and matrices'],
    ],
  );
  await course(
    6,
    'AI',
    t(
      'What is AI?',
      'Sun’iy intellekt nima?',
      'Что такое ИИ?',
      'AI란 무엇인가?',
    ),
    'Simplilearn · Dr. Raj Ramesh',
    t(
      'Short videos on what artificial intelligence is and where we meet it.',
      'Sun’iy intellekt nima ekanligi va uni qayerda uchratishimiz haqida qisqa videolar.',
      'Короткие видео о том, что такое ИИ и где мы с ним встречаемся.',
      '인공지능이 무엇이며 어디에서 만나는지 알려 주는 짧은 영상.',
    ),
    [
      ['ad79nYk2keg', 'What is AI? in 5 minutes'],
      ['2ePf9rue1Ao', 'What is Artificial Intelligence?'],
      ['mJeNghZXtMo', 'What is AI (or Machine Learning)?'],
    ],
  );
  await course(
    7,
    'AI',
    t(
      'How neural networks learn',
      'Neyron tarmoqlar qanday o‘rganadi',
      'Как учатся нейросети',
      '신경망은 어떻게 학습하는가',
    ),
    '3Blue1Brown',
    t(
      'The ideas behind deep learning, with beautiful animations.',
      'Chuqur o‘rganish g‘oyalari — chiroyli animatsiyalar bilan.',
      'Идеи глубокого обучения — с красивыми анимациями.',
      '아름다운 애니메이션으로 보는 딥러닝의 원리.',
    ),
    [
      ['aircAruvnKk', 'But what is a neural network?'],
      ['IHZwWFHWa-w', 'Gradient descent, how neural networks learn'],
      ['Ilg3gGewQ5U', 'Backpropagation, intuitively'],
    ],
  );

  // ───────────── Honor Students (real seeded students; the site shows "Madina A.") ─────────────
  const honor = async (
    order: number,
    loginId: string,
    result: { place: number } | { score: string },
    subject: Text,
    competition: Text,
    location: Text,
    achievedOn: string,
    photo: string | null,
    consent = true,
  ) => {
    const student = h.students[loginId];
    await prisma.siteHonorStudent.create({
      data: {
        studentId: student.id,
        className: student.group,
        resultType: 'place' in result ? 'MEDAL' : 'EXAM_SCORE',
        place: 'place' in result ? result.place : null,
        score: 'score' in result ? result.score : null,
        subject,
        competition,
        location,
        achievedOn: h.day(achievedOn),
        photoPath: photo ? `/site/${photo}.jpg` : null,
        parentConsent: consent,
        showOnSite: consent,
        order,
      },
    });
  };
  const maths = t('Mathematics', 'Matematika', 'Математика', '수학');
  await honor(
    1,
    '26100118',
    { place: 1 },
    t('Boxing', 'Boks', 'Бокс', '복싱'),
    t(
      'National Youth Championship 2026',
      'Yoshlar o‘rtasida respublika chempionati 2026',
      'Национальный юношеский чемпионат 2026',
      '2026 전국 청소년 선수권 대회',
    ),
    t(
      'Samarkand, Uzbekistan',
      'Samarqand, O‘zbekiston',
      'Самарканд, Узбекистан',
      '우즈베키스탄 사마르칸트',
    ),
    '2026-10-02',
    'honor-gold',
  );
  await honor(
    2,
    '26100055',
    { place: 2 },
    maths,
    t(
      'International Math Olympiad 2026',
      'Xalqaro matematika olimpiadasi 2026',
      'Международная олимпиада по математике 2026',
      '2026 국제 수학 올림피아드',
    ),
    t(
      'Almaty, Kazakhstan',
      'Olmaota, Qozog‘iston',
      'Алматы, Казахстан',
      '카자흐스탄 알마티',
    ),
    '2026-09-28',
    'honor-silver',
  );
  await honor(
    3,
    '26100089',
    { place: 3 },
    t('Chess', 'Shaxmat', 'Шахматы', '체스'),
    t(
      'Asian School Chess Cup 2026',
      'Osiyo maktablari shaxmat kubogi 2026',
      'Кубок Азии по шахматам среди школ 2026',
      '2026 아시아 학교 체스컵',
    ),
    t(
      'Bishkek, Kyrgyzstan',
      'Bishkek, Qirg‘iziston',
      'Бишкек, Кыргызстан',
      '키르기스스탄 비슈케크',
    ),
    '2026-09-15',
    'honor-chess',
  );
  await honor(
    4,
    '26100032',
    { score: 'IELTS 8.0' },
    t('IELTS Academic', 'IELTS Academic', 'IELTS Academic', 'IELTS Academic'),
    t(
      'IELTS Academic, Band 8.0',
      'IELTS Academic, 8.0 ball',
      'IELTS Academic, балл 8.0',
      'IELTS Academic 8.0점',
    ),
    t(
      'Tashkent, Uzbekistan',
      'Toshkent, O‘zbekiston',
      'Ташкент, Узбекистан',
      '우즈베키스탄 타슈켄트',
    ),
    '2026-09-10',
    'honor-ielts',
  );
  // No consent from the parents yet: the admin sees it, the site does not
  await honor(
    5,
    '26100042',
    { place: 1 },
    maths,
    t(
      'Tashkent City Math Olympiad',
      'Toshkent shahar matematika olimpiadasi',
      'Городская олимпиада по математике, Ташкент',
      '타슈켄트시 수학 올림피아드',
    ),
    t(
      'Tashkent, Uzbekistan',
      'Toshkent, O‘zbekiston',
      'Ташкент, Узбекистан',
      '우즈베키스탄 타슈켄트',
    ),
    '2026-09-04',
    null,
    false,
  );

  // ───────────── Admission enquiries (the inbox is not empty in the demo) ─────────────
  const enquiry = (
    parentName: string,
    phone: string,
    grade: number,
    interest: string,
    locale: string,
    status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED',
    at: Date,
  ) =>
    prisma.enquiry.create({
      data: {
        parentName,
        phone,
        childGrade: grade,
        interest,
        locale,
        userAgent: 'Chrome on Android',
        status,
        handledById: status === 'NEW' ? null : h.adminId,
        handledAt: status === 'NEW' ? null : at,
        createdAt: at,
      },
    });
  await enquiry(
    'Dilshod Karimov',
    '+998901234567',
    5,
    'KOREAN',
    'uz',
    'NEW',
    h.tashkent('2026-10-16', '19:20'),
  );
  await enquiry(
    'Sevara Akhmedova',
    '+998935550011',
    1,
    'STANDARD',
    'ru',
    'IN_PROGRESS',
    h.tashkent('2026-10-15', '11:05'),
  );
  await enquiry(
    'Min-jun Lee',
    '+998977003344',
    9,
    'IELTS',
    'ko',
    'RESOLVED',
    h.tashkent('2026-10-12', '16:40'),
  );
}
