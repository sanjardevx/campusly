import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SUBMISSION_FILE_TYPES } from '../../config';
import { AssignmentType, TutorMode } from '../../enums/assignment.enum';

/** Fields a teacher may change after creation (the type and course are fixed) */
@InputType()
class AssignmentFields {
  /** Default: the category that matches the type (HOMEWORK → "Homework") */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  instructions?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  allowLate?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsIn(SUBMISSION_FILE_TYPES, { each: true })
  @ArrayUnique()
  @ArrayMaxSize(SUBMISSION_FILE_TYPES.length)
  acceptedFileTypes?: string[];

  @Field(() => TutorMode, { nullable: true })
  @IsOptional()
  @IsEnum(TutorMode)
  tutorMode?: TutorMode;

  /** For the AI tutor's CHECK_ONLY mode; never shown to students */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  finalAnswer?: string;
}

@InputType()
export class CreateAssignmentInput extends AssignmentFields {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  /** EXAM = offline: graded only, never submitted */
  @Field(() => AssignmentType)
  @IsEnum(AssignmentType)
  type: AssignmentType;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  title: string;

  /** Points, up to 2 decimals (e.g. 20 or 7.5) */
  @Field(() => Float)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(1000)
  maxScore: number;
}

@InputType()
export class UpdateAssignmentInput extends AssignmentFields {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  title?: string;

  /** Locked once a submission is graded (18/20 must not turn into 18/10) */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(1000)
  maxScore?: number;
}
