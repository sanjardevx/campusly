import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
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
