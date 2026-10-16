import { registerEnumType } from '@nestjs/graphql';

export enum Role {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

registerEnumType(Role, {
  name: 'Role',
});

// No hard deletes: a user is blocked or archived, never removed
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  ARCHIVED = 'ARCHIVED',
}

registerEnumType(UserStatus, {
  name: 'UserStatus',
});
