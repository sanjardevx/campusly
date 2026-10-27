import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
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
  ValidateNested,
} from 'class-validator';
import {
  EnquiryStatus,
  SiteCourseCategory,
  SiteHonorResult,
  SiteLocale,
  SiteMockExam,
  SitePostType,
  SiteProgramCategory,
  SitePublishMode,
} from '../../enums/site.enum';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const SITE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export const ENQUIRY_INTERESTS = [
  'STANDARD',
  'STEM',
  'KOREAN',
  'IELTS',
] as const;

/**
 * Text in the four site languages. Only English is required; the field's own limit (title 150,
 * summary 160 …) is checked in the service, the generous limit here only stops huge payloads.
 */
@InputType()
export class LocalizedTextInput {
  @Field(() => String)
  @IsString()
  @MaxLength(20_000)
  en: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  uz?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  ru?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  ko?: string;
}

/** Create (no id) or edit a news post / event */
@InputType()
export class SaveSitePostInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => SitePostType)
  @IsEnum(SitePostType)
  type: SitePostType;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  title: LocalizedTextInput;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  summary: LocalizedTextInput;

  @Field(() => LocalizedTextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  body?: LocalizedTextInput;

  /** A READY image uploaded with createSiteUpload; null = keep, removeCover = drop it */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  coverAssetId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  removeCover?: boolean;

  /** EVENT only: "YYYY-MM-DD", "HH:MM", "HH:MM", place */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  eventDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(TIME)
  startTime?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(TIME)
  endTime?: string;

  @Field(() => LocalizedTextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  place?: LocalizedTextInput;

  /** null = not in the home page slider; 1–5 = its place in the slider */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  carouselPosition?: number;

  @Field(() => SitePublishMode)
  @IsEnum(SitePublishMode)
  publish: SitePublishMode;

  /** SCHEDULE: when it appears on the site (ISO instant) */
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  scheduledAt?: Date;
}

@InputType()
export class SaveSiteProgramInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => SiteProgramCategory)
  @IsEnum(SiteProgramCategory)
  category: SiteProgramCategory;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  name: LocalizedTextInput;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(11)
  gradeFrom: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(11)
  gradeTo: number;

  @Field(() => LocalizedTextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  levelNote?: LocalizedTextInput;

  @Field(() => [String])
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(SITE_DAYS, { each: true })
  days: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(TIME)
  startTime?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(TIME)
  endTime?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  room?: string;

  /** Up to two people from "Our team" */
  @Field(() => [String])
  @IsArray()
  @ArrayMaxSize(2)
  @IsUUID('all', { each: true })
  teacherIds: string[];

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  description: LocalizedTextInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  photoAssetId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  removePhoto?: boolean;

  /** Instead of a photo: a YouTube link ("" = none) */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  videoUrl?: string;

  @Field(() => Boolean)
  @IsBoolean()
  showOnSite: boolean;
}

@InputType()
export class SaveSitePersonInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 60)
  firstName: string;

  @Field(() => String)
  @IsString()
  @Length(1, 60)
  lastName: string;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  role: LocalizedTextInput;

  @Field(() => LocalizedTextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  note?: LocalizedTextInput;

  @Field(() => Boolean)
  @IsBoolean()
  isDirector: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  photoAssetId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  removePhoto?: boolean;

  @Field(() => Boolean)
  @IsBoolean()
  showOnSite: boolean;
}

/** Create (no id) or edit a mock test (Stitch "Edit mock test" drawer) */
@InputType()
export class SaveSiteMockTestInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => SiteMockExam)
  @IsEnum(SiteMockExam)
  exam: SiteMockExam;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  title: LocalizedTextInput;

  /** "What's included" (≤ 100) */
  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  included: LocalizedTextInput;

  /** "YYYY-MM-DD" */
  @Field(() => String)
  @IsDateString({ strict: true })
  examDate: string;

  @Field(() => String)
  @Matches(TIME)
  startTime: string;

  @Field(() => Int)
  @IsInt()
  @Min(15)
  @Max(600)
  durationMin: number;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  location: LocalizedTextInput;

  /** UZS */
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(1000)
  totalSeats: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(1000)
  takenSeats: number;

  /** A person from "Our team"; null = nobody named */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  contactPersonId?: string;

  /** "Use a different phone"; empty = the school phone */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @Field(() => Boolean)
  @IsBoolean()
  showOnSite: boolean;
}

/** One video of an open course: a YouTube link, its title and (optional) length "8:42" */
@InputType()
export class SiteOpenLessonInput {
  @Field(() => String)
  @IsString()
  @Length(1, 150)
  title: string;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  youtubeUrl: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^(\d{1,2}:)?\d{1,2}:\d{2}$/)
  duration?: string;
}

/** Create (no id) or edit an open course with its full lesson list, in order */
@InputType()
export class SaveSiteOpenCourseInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => SiteCourseCategory)
  @IsEnum(SiteCourseCategory)
  category: SiteCourseCategory;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  title: LocalizedTextInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  @Field(() => LocalizedTextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  description?: LocalizedTextInput;

  @Field(() => [SiteOpenLessonInput])
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SiteOpenLessonInput)
  lessons: SiteOpenLessonInput[];

  /** "Publish course" = true, "Save draft" = false */
  @Field(() => Boolean)
  @IsBoolean()
  publish: boolean;
}

/** Create (no id) or edit an honor student (Stitch "Add honor student" drawer) */
@InputType()
export class SaveSiteHonorStudentInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsUUID()
  studentId: string;

  @Field(() => SiteHonorResult)
  @IsEnum(SiteHonorResult)
  resultType: SiteHonorResult;

  /** MEDAL: 1, 2 or 3 */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  place?: number;

  /** EXAM_SCORE: "IELTS 8.0" */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  score?: string;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  subject: LocalizedTextInput;

  @Field(() => LocalizedTextInput)
  @ValidateNested()
  @Type(() => LocalizedTextInput)
  competition: LocalizedTextInput;

  /** "YYYY-MM-DD" */
  @Field(() => String)
  @IsDateString({ strict: true })
  achievedOn: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  photoAssetId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  removePhoto?: boolean;

  @Field(() => Boolean)
  @IsBoolean()
  parentConsent: boolean;

  @Field(() => Boolean)
  @IsBoolean()
  showOnSite: boolean;
}

/** The public "Questions about admission or a program?" form */
@InputType()
export class SubmitEnquiryInput {
  @Field(() => String)
  @IsString()
  @Length(2, 100)
  parentName: string;

  /** Any Uzbek mobile shape: "90 123 45 67", "+998901234567" */
  @Field(() => String)
  @IsString()
  @Length(9, 20)
  phone: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  childGrade?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(ENQUIRY_INTERESTS)
  interest?: string;

  @Field(() => SiteLocale)
  @IsEnum(SiteLocale)
  locale: SiteLocale;

  /** Honeypot: hidden from people, filled by bots. Anything here = silently dropped */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

@InputType()
export class EnquiriesInput {
  @Field(() => EnquiryStatus, { nullable: true })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  /** Name or phone */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** "Translate from English": the English texts of one form, in order */
@InputType()
export class TranslateSiteTextInput {
  @Field(() => [String])
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(5_000, { each: true })
  texts: string[];
}
