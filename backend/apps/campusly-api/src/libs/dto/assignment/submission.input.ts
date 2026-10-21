import { Field, Float, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_SUBMISSION_FILES } from '../../config';

@InputType()
export class SubmitAssignmentInput {
  @Field(() => String)
  @IsUUID()
  assignmentId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  text?: string;

  /** Files uploaded with createSubmissionUpload for this assignment (READY) */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_SUBMISSION_FILES)
  assetIds?: string[];
}

@InputType()
export class AddSubmissionCommentInput {
  @Field(() => String)
  @IsUUID()
  submissionId: string;

  @Field(() => String)
  @IsString()
  @Length(1, 2_000)
  body: string;
}

/** Grade one student (also an offline EXAM or work handed in on paper) */
@InputType()
export class GradeSubmissionInput {
  @Field(() => String)
  @IsUUID()
  assignmentId: string;

  @Field(() => String)
  @IsUUID()
  studentId: string;

  /** 0 … the assignment's maxScore, up to 2 decimals (checked in the service) */
  @Field(() => Float)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  feedback?: string;
}

/** "Please redo": the student gets one more attempt */
@InputType()
export class ReturnSubmissionInput {
  @Field(() => String)
  @IsUUID()
  assignmentId: string;

  @Field(() => String)
  @IsUUID()
  studentId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  feedback?: string;
}

@InputType()
export class PublishGradesInput {
  @Field(() => String)
  @IsUUID()
  assignmentId: string;

  /** false hides the grades again (a mistake) */
  @Field(() => Boolean)
  @IsBoolean()
  publish: boolean;
}
