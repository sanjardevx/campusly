import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { RecordStatus } from '../../enums/course.enum';

/** "9A", "10B", "E2E-1": letters, digits and dashes */
const CLASS_NAME = /^[\p{L}\d-]+$/u;

@InputType()
export class CreateGroupInput {
  @Field(() => String)
  @IsUUID()
  academicYearId: string;

  /** Saved in upper case: "9a" → "9A" */
  @Field(() => String)
  @IsString()
  @Length(1, 20)
  @Matches(CLASS_NAME, { message: 'name may contain letters, digits and "-"' })
  name: string;
}

@InputType()
export class UpdateGroupInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Matches(CLASS_NAME, { message: 'name may contain letters, digits and "-"' })
  name?: string;

  /** ARCHIVED only when the class has no students */
  @Field(() => RecordStatus, { nullable: true })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}

@InputType()
export class MoveStudentInput {
  @Field(() => String)
  @IsUUID()
  studentId: string;

  /** The new class */
  @Field(() => String)
  @IsUUID()
  groupId: string;
}
