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
import { LOCALES } from '../../config';
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
