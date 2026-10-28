// What is taught where (DECISIONS §12 "School data and demo v2"): subjects by level, the eight
// week topics of quarter 1 per subject and level, the weekdays a subject is taught and four sample
// quiz questions per subject. All invented demo content.

export type Band = 'PRIMARY' | 'MIDDLE' | 'HIGH';

/** Grades 1–4 / 5–9 / 10–11 */
export const bandOf = (grade: number): Band =>
  grade <= 4 ? 'PRIMARY' : grade <= 9 ? 'MIDDLE' : 'HIGH';

export const SUBJECTS_BY_BAND: Record<Band, string[]> = {
  PRIMARY: [
    'Mother Tongue',
    'Mathematics',
    'English',
    'Natural Science',
    'Art',
    'Physical Education',
  ],
  MIDDLE: [
    'Algebra',
    'Geometry',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'English',
    'Korean',
    'Informatics',
  ],
  HIGH: [
    'Algebra',
    'Geometry',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'English',
    'Korean',
    'Informatics',
  ],
};

export const ALL_SUBJECTS = [
  ...new Set(Object.values(SUBJECTS_BY_BAND).flat()),
];

/** Weekdays a subject is taught (1 = Monday … 5 = Friday); one lesson a day at most */
export const LESSON_DAYS: Record<string, number[]> = {
  'Mother Tongue': [1, 2, 3, 4],
  Mathematics: [1, 2, 3, 5],
  'Natural Science': [3, 5],
  Art: [5],
  'Physical Education': [2, 4],
  Algebra: [1, 3, 5],
  Geometry: [2, 4],
  Physics: [1, 4],
  Chemistry: [2, 5],
  Biology: [3, 5],
  History: [2, 4],
  Geography: [3],
  English: [2, 4],
  Korean: [1, 3],
  Informatics: [4],
};

