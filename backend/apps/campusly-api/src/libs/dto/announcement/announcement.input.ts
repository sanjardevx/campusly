import { Field, InputType, Int } from '@nestjs/graphql';
import {
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
import { MAX_PAGE_SIZE } from '../../config';
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
}

@InputType()
export class AnnouncementsInquiry {
  /** Only one course (the course page); missing = everything the viewer may see */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  courseId?: string;

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
