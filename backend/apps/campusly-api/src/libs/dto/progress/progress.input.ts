import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Sent by the video player every ~20 s (and on pause / end) */
@InputType()
export class LessonProgressInput {
  @Field(() => String)
  @IsUUID()
  lessonId: string;

  /** Current player position in seconds */
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(6 * 60 * 60)
  positionSec: number;

  /** The player's video length: used only when the upload did not store one */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(6 * 60 * 60)
  durationSec?: number;
}
