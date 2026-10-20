import { Field, Int, ObjectType } from '@nestjs/graphql';
import { RecordStatus } from '../../enums/course.enum';
import { PeriodKind } from '../../enums/school.enum';

/** Nothing secret here: the logged-out landing page also shows the school name */
@ObjectType()
export class SchoolSettings {
  @Field(() => String)
  schoolName: string;

  /** Business rules (deadlines, attendance day) use this timezone */
  @Field(() => String)
  timezone: string;

  @Field(() => String)
  defaultLocale: string;

  /** 5-point mark thresholds in %: 5 ≥ mark5, 4 ≥ mark4, 3 ≥ mark3, else 2 */
  @Field(() => Int)
  mark5MinPercent: number;

  @Field(() => Int)
  mark4MinPercent: number;

  @Field(() => Int)
  mark3MinPercent: number;

  /** Default category weights for new courses (add up to 100) */
  @Field(() => Int)
  defaultHomeworkWeight: number;

  @Field(() => Int)
  defaultQuizWeight: number;

  @Field(() => Int)
  defaultExamWeight: number;
}

@ObjectType()
export class AcademicYear {
  @Field(() => String)
  id: string;

  /** e.g. "2026–27" */
  @Field(() => String)
  name: string;

  /** "YYYY-MM-DD" (calendar date, no time) */
  @Field(() => String)
  startsAt: string;

  @Field(() => String)
  endsAt: string;

  @Field(() => Boolean)
  isCurrent: boolean;
}

@ObjectType()
export class Period {
  @Field(() => String)
  id: string;

  @Field(() => String)
  academicYearId: string;

  /** A quarter inside a semester points to the semester */
  @Field(() => String, { nullable: true })
  parentId: string | null;

  @Field(() => PeriodKind)
  kind: PeriodKind;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  order: number;

  @Field(() => String)
  startsAt: string;

  @Field(() => String)
  endsAt: string;
}

/** "Manage subjects": one row per subject, so courses never spell it differently */
@ObjectType()
export class Subject {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => RecordStatus)
  status: RecordStatus;
}
