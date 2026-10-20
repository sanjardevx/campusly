import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  Length,
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
}
