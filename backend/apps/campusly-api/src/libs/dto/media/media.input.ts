import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
} from 'class-validator';
import { MediaKind } from '../../enums/media.enum';

/** Allowed types and sizes per kind: UPLOAD_RULES in libs/config.ts (checked in the service) */
@InputType()
export class CreateUploadInput {
  /** The course the file belongs to (lesson video or lesson file) */
  @Field(() => String)
  @IsUUID()
  courseId: string;

  @Field(() => MediaKind)
  @IsEnum(MediaKind)
  kind: MediaKind;

  @Field(() => String)
  @IsString()
  @Length(1, 255)
  fileName: string;

  @Field(() => String)
  @IsString()
  @Length(3, 120)
  mimeType: string;

  /** Bytes */
  @Field(() => Float)
  @IsInt()
  @IsPositive()
  size: number;

  /**
   * VIDEO: length in seconds, read by the teacher's browser before the upload. The 90% rule uses
   * this value, never the one a student's player reports.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(6 * 60 * 60)
  durationSec?: number;
}
