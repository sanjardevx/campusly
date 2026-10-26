import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LOCALES, TEMP_PASSWORD_LIMITS } from '../../config';
import { RecordStatus } from '../../enums/course.enum';
import { PeriodKind } from '../../enums/school.enum';
import { DATE_ONLY } from '../../utils/date';

const DATE_MESSAGE = { message: '$property must be a date like 2026-09-02' };

/** Every field is optional: only the given ones change. Cross-field rules are checked in the service. */
@InputType()
export class UpdateSchoolSettingsInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  schoolName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(LOCALES)
  defaultLocale?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  mark5MinPercent?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  mark4MinPercent?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  mark3MinPercent?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  defaultHomeworkWeight?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  defaultQuizWeight?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  defaultExamWeight?: number;

  /** "" clears it. Digits, spaces, +, -, ( ) only */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[+\d\s()-]*$/, {
    message: 'contactPhone may only contain digits, spaces, +, -, ( )',
  })
  contactPhone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  officeHours?: string;

  /** "" clears it; otherwise exactly a Telegram link, so the login page never links elsewhere */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(https:\/\/t\.me\/[A-Za-z0-9_]{5,32})?$/, {
    message: 'telegramUrl must look like https://t.me/name',
  })
  telegramUrl?: string;

  /** "" clears it; Telegram bot usernames end with "bot" */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(https:\/\/t\.me\/[A-Za-z0-9_]{2,29}bot)?$/i, {
    message: 'telegramBotUrl must look like https://t.me/name_bot',
  })
  telegramBotUrl?: string;

  // Public website footer and numbers ("" clears a text field)
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  siteAddress?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  siteMetro?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, {
    message: 'siteEmail must be an email address',
  })
  siteEmail?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^(https:\/\/(www\.)?instagram\.com\/[\w.]+\/?)?$/, {
    message: 'instagramUrl must look like https://instagram.com/name',
  })
  instagramUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^(https:\/\/(www\.)?youtube\.com\/[\w@./-]+)?$/, {
    message: 'youtubeUrl must look like https://youtube.com/@name',
  })
  youtubeUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  foundedYear?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(TEMP_PASSWORD_LIMITS.maxUses)
  tempPasswordUses?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(TEMP_PASSWORD_LIMITS.maxDays)
  tempPasswordDays?: number;
}

@InputType()
export class CreateAcademicYearInput {
  /** e.g. "2027–28" */
  @Field(() => String)
  @IsString()
  @Length(4, 20)
  name: string;

  @Field(() => String)
  @Matches(DATE_ONLY, DATE_MESSAGE)
  startsAt: string;

  @Field(() => String)
  @Matches(DATE_ONLY, DATE_MESSAGE)
  endsAt: string;

  /** Make it the current year right away (the previous current one stops being current) */
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

@InputType()
export class UpdateAcademicYearInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(4, 20)
  name?: string;

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
export class CreatePeriodInput {
  @Field(() => String)
  @IsUUID()
  academicYearId: string;

  /** A quarter inside a semester */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field(() => PeriodKind)
  @IsEnum(PeriodKind)
  kind: PeriodKind;

  /** e.g. "Quarter 2" */
  @Field(() => String)
  @IsString()
  @Length(2, 50)
  name: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(50)
  order: number;

  @Field(() => String)
  @Matches(DATE_ONLY, DATE_MESSAGE)
  startsAt: string;

  @Field(() => String)
  @Matches(DATE_ONLY, DATE_MESSAGE)
  endsAt: string;
}

@InputType()
export class UpdatePeriodInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  order?: number;

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
export class CreateSubjectInput {
  @Field(() => String)
  @IsString()
  @Length(2, 50)
  name: string;
}

@InputType()
export class UpdateSubjectInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @Field(() => RecordStatus, { nullable: true })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
