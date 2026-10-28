import { IsIn } from 'class-validator';
import { Role } from '../../enums/user.enum';

/** The roles with a demo account; there is no admin demo (DECISIONS §12, demo v2) */
export const DEMO_ROLES = [Role.STUDENT, Role.TEACHER, Role.PARENT] as const;

/** POST /auth/demo: which demo account to open */
export class DemoLoginInput {
  @IsIn(DEMO_ROLES)
  role: (typeof DEMO_ROLES)[number];
}
