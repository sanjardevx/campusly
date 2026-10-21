import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '../../enums/attendance.enum';
import { DATE_ONLY } from '../../utils/date';

@InputType()
export class AttendanceMarkInput {
  @Field(() => String)
  @IsUUID()
  studentId: string;

  @Field(() => AttendanceStatus)
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  /** e.g. "Note from parent" */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

/** The whole class at once: students not in `records` are PRESENT */
@InputType()
export class MarkAttendanceInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  /** "YYYY-MM-DD", today or earlier (school timezone) */
  @Field(() => String)
  @Matches(DATE_ONLY, { message: 'date must be like 2026-10-21' })
  date: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  /** Only the exceptions are needed (ABSENT, LATE, EXCUSED), but PRESENT is accepted too */
  @Field(() => [AttendanceMarkInput])
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((r: AttendanceMarkInput) => r.studentId, {
    message: 'each student only once',
  })
  @ValidateNested({ each: true })
  @Type(() => AttendanceMarkInput)
  records: AttendanceMarkInput[];
}
