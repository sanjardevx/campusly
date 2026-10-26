import { IsString, Length, Matches } from 'class-validator';

/** Body of POST /auth/reset-password: the one-time token from the bot's link + the new password */
export class ResetPasswordInput {
  @IsString()
  @Matches(/^[\w-]{20,64}$/, { message: 'token has a wrong format' })
  token: string;

  /** DECISIONS §6: new passwords are 8–128 characters */
  @IsString()
  @Length(8, 128)
  newPassword: string;
}
