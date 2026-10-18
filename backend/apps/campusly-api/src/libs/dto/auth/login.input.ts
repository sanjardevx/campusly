import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Body of POST /auth/login */
export class LoginInput {
  /** 26100042 (student/teacher), 901234567 (parent) or the admin login */
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  loginId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
