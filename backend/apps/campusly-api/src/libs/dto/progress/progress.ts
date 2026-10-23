import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { SubmissionStatus } from '../../enums/assignment.enum';
import { ProgressStatus } from '../../enums/progress.enum';

/** One student's progress in one lesson */
@ObjectType()
export class LessonProgress {
  @Field(() => String)
  lessonId: string;

  @Field(() => ProgressStatus)
  status: ProgressStatus;

  /** Real watching time counted by the server (for teachers' statistics) */
  @Field(() => Int)
  watchedSeconds: number;

  /** Resume point */
  @Field(() => Int)
  lastPositionSec: number;

  /** Furthest point reached by watching in order: the progress itself */
  @Field(() => Int)
  maxPositionSec: number;

  /** maxPositionSec as 0–100 % of the video (null when the length is unknown) */
  @Field(() => Int, { nullable: true })
  percent: number | null;

  @Field(() => Date, { nullable: true })
  completedAt: Date | null;
}

/** A lesson on the student's course page: done, half watched or not started */
@ObjectType()
export class LessonState {
  @Field(() => String)
  lessonId: string;

  @Field(() => ProgressStatus)
  status: ProgressStatus;

  /** Videos: furthest point reached, % of the length; null for other lessons or no length */
  @Field(() => Int, { nullable: true })
  percent: number | null;
}

/** An assignment on the student's course page. Score only once grades are published. */
@ObjectType()
export class AssignmentState {
  @Field(() => String)
  assignmentId: string;

  /** null = nothing started; GRADED / MISSING only after the grades are published */
  @Field(() => SubmissionStatus, { nullable: true })
  status: SubmissionStatus | null;

  @Field(() => Float, { nullable: true })
  score: number | null;
}

/** One student's state in one course, for the course page (one query, not one per row) */
@ObjectType()
export class CourseProgress {
  @Field(() => String)
  courseId: string;

  /** Completed lessons / visible lessons, 0–100; null without lessons */
  @Field(() => Int, { nullable: true })
  progress: number | null;

  @Field(() => [LessonState])
  lessons: LessonState[];

  @Field(() => [AssignmentState])
  assignments: AssignmentState[];
}
