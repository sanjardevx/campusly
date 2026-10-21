import { calculateGrade, toMark } from './grade';

const DEFAULT = {
  mark5MinPercent: 86,
  mark4MinPercent: 71,
  mark3MinPercent: 56,
};
const categories = [
  { id: 'hw', name: 'Homework', weight: 30 },
  { id: 'quiz', name: 'Quizzes', weight: 30 },
  { id: 'exam', name: 'Exams', weight: 40 },
];

describe('calculateGrade', () => {
  it('weights categories and skips an empty one (the DECISIONS example)', () => {
    const result = calculateGrade(
      categories,
      [
        { categoryId: 'hw', score: 18, maxScore: 20 },
        { categoryId: 'hw', score: 9, maxScore: 10 },
        { categoryId: 'exam', score: 34, maxScore: 50 },
      ],
      DEFAULT,
    );
    // Homework 27/30 = 90 %, Exams 34/50 = 68 %, Quizzes empty:
    // (90 × 30 + 68 × 40) / (30 + 40) = 77.43 %
    expect(result.percent).toBe(77.43);
    expect(result.mark).toBe(4);
    expect(result.categories.map((c) => [c.name, c.percent, c.count])).toEqual([
      ['Homework', 90, 2],
      ['Quizzes', null, 0],
      ['Exams', 68, 1],
    ]);
  });

  it('sums points inside a category (a big exam counts more than a small quiz)', () => {
    const result = calculateGrade(
      [{ id: 'all', name: 'All', weight: 100 }],
      [
        { categoryId: 'all', score: 10, maxScore: 10 }, // 100 %
        { categoryId: 'all', score: 50, maxScore: 100 }, // 50 %
      ],
      DEFAULT,
    );
    // 60/110 = 54.55 %, not the average of percents (75 %)
    expect(result.percent).toBe(54.55);
    expect(result.mark).toBe(2);
  });

  it('no grades yet → null, not 0 %', () => {
    expect(calculateGrade(categories, [], DEFAULT)).toMatchObject({
      percent: null,
      mark: null,
    });
  });

  it('a zero for missing work counts like any grade', () => {
    const result = calculateGrade(
      categories,
      [
        { categoryId: 'hw', score: 10, maxScore: 10 },
        { categoryId: 'hw', score: 0, maxScore: 10 },
      ],
      DEFAULT,
    );
    expect(result.percent).toBe(50);
  });
});

describe('toMark', () => {
  it('uses the thresholds on the rounded percent', () => {
    expect(toMark(86, DEFAULT)).toBe(5);
    expect(toMark(85.99, DEFAULT)).toBe(4);
    expect(toMark(71, DEFAULT)).toBe(4);
    expect(toMark(56, DEFAULT)).toBe(3);
    expect(toMark(55.99, DEFAULT)).toBe(2);
    expect(toMark(null, DEFAULT)).toBeNull();
  });

  it('follows the school settings', () => {
    const strict = {
      mark5MinPercent: 90,
      mark4MinPercent: 75,
      mark3MinPercent: 60,
    };
    expect(toMark(88, strict)).toBe(4);
  });
});
