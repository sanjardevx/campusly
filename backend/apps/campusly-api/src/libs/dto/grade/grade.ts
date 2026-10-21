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
