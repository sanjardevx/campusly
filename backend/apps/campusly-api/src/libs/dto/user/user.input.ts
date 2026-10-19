import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ParentRelation } from '../../enums/user.enum';

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword: string;

  /** DECISIONS §6: new passwords are 8–128 characters */
  @Field(() => String)
  @IsString()
  @Length(8, 128)
  newPassword: string;
}

/** A parent to create, or to find by phone and link (one parent account for all children) */
@InputType()
export class ParentInput {
  /** Any common format: "+998 90 111-22-33", "901112233" (normalized in the service) */
  @Field(() => String)
  @IsString()
  @Length(9, 20)
  phone: string;

  @Field(() => String)
  @IsString()
  @Length(2, 50)
  firstName: string;

  @Field(() => String)
  @IsString()
  @Length(2, 50)
  lastName: string;

  @Field(() => ParentRelation)
  @IsEnum(ParentRelation)
  relation: ParentRelation;
}

@InputType()
export class CreateStudentInput {
  @Field(() => String)
  @IsString()
  @Length(2, 50)
  firstName: string;

  @Field(() => String)
  @IsString()
  @Length(2, 50)
  lastName: string;

  /** The class (e.g. 9A of the current year) */
  @Field(() => String)
  @IsUUID()
  groupId: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  /** Defaults to the current year */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  admissionYear?: number;

  @Field(() => ParentInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInput)
  parent?: ParentInput;
}

@InputType()
export class CreateTeacherInput {
  @Field(() => String)
  @IsString()
  @Length(2, 50)
  firstName: string;

  @Field(() => String)
  @IsString()
  @Length(2, 50)
  lastName: string;

  /** e.g. "Mathematics" */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}
