import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { CompletionType, LessonType } from '../../enums/course.enum';
import { DATE_ONLY } from '../../utils/date';

const DATE_MESSAGE = { message: '$property must be a date like 2026-09-02' };

@InputType()
export class CreateModuleInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  /** e.g. "Week 3: Quadratic equations" */
  @Field(() => String)
  @IsString()
  @Length(1, 120)
  title: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, DATE_MESSAGE)
  startsAt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, DATE_MESSAGE)
  endsAt?: string;
}

@InputType()
export class UpdateModuleInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, DATE_MESSAGE)
  startsAt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, DATE_MESSAGE)
  endsAt?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

@InputType()
export class CreateLessonInput {
  @Field(() => String)
  @IsUUID()
  moduleId: string;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  title: string;

  @Field(() => LessonType)
  @IsEnum(LessonType)
  type: LessonType;

  /** READING: the text (Markdown); LINK: an http(s) URL */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  body?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  /** Default: VIDEO_WATCHED for a video, VIEW for the rest */
  @Field(() => CompletionType, { nullable: true })
  @IsOptional()
  @IsEnum(CompletionType)
  completionType?: CompletionType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  tutorNotes?: string;
}

/** The type is fixed after creation */
@InputType()
export class UpdateLessonInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  body?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;

  @Field(() => CompletionType, { nullable: true })
  @IsOptional()
  @IsEnum(CompletionType)
  completionType?: CompletionType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  tutorNotes?: string;
}

/** For a module or a lesson */
@InputType()
export class PublishInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  /** false → back to draft */
  @Field(() => Boolean)
  @IsBoolean()
  publish: boolean;

  /** Schedule for later; default: now */
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishAt?: Date;
}

/** The new order of all modules of a course, or all lessons of a module */
@InputType()
export class ReorderInput {
  /** courseId (modules) or moduleId (lessons) */
  @Field(() => String)
  @IsUUID()
  parentId: string;

  @Field(() => [String])
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  ids: string[];
}
