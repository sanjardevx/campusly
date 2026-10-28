import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MAX_PAGE_SIZE } from '../../config';
import { QuestionTab } from '../../enums/question.enum';

@InputType()
export class AskQuestionInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  @Field(() => String)
  @IsString()
  @Length(3, 150)
  title: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 5_000)
  body?: string;

  /** "About": one lesson or one assignment of this course (not both), or neither */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  /** Only the author and the course's teachers see it */
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

@InputType()
export class AnswerQuestionInput {
  @Field(() => String)
  @IsUUID()
  questionId: string;

  @Field(() => String)
  @IsString()
  @Length(1, 5_000)
  body: string;

  /** Teachers: "Mark as resolved after posting" */
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  resolve?: boolean;
}

@InputType()
export class CourseQuestionsInquiry {
  /** One course (the student's course page); missing = every course the viewer may see */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @Field(() => QuestionTab, { nullable: true })
  @IsOptional()
  @IsEnum(QuestionTab)
  tab?: QuestionTab;

  /** Title or details contain these words (case does not matter) */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}
