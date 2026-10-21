import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { AssignmentType, SubmissionStatus } from '../../enums/assignment.enum';

@ObjectType()
export class CategoryGrade {
  @Field(() => String)
  categoryId: string;

  /** e.g. "Homework" */
  @Field(() => String)
  name: string;

  @Field(() => Int)
  weight: number;

  @Field(() => Float)
  earned: number;

  @Field(() => Float)
  possible: number;

  /** null = no published grades yet: left out, the other weights are rebalanced */
  @Field(() => Float, { nullable: true })
  percent: number | null;

  @Field(() => Int)
  count: number;
}

/** One published grade that counts in the period */
@ObjectType()
export class GradeItem {
  @Field(() => String)
  assignmentId: string;

  @Field(() => String)
  title: string;

  @Field(() => AssignmentType)
  type: AssignmentType;

  @Field(() => String)
  categoryName: string;

  @Field(() => Float)
  score: number;

  @Field(() => Float)
  maxScore: number;

  @Field(() => Date, { nullable: true })
  dueAt: Date | null;

  /** GRADED, or MISSING (a zero for work not handed in) */
  @Field(() => SubmissionStatus)
  status: SubmissionStatus;
}

/** A student's grade in one course for one period (published grades only) */
@ObjectType()
export class StudentGrade {
  @Field(() => String)
  studentId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  /** Weighted %, 2 decimals; null = no published grades yet */
  @Field(() => Float, { nullable: true })
  percent: number | null;

  /** 5 / 4 / 3 / 2 from the school's thresholds */
  @Field(() => Int, { nullable: true })
  mark: number | null;

  @Field(() => [CategoryGrade])
  categories: CategoryGrade[];

  /** Oldest due first */
  @Field(() => [GradeItem])
  items: GradeItem[];
}

/**
 * A period (quarter) or annual grade of one student. Published = a snapshot that does not
 * change by itself; not published = the live % from published assignment grades.
 */
@ObjectType()
export class PeriodGradeRow {
  /** null = annual grade */
  @Field(() => String, { nullable: true })
  periodId: string | null;

  /** e.g. "Quarter 1" or "Annual" */
  @Field(() => String)
  periodName: string;

  @Field(() => String)
  studentId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  /** The grade to show: final ?? snapshot when published, else the live % */
  @Field(() => Float, { nullable: true })
  score: number | null;

  @Field(() => Int, { nullable: true })
  mark: number | null;

  @Field(() => Boolean)
  isPublished: boolean;

  @Field(() => Date, { nullable: true })
  publishedAt: Date | null;

  /** Teachers only (null for students and parents): the % right now */
  @Field(() => Float, { nullable: true })
  livePercent: number | null;

  /** Teachers only: the snapshot taken when publishing */
  @Field(() => Float, { nullable: true })
  computedScore: number | null;

  /** Teachers only: the manual override */
  @Field(() => Float, { nullable: true })
  finalScore: number | null;

  /** Teachers only: grades changed after publishing; publish again to update */
  @Field(() => Boolean)
  isOutdated: boolean;
}

@ObjectType()
export class MyPeriodGrades {
  /** Every period of the course's year, in order */
  @Field(() => [PeriodGradeRow])
  periods: PeriodGradeRow[];

  /** Override, or the average of the published periods */
  @Field(() => PeriodGradeRow)
  annual: PeriodGradeRow;
}
