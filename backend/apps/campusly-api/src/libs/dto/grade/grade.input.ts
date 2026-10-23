import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

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

/** One category in the weights modal: an existing one (id) or a new one (no id) */
@InputType()
export class GradeCategoryInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 40)
  name: string;

  /** Percent of the period grade; 0 switches a category off (it is never deleted) */
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  weight: number;
}

/** The course's whole list, in order: every existing category must be in it, weights add up to 100 */
@InputType()
export class SetGradeCategoriesInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  @Field(() => [GradeCategoryInput])
  @ValidateNested({ each: true })
  @Type(() => GradeCategoryInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  categories: GradeCategoryInput[];
}
