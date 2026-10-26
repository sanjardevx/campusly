import { isAnswerCorrect, shuffled } from './quiz-grading';

describe('isAnswerCorrect', () => {
  const mc = {
    type: 'MULTIPLE_CHOICE' as const,
    correctOption: 2,
    correctNumber: null,
    tolerance: null,
  };
  const num = {
    type: 'NUMBER' as const,
    correctOption: null,
    correctNumber: 0.3,
    tolerance: 0,
  };

  it('multiple choice / true-false: the chosen index must be the right one', () => {
    expect(isAnswerCorrect(mc, { choice: 2, number: null })).toBe(true);
    expect(isAnswerCorrect(mc, { choice: 1, number: null })).toBe(false);
  });

  it('no answer is wrong', () => {
    expect(isAnswerCorrect(mc, undefined)).toBe(false);
    expect(isAnswerCorrect(mc, { choice: null, number: null })).toBe(false);
  });

  it('numbers: exact up to float noise, or within the tolerance', () => {
    expect(isAnswerCorrect(num, { choice: null, number: 0.1 + 0.2 })).toBe(
      true,
    );
    expect(isAnswerCorrect(num, { choice: null, number: 0.31 })).toBe(false);
    expect(
      isAnswerCorrect(
        { ...num, tolerance: 0.05 },
        { choice: null, number: 0.34 },
      ),
    ).toBe(true);
  });
});

describe('shuffled', () => {
  it('keeps every item and does not change the input', () => {
    const items = [1, 2, 3, 4, 5];
    const out = shuffled(items, () => 0);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
