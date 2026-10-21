import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

@InputType()
export class PublishPeriodGradesInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  @Field(() => String)
  @IsUUID()
  periodId: string;
}

/** A manual grade (e.g. 85.6 → 86). finalScore null removes the override. */
@InputType()
export class SetPeriodFinalScoreInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  /** null = the annual grade */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  periodId?: string | null;

  @Field(() => String)
  @IsUUID()
  studentId: string;

  /** Percent, 0–100, up to 2 decimals */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  finalScore?: number | null;
}