/** Quarter 1 topics, week 1 … 8 (the 9A Algebra, English and Physics lists follow the Stitch design) */
export const TOPICS: Record<Band, Record<string, string[]>> = {
  PRIMARY: {
    'Mother Tongue': [
      'Letters and Sounds',
      'Reading Short Stories',
      'Nouns Around Us',
      'Writing a Postcard',
      'Fairy Tales',
      'Verbs in Action',
      'Poems About Autumn',
      'Quarter 1 Review',
    ],
    Mathematics: [
      'Numbers to 100',
      'Addition and Subtraction',
      'Multiplication Tables',
      'Measuring Length',
      'Telling the Time',
      'Shapes and Patterns',
      'Word Problems',
      'Quarter 1 Review',
    ],
    English: [
      'Hello and Goodbye',
      'My Family',
      'Colours and Numbers',
      'At School',
      'Animals',
      'My Day',
      'Food I Like',
      'Quarter 1 Review',
    ],
    'Natural Science': [
      'Living and Non-living',
      'Plants Around Us',
      'Animals and Their Homes',
      'The Water Cycle',
      'Weather and Seasons',
      'Our Body',
      'Healthy Habits',
      'Quarter 1 Review',
    ],
    Art: [
      'Lines and Shapes',
      'Primary Colours',
      'Drawing Nature',
      'Paper Craft',
      'Patterns of Uzbekistan',
      'Portraits',
      'Clay Modelling',
      'Quarter 1 Exhibition',
    ],
    'Physical Education': [
      'Warm-up Games',
      'Running and Relays',
      'Ball Skills',
      'Jumping',
      'Team Games',
      'Balance and Coordination',
      'Mini Football',
      'Quarter 1 Sports Day',
    ],
  },
  MIDDLE: {
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
    Geometry: [
      'Points, Lines and Angles',
      'Triangles',
      'Congruent Triangles',
      'Parallel Lines',
      'Quadrilaterals',
      'Circles',
      'Area and Perimeter',
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
    Chemistry: [
      'Matter and Its States',
      'Atoms and Molecules',
      'The Periodic Table',
      'Chemical Bonds',
      'Chemical Reactions',
      'Acids and Bases',
      'Lab: Indicators',
      'Quarter 1 Review',
    ],
    Biology: [
      'The Cell',
      'Microscope Lab',
      'Plant Structure',
      'Photosynthesis',
      'Animal Classification',
      'Ecosystems',
      'Food Chains',
      'Quarter 1 Review',
    ],
    History: [
      'Ancient Civilisations',
      'The Silk Road',
      'Samarkand and Bukhara',
      'The Timurid Empire',
      'Great Scholars of Central Asia',
      'The Age of Discovery',
      'Reading Historical Sources',
      'Quarter 1 Review',
    ],
    Geography: [
      'Maps and Scale',
      'Latitude and Longitude',
      'Landforms',
      'Climate Zones',
      'Rivers and Lakes',
      'Geography of Uzbekistan',
      'Population and Cities',
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
    Korean: [
      'Hangul Vowels',
      'Hangul Consonants',
      'Greetings',
      'Numbers and Counting',
      'My Family in Korean',
      'Daily Routine',
      'Ordering Food',
      'Quarter 1 Review',
    ],
    Informatics: [
      'How Computers Work',
      'Files and Folders',
      'Algorithms',
      'Flowcharts',
      'Scratch: First Program',
      'Loops',
      'Internet Safety',
      'Quarter 1 Project',
    ],
  },
  HIGH: {
    Algebra: [
      'Functions and Graphs',
      'Exponents and Roots',
      'Exponential Functions',
      'Logarithms',
      'Logarithmic Equations',
      'Sequences',
      'Limits: An Introduction',
      'Quarter 1 Review',
    ],
    Geometry: [
      'Vectors',
      'Coordinates in Space',
      'Lines and Planes',
      'Polyhedra',
      'Prisms and Pyramids',
      'Cylinders and Cones',
      'Volume and Surface Area',
      'Quarter 1 Review',
    ],
    Physics: [
      'Electric Charge',
      'Coulomb’s Law',
      'Electric Field',
      'Current and Resistance',
      'Ohm’s Law Lab',
      'Circuits',
      'Magnetism',
      'Quarter 1 Review',
    ],
    Chemistry: [
      'Organic Chemistry Basics',
      'Hydrocarbons',
      'Alcohols',
      'Carboxylic Acids',
      'Polymers',
      'Reaction Rates',
      'Chemical Equilibrium',
      'Quarter 1 Review',
    ],
    Biology: [
      'DNA and Genes',
      'Protein Synthesis',
      'Cell Division',
      'Mendel’s Laws',
      'Human Genetics',
      'Evolution',
      'Natural Selection',
      'Quarter 1 Review',
    ],
    History: [
      'The Industrial Revolution',
      'World War I',
      'The Interwar Years',
      'World War II',
      'The Cold War',
      'Independence of Uzbekistan',
      'Globalisation',
      'Quarter 1 Review',
    ],
    English: [
      'IELTS Reading Skills',
      'Academic Vocabulary',
      'IELTS Writing Task 1',
      'IELTS Writing Task 2',
      'Listening Strategies',
      'Speaking Part 2',
      'Argumentative Essays',
      'Quarter 1 Mock Test',
    ],
    Korean: [
      'TOPIK Reading',
      'Honorifics',
      'Past and Future Tenses',
      'Korean Culture',
      'Writing a Short Essay',
      'Listening Practice',
      'TOPIK Writing',
      'Quarter 1 Review',
    ],
    Informatics: [
      'Python Basics',
      'Variables and Types',
      'Conditions',
      'Loops in Python',
      'Functions',
      'Lists and Dictionaries',
      'Mini Project',
      'Quarter 1 Review',
    ],
  },
};

/** Algebra (grades 5–9) quiz names from the Stitch design ("Quiz 4: Discriminant") */
export const ALGEBRA_QUIZZES = [
  'Linear Equations',
  'Quadratic Equations',
  'Quadratic Roots',
  'Discriminant',
];

export type SeedQuestion = {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'NUMBER';
  text: string;
  options: string[];
  correctOption: number | null;
  correctNumber: number | null;
  tolerance: number | null;
};
const mc = (
  text: string,
  options: string[],
  correctOption: number,
): SeedQuestion => ({
  type: 'MULTIPLE_CHOICE',
  text,
  options,
  correctOption,
  correctNumber: null,
  tolerance: null,
});
const tf = (text: string, correct: boolean): SeedQuestion => ({
  type: 'TRUE_FALSE',
  text,
  options: [],
  correctOption: correct ? 1 : 0,
  correctNumber: null,
  tolerance: null,
});
const numeric = (
  text: string,
  correctNumber: number,
  tolerance = 0,
): SeedQuestion => ({
  type: 'NUMBER',
  text,
  options: [],
  correctOption: null,
  correctNumber,
  tolerance,
});

/** Sample questions per subject (the same four for each quiz of a course: demo data) */
export const QUIZ_QUESTIONS: Record<string, SeedQuestion[]> = {
  'Mother Tongue': [
    mc('Which word is a noun?', ['run', 'house', 'quickly', 'blue'], 1),
    tf('A sentence starts with a capital letter.', true),
    numeric('How many letters are in the word "kitob"?', 5),
    mc('Which word rhymes with "kun"?', ['tun', 'non', 'ot', 'suv'], 0),
  ],
  Mathematics: [
    numeric('7 × 8 = ?', 56),
    mc('Which number is the largest?', ['89', '98', '78', '87'], 1),
    tf('Half of 50 is 25.', true),
    numeric(
      'A lesson starts at 9:00 and lasts 45 minutes. At what minute past 9 does it end?',
      45,
    ),
  ],
  'Natural Science': [
    mc(
      'Which of these is a living thing?',
      ['stone', 'tree', 'water', 'sand'],
      1,
    ),
    tf('Plants need sunlight to grow.', true),
    mc(
      'Water turns into ice when it …',
      ['boils', 'freezes', 'melts', 'evaporates'],
      1,
    ),
    numeric('How many legs does an insect have?', 6),
  ],
  Art: [
    mc('Which is a primary colour?', ['green', 'orange', 'blue', 'purple'], 2),
    tf('Mixing yellow and blue makes green.', true),
    mc(
      'Ikat is a traditional Uzbek …',
      ['dance', 'fabric pattern', 'song', 'dish'],
      1,
    ),
    numeric('How many primary colours are there?', 3),
  ],
  'Physical Education': [
    tf('Warming up before exercise helps prevent injuries.', true),
    mc(
      'How many players does a football team have on the field?',
      ['9', '10', '11', '12'],
      2,
    ),
    numeric('How many metres is one lap of a standard running track?', 400),
    mc(
      'Which is a team sport?',
      ['chess', 'swimming', 'volleyball', 'running'],
      2,
    ),
  ],
  Algebra: [
    mc('What is the discriminant of x² − 5x + 6?', ['1', '25', '−1', '49'], 0),
    tf('A quadratic with a negative discriminant has two real roots.', false),
    numeric('Solve 3x + 7 = 22. What is x?', 5),
    mc('Which number is a root of x² − 9 = 0?', ['3', '9', '0', '81'], 0),
  ],
  Geometry: [
    numeric('The angles of a triangle add up to how many degrees?', 180),
    mc(
      'A quadrilateral with four right angles and equal sides is a …',
      ['rectangle', 'square', 'rhombus', 'trapezoid'],
      1,
    ),
    tf('Vertical angles are always equal.', true),
    numeric('A rectangle is 4 cm by 6 cm. What is its area in cm²?', 24),
  ],
  Physics: [
    mc(
      'The SI unit of force is the …',
      ['joule', 'newton', 'watt', 'pascal'],
      1,
    ),
    tf(
      'Without air, a heavy ball and a light ball dropped together land at the same time.',
      true,
    ),
    numeric('A car travels 120 m in 10 s. What is its speed in m/s?', 12),
    mc(
      'Which quantity is a vector?',
      ['mass', 'time', 'velocity', 'temperature'],
      2,
    ),
  ],
  Chemistry: [
    mc('What is the chemical symbol for sodium?', ['S', 'So', 'Na', 'N'], 2),
    tf('Water is a compound.', true),
    numeric('What is the atomic number of carbon?', 6),
    mc('A solution with pH 2 is …', ['neutral', 'acidic', 'basic', 'salty'], 1),
  ],
  Biology: [
    mc(
      'Which organelle makes energy for the cell?',
      ['nucleus', 'ribosome', 'mitochondrion', 'vacuole'],
      2,
    ),
    tf('Photosynthesis releases oxygen.', true),
    numeric('How many chromosomes does a human body cell have?', 46),
    mc(
      'A food chain always starts with a …',
      ['producer', 'predator', 'decomposer', 'herbivore'],
      0,
    ),
  ],
  History: [
    mc(
      'Which city was Amir Temur’s capital?',
      ['Bukhara', 'Khiva', 'Samarkand', 'Tashkent'],
      2,
    ),
    tf('The Silk Road connected China with the Mediterranean.', true),
    numeric('In which year did Uzbekistan become independent?', 1991),
    mc(
      'Ulugh Beg is best known as an …',
      ['architect', 'astronomer', 'poet', 'general'],
      1,
    ),
  ],
  Geography: [
    mc(
      'What is the capital of Uzbekistan?',
      ['Samarkand', 'Tashkent', 'Namangan', 'Nukus'],
      1,
    ),
    tf('The Amu Darya flows into the Aral Sea.', true),
    numeric('How many continents are there?', 7),
    mc(
      'Lines of latitude run …',
      [
        'north–south',
        'east–west',
        'diagonally',
        'in circles around the poles only',
      ],
      1,
    ),
  ],
  English: [
    mc('She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 1),
    tf('"Their" and "there" mean the same thing.', false),
    mc(
      'Which word is an adjective?',
      ['quickly', 'happiness', 'bright', 'run'],
      2,
    ),
    numeric('How many syllables are in the word "education"?', 4),
  ],
  Korean: [
    mc(
      'How do you say "thank you" in Korean?',
      ['안녕하세요', '감사합니다', '죄송합니다', '네'],
      1,
    ),
    tf('Hangul was created in the 15th century.', true),
    numeric('How many basic vowels does Hangul have?', 10),
    mc('"학교" means …', ['teacher', 'school', 'book', 'friend'], 1),
  ],
  Informatics: [
    mc(
      'Which of these is an input device?',
      ['monitor', 'printer', 'keyboard', 'speaker'],
      2,
    ),
    tf('An algorithm is a step-by-step set of instructions.', true),
    numeric('How many bits are in one byte?', 8),
    mc(
      'In Python, which keyword starts a loop?',
      ['if', 'for', 'def', 'print'],
      1,
    ),
  ],
};
