import { registerEnumType } from '@nestjs/graphql';
import {
  ParentRelation,
  Role,
  UserStatus,
} from '../../../../../generated/prisma/enums';

// One source of truth: the enums are defined in prisma/schema.prisma.
// Here they are only registered for GraphQL (Nestar declared them by hand next to the Mongoose schema).
registerEnumType(Role, { name: 'Role' });
// No hard deletes: a user is blocked or archived, never removed
registerEnumType(UserStatus, { name: 'UserStatus' });
registerEnumType(ParentRelation, { name: 'ParentRelation' });

export { ParentRelation, Role, UserStatus };

/** The "Password" column on the admin Users page (computed, not stored) */
export enum PasswordState {
  /** Permanent password set by the user */
  SET = 'SET',
  /** Temporary password, sign-ins left */
  TEMPORARY = 'TEMPORARY',
  /** Temporary password, 14 days passed */
  EXPIRED = 'EXPIRED',
  /** Limit reached: only "Set a new password" is allowed */
  MUST_CHANGE = 'MUST_CHANGE',
}
registerEnumType(PasswordState, { name: 'PasswordState' });

/** CSV import check result of one row (the design's "Check data" step) */
export enum ImportRowStatus {
  READY = 'READY',
  /** The parent already exists (or appears in an earlier row): only a link is created */
  LINK_PARENT = 'LINK_PARENT',
  ERROR = 'ERROR',
}
registerEnumType(ImportRowStatus, { name: 'ImportRowStatus' });
