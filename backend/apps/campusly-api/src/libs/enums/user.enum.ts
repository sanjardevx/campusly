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
