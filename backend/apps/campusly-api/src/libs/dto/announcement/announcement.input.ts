import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MAX_ANNOUNCEMENT_FILES, MAX_PAGE_SIZE } from '../../config';
import { DATE_ONLY } from '../../utils/date';

const DATE_MESSAGE = { message: '$property must be a date like 2026-10-24' };

@InputType()
export class CreateAnnouncementInput {
  /** null / missing = school-wide (admin only) */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @Field(() => String)
  @IsString()
  @Length(2, 150)
  title: string;

  @Field(() => String)
  @IsString()
  @Length(1, 10_000)
  body: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, DATE_MESSAGE)
  eventDate?: string;
}

/** The teacher's drawer: the same announcement to one or more of their courses (one row each) */
@InputType()
export class CreateCourseAnnouncementsInput {
  @Field(() => [String])
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  courseIds: string[];

  @Field(() => String)
  @IsString()
  @Length(2, 150)
  title: string;

  @Field(() => String)
  @IsString()
  @Length(1, 10_000)
  body: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  /** READY documents or images the author uploaded for one of these courses */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_ANNOUNCEMENT_FILES)
  fileAssetIds?: string[];
}

/** The course (or school-wide) cannot change after creation */
@InputType()
export class UpdateAnnouncementInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 10_000)
  body?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, DATE_MESSAGE)
  eventDate?: string;

  /** The whole list of attachments, in order (a file left out is removed) */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_ANNOUNCEMENT_FILES)
  fileAssetIds?: string[];
}

@InputType()
export class AnnouncementsInquiry {
  /** Title or text contains these words (case does not matter) */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  /** Only one course (the course page); missing = everything the viewer may see */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  /** Parent: one child's view (school-wide + that child's courses); checked with resolveStudentScope */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  /** The "Unread" tab: only what the viewer has not opened yet */
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  /** The "School" tab: only school-wide announcements */
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  schoolOnly?: boolean;

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
