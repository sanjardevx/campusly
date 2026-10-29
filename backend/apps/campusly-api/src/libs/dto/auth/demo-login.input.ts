import { IsIn, IsOptional } from 'class-validator';
import { Role } from '../../enums/user.enum';

/** The roles with a demo account; there is no admin demo (DECISIONS §12, demo v2) */
export const DEMO_ROLES = [Role.STUDENT, Role.TEACHER, Role.PARENT] as const;

/** The classes with a demo student: the nightly reset rewrites only these two */
export const DEMO_STUDENT_CLASSES = ['9A', '11A'] as const;

/** POST /auth/demo: which demo account to open */
export class DemoLoginInput {
  @IsIn(DEMO_ROLES)
  role: (typeof DEMO_ROLES)[number];

  /** Students only: the demo student of this class (none = the first one, 9A) */
  @IsOptional()
  @IsIn(DEMO_STUDENT_CLASSES)
  className?: (typeof DEMO_STUDENT_CLASSES)[number];
}
