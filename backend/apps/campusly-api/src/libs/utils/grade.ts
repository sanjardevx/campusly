/**
 * Course grade math (DECISIONS §10). Pure functions: no database, easy to unit test.
 *
 *   category %  = points earned / points possible   (only published grades are passed in)
 *   course %    = Σ(category % × weight) / Σ(weight of categories that have grades)
 *   mark        = 5 / 4 / 3 / 2 from the school's thresholds
 */

export interface GradeCategoryInput {
  id: string;
  name: string;
  /** Percent; the weights of one course add up to 100 */
  weight: number;
}

export interface GradedItemInput {
  categoryId: string;
  score: number;
  maxScore: number;
}

export interface MarkThresholds {
  mark5MinPercent: number;
  mark4MinPercent: number;
  mark3MinPercent: number;
}

export interface CategoryResult {
  categoryId: string;
  name: string;
  weight: number;
  earned: number;
  possible: number;
  /** null = no grades in this category yet (left out of the course %) */
  percent: number | null;
  count: number;
}

export interface GradeResult {
  /** null = no grades at all yet */
  percent: number | null;
  mark: number | null;
  categories: CategoryResult[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateGrade(
  categories: GradeCategoryInput[],
  items: GradedItemInput[],
  thresholds: MarkThresholds,
): GradeResult {
  const results: CategoryResult[] = categories.map((category) => {
    const own = items.filter((i) => i.categoryId === category.id);
    // Points, not an average of percents: a 100-point exam counts more than a 10-point quiz
    const earned = own.reduce((sum, i) => sum + i.score, 0);
    const possible = own.reduce((sum, i) => sum + i.maxScore, 0);
    return {
      categoryId: category.id,
      name: category.name,
      weight: category.weight,
      earned: round2(earned),
      possible: round2(possible),
      percent: possible > 0 ? round2((earned / possible) * 100) : null,
      count: own.length,
    };
  });

  // An empty category is skipped and the other weights are rebalanced (not counted as 0 %)
  const counted = results.filter((c) => c.percent !== null && c.weight > 0);
  const totalWeight = counted.reduce((sum, c) => sum + c.weight, 0);
  const percent =
    totalWeight > 0
      ? round2(
          counted.reduce((sum, c) => sum + c.percent! * c.weight, 0) /
            totalWeight,
        )
      : null;

  return { percent, mark: toMark(percent, thresholds), categories: results };
}

/** The 5-point mark of a (rounded) percent, as shown next to it */
export function toMark(
  percent: number | null,
  t: MarkThresholds,
): number | null {
  if (percent === null) return null;
  if (percent >= t.mark5MinPercent) return 5;
  if (percent >= t.mark4MinPercent) return 4;
  if (percent >= t.mark3MinPercent) return 3;
  return 2;
}
