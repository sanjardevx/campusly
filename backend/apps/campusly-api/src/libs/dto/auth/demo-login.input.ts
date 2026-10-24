import { IsEnum } from 'class-validator';
import { Role } from '../../enums/user.enum';

/** POST /auth/demo: which demo account to open */
export class DemoLoginInput {
  @IsEnum(Role)
  role: Role;
}
