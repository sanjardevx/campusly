import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

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
