import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
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
import { QUIZ_MAX_OPTIONS, QUIZ_MAX_QUESTIONS } from '../../config';
import { QuizQuestionType } from '../../enums/quiz.enum';

/** One question as the teacher writes it (the per-type rules are checked in QuizService) */
@InputType()
export class QuizQuestionInput {
  @Field(() => QuizQuestionType)
  @IsEnum(QuizQuestionType)
  type: QuizQuestionType;

  @Field(() => String)
  @IsString()
  @Length(1, 2_000)
  text: string;

  @Field(() => Float)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(100)
  points: number;

  /** MULTIPLE_CHOICE: 2–6 answers */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(QUIZ_MAX_OPTIONS)
  @IsString({ each: true })
  @Length(1, 300, { each: true })
  options?: string[];

  /** MULTIPLE_CHOICE: index of the right answer; TRUE_FALSE: 1 = true, 0 = false */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(QUIZ_MAX_OPTIONS - 1)
  correctOption?: number;

  /** NUMBER: the right value */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(-1e9)
  @Max(1e9)
  correctNumber?: number;

  /** NUMBER: the allowed difference (0 or empty = exact) */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1e9)
  tolerance?: number;
}

/** The whole question list, in order (allowed only until a student starts) */
@InputType()
export class SetQuizQuestionsInput {
  @Field(() => String)
  @IsUUID()
  assignmentId: string;

  @Field(() => [QuizQuestionInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(QUIZ_MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionInput)
  questions: QuizQuestionInput[];
}

/** One answer, saved at once (the student's own attempt; refused after the deadline) */
@InputType()
export class SaveQuizAnswerInput {
  @Field(() => String)
  @IsUUID()
  assignmentId: string;

  @Field(() => String)
  @IsUUID()
  questionId: string;

  /** MULTIPLE_CHOICE: the position of the answer as shown to this student; TRUE_FALSE: 1 / 0 */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(QUIZ_MAX_OPTIONS - 1)
  choice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(-1e9)
  @Max(1e9)
  number?: number;
}
