import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { SchoolEventKind } from '../../enums/school.enum';
import { DATE_ONLY } from '../../utils/date';

@InputType()
export class CreateSchoolEventInput {
  @Field(() => SchoolEventKind)
  @IsEnum(SchoolEventKind)
  kind: SchoolEventKind;

  @Field(() => String)
  @IsString()
  @Length(2, 120)
  title: string;

  @Field(() => String)
  @Matches(DATE_ONLY, { message: 'startsOn must be like 2026-12-31' })
  startsOn: string;

  /** Empty = a one-day event */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'endsOn must be like 2026-12-31' })
  endsOn?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

/** Every field but the id is optional: only what changed is sent */
@InputType()
export class UpdateSchoolEventInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => SchoolEventKind, { nullable: true })
  @IsOptional()
  @IsEnum(SchoolEventKind)
  kind?: SchoolEventKind;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'startsOn must be like 2026-12-31' })
  startsOn?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'endsOn must be like 2026-12-31' })
  endsOn?: string;

  /** "" clears the note */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
