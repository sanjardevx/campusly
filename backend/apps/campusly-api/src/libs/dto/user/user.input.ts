import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
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
import { MAX_PAGE_SIZE, USER_SORTS } from '../../config';
import { Direction } from '../../enums/common.enum';
import {
  ParentRelation,
  PasswordState,
  Role,
  UserStatus,
} from '../../enums/user.enum';

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

@InputType()
export class UsersSearch {
  /** Students / Teachers / Parents tab */
  @Field(() => Role)
  @IsEnum(Role)
  role: Role;

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  /** Students of one class */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @Field(() => PasswordState, { nullable: true })
  @IsOptional()
  @IsEnum(PasswordState)
  passwordState?: PasswordState;

  /** Name, login ID or (parents) phone. Plain text, never turned into a regex (Nestar did) */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  text?: string;
}

/** Same shape as Nestar's *Inquiry inputs: page + limit + sort + direction + search */
@InputType()
export class UsersInquiry {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(USER_SORTS)
  sort?: (typeof USER_SORTS)[number];

  @Field(() => Direction, { nullable: true })
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;

  @Field(() => UsersSearch)
  @ValidateNested()
  @Type(() => UsersSearch)
  search: UsersSearch;
}
