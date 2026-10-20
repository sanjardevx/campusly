import { Field, Int, ObjectType } from '@nestjs/graphql';
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
