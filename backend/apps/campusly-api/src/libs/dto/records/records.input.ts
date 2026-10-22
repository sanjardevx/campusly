import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { RecordFormat, RecordReport } from '../../enums/records.enum';

/** "The admin downloaded / printed this document": the file itself is built in the browser */
@InputType()
export class RecordExportInput {
  @Field(() => RecordReport)
  @IsEnum(RecordReport)
  report: RecordReport;

  @Field(() => RecordFormat)
  @IsEnum(RecordFormat)
  format: RecordFormat;

  /** The class (STUDENTS), course (GRADES, ATTENDANCE) or student (REPORT_CARD); none = everyone */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  /** What the admin chose, for the activity log: e.g. "Q1" or "2026-09-01 – 2026-10-22" */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(100)
  scope?: string;
}
