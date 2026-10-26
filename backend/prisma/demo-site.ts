// Demo content of the public website (day 19): News & Events, Programs & clubs, Our team.
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
}

/** The website part of the school settings (footer, numbers strip) */
export const SITE_SETTINGS = {
  contactPhone: '+998 71 200 00 00',
  officeHours: 'Mon–Fri · 08:30–17:30',
  siteAddress: '12 Academic Street, Chilanzar, Tashkent',
  siteMetro: 'Nearest metro: Chilanzar, 5 min walk',
  siteEmail: 'admissions@campusly.uz',
  foundedYear: 2014,
};

export async function seedSite(prisma: PrismaClient, h: SiteSeedHelpers) {
  // ───────────── Our team (first: programs name their teachers) ─────────────
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
  const smith = await person(
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
  const rashidov = await person(
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
  const yusupova = await person(
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
    { showOnSite: false },
  );

  // ───────────── Programs & clubs ─────────────
  const program = (
    order: number,
    category: 'LANGUAGE' | 'SPORTS' | 'IT' | 'ARTS' | 'READING' | 'OTHER',
    photo: string,
    name: Text,
    grades: [number, number],
    levelNote: Text,
    days: string[],
    time: [string, string],
    description: Text,
    extra: { room?: string; teacherIds?: string[]; showOnSite?: boolean } = {},
  ) =>
    prisma.siteProgram.create({
      data: {
        order,
        category,
        name,
        gradeFrom: grades[0],
        gradeTo: grades[1],
        levelNote,
        days,
        startTime: time[0],
        endTime: time[1],
        room: extra.room ?? null,
        teacherIds: extra.teacherIds ?? [],
        description,
        photoPath: `/site/${photo}.jpg`,
        showOnSite: extra.showOnSite ?? true,
        updatedById: h.adminId,
      },
    });

  await program(
    1,
    'LANGUAGE',
    'program-korean',
    t(
      'Korean Language (TOPIK prep)',
      'Koreys tili (TOPIKga tayyorlov)',
      'Корейский язык (подготовка к TOPIK)',
      '한국어 (TOPIK 대비)',
    ),
    [7, 11],
    t(
      'Beginner → TOPIK II',
      'Boshlang‘ich → TOPIK II',
      'С нуля → TOPIK II',
      '초급 → TOPIK II',
    ),
    ['MON', 'THU'],
    ['15:30', '17:00'],
    t(
      'Speaking, reading and TOPIK practice in small groups.',
      'Kichik guruhlarda nutq, o‘qish va TOPIK mashqlari.',
      'Разговор, чтение и практика TOPIK в малых группах.',
      '소그룹으로 진행하는 말하기, 읽기, TOPIK 연습.',
    ),
    { room: 'Room 204', teacherIds: [park] },
  );
  await program(
    2,
    'LANGUAGE',
    'program-english',
    t(
      'English with native teachers',
      'Ona tilida so‘zlashuvchi ustozlar bilan ingliz tili',
      'Английский с носителями языка',
      '원어민 교사와 함께하는 영어',
    ),
    [5, 11],
    t(
      'Intermediate → Fluent (IELTS)',
      'O‘rta → Erkin (IELTS)',
      'Средний → свободный (IELTS)',
      '중급 → 유창함 (IELTS)',
    ),
    ['TUE', 'FRI'],
    ['15:30', '17:00'],
    t(
      'Debate club, academic writing and spoken fluency workshops.',
      'Munozara klubi, akademik yozuv va og‘zaki nutq mashg‘ulotlari.',
      'Дебатный клуб, академическое письмо и практика устной речи.',
      '토론 클럽, 학술 글쓰기, 말하기 유창성 워크숍.',
    ),
    { room: 'Room 112', teacherIds: [smith] },
  );
  await program(
    3,
    'SPORTS',
    'program-taekwondo',
    t(
      'Taekwondo Club',
      'Taekvondo to‘garagi',
      'Секция тхэквондо',
      '태권도 클럽',
    ),
    [1, 8],
    t(
      'All belt divisions',
      'Barcha kamar darajalari',
      'Все пояса',
      '모든 띠 등급',
    ),
    ['MON', 'WED', 'FRI'],
    ['16:00', '17:30'],
    t(
      'Olympic sparring, discipline drills and certified belt grading.',
      'Olimpiya sparringi, intizom mashqlari va rasmiy kamar attestatsiyasi.',
      'Олимпийский спарринг, дисциплина и официальная аттестация на пояса.',
      '올림픽 겨루기, 규율 훈련, 공인 승급 심사.',
    ),
    { room: 'Sports hall', teacherIds: [rashidov] },
  );
  await program(
    4,
    'IT',
    'program-it',
    t(
      'IT & Coding Club',
      'IT va dasturlash to‘garagi',
      'Клуб IT и программирования',
      'IT·코딩 클럽',
    ),
    [6, 11],
    t(
      'Python, Web & Robotics',
      'Python, veb va robototexnika',
      'Python, веб и робототехника',
      '파이썬, 웹, 로보틱스',
    ),
    ['WED', 'SAT'],
    ['14:30', '16:30'],
    t(
      'Hands-on microcontrollers, software design and hackathons.',
      'Mikrokontrollerlar bilan amaliyot, dastur loyihalash va xakatonlar.',
      'Практика с микроконтроллерами, проектирование программ и хакатоны.',
      '마이크로컨트롤러 실습, 소프트웨어 설계, 해커톤.',
    ),
    { room: 'IT lab' },
  );
  await program(
    5,
    'ARTS',
    'program-art',
    t(
      'Art Studio',
      'San’at studiyasi',
      'Художественная студия',
      '미술 스튜디오',
    ),
    [1, 7],
    t(
      'Drawing & watercolour',
      'Rasm va akvarel',
      'Рисунок и акварель',
      '드로잉·수채화',
    ),
    ['TUE', 'THU'],
    ['15:00', '16:30'],
    t(
      'Academic drawing, watercolour techniques and a yearly exhibition.',
      'Akademik rasm, akvarel texnikasi va yillik ko‘rgazma.',
      'Академический рисунок, техники акварели и ежегодная выставка.',
      '아카데믹 드로잉, 수채화 기법, 연례 전시회.',
    ),
    { room: 'Art studio', teacherIds: [yusupova] },
  );
  await program(
    6,
    'READING',
    'program-reading',
    t('Reading Club', 'Kitobxonlar klubi', 'Читательский клуб', '독서 클럽'),
    [1, 5],
    t(
      'Literature & comprehension',
      'Adabiyot va matnni tushunish',
      'Литература и понимание текста',
      '문학과 독해',
    ),
    ['MON', 'FRI'],
    ['14:00', '15:30'],
    t(
      'Reading circles, book talks and storytelling games.',
      'Kitob o‘qish davralari, kitob muhokamalari va hikoya o‘yinlari.',
      'Читательские кружки, обсуждение книг и игры в истории.',
      '독서 모임, 책 이야기, 스토리텔링 게임.',
    ),
    { room: 'Library' },
  );
  await program(
    7,
    'SPORTS',
    'program-chess',
    t('Chess Club', 'Shaxmat to‘garagi', 'Шахматный клуб', '체스 클럽'),
    [5, 11],
    t(
      'From first moves to tournaments',
      'Birinchi yurishlardan turnirlargacha',
      'От первых ходов до турниров',
      '첫수부터 대회까지',
    ),
    ['TUE', 'THU'],
    ['15:30', '17:00'],
    t(
      'Openings, tactics and school tournaments every term.',
      'Debyutlar, taktika va har chorakda maktab turnirlari.',
      'Дебюты, тактика и школьные турниры каждую четверть.',
      '오프닝, 전술, 매 학기 교내 대회.',
    ),
    { showOnSite: false },
  );
  await program(
    8,
    'SPORTS',
    'program-football',
    t('Football Club', 'Futbol to‘garagi', 'Футбольная секция', '축구 클럽'),
    [7, 11],
    t(
      'Boys and girls teams',
      'O‘g‘il va qiz bolalar jamoalari',
      'Команды мальчиков и девочек',
      '남녀 팀',
    ),
    ['WED', 'FRI'],
    ['16:00', '17:30'],
    t(
      'Training twice a week and the city school league.',
      'Haftada ikki marta mashg‘ulot va shahar maktablar ligasi.',
      'Тренировки дважды в неделю и городская школьная лига.',
      '주 2회 훈련과 시 학교 리그.',
    ),
    { showOnSite: false },
  );

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
