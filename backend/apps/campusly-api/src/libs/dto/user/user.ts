import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  ImportIssueCode,
  ImportRowStatus,
  ParentRelation,
  PasswordState,
  Role,
  UserStatus,
} from '../../enums/user.enum';

/** What a user may see about themselves. No password or temp-password fields (they are omitted globally). */
@ObjectType()
export class User {
  @Field(() => String)
  id: string;

  @Field(() => String)
  loginId: string;

  @Field(() => Role)
  role: Role;

  @Field(() => UserStatus)
  status: UserStatus;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String)
  locale: string;

  /** true → the frontend shows only the "Set a new password" screen */
  @Field(() => Boolean)
  mustChangePassword: boolean;

  @Field(() => Date)
  createdAt: Date;
}

/** Result of changePassword: a fresh access token without the `pwc` flag */
@ObjectType()
export class AccessToken {
  @Field(() => String)
  accessToken: string;
}

/**
 * What the admin prints and hands out. tempPassword is shown ONLY in this response:
 * the DB keeps just the hash. null = an existing parent who keeps their own password.
 */
@ObjectType()
export class LoginSlip {
  @Field(() => String)
  userId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => Role)
  role: Role;

  @Field(() => String)
  fullName: string;

  @Field(() => String, { nullable: true })
  tempPassword: string | null;

  /** false = an existing account was linked, not created */
  @Field(() => Boolean)
  isNew: boolean;
}

@ObjectType()
export class CreateStudentResult {
  @Field(() => LoginSlip)
  student: LoginSlip;

  @Field(() => LoginSlip, { nullable: true })
  parent: LoginSlip | null;
}

/** A parent of a student, or a child of a parent (active links only) */
@ObjectType()
export class LinkedUser {
  @Field(() => String)
  id: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  fullName: string;

  @Field(() => ParentRelation)
  relation: ParentRelation;
}

/** One row of the admin Users page */
@ObjectType()
export class UserListItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  loginId: string;

  @Field(() => Role)
  role: Role;

  @Field(() => UserStatus)
  status: UserStatus;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => PasswordState)
  passwordState: PasswordState;

  /** Only for TEMPORARY: "Temporary · 2 sign-ins left" */
  @Field(() => Int, { nullable: true })
  tempPasswordUsesLeft: number | null;

  /** Latest sign-in or token refresh */
  @Field(() => Date, { nullable: true })
  lastActiveAt: Date | null;

  /** Students: current class, e.g. "9A" */
  @Field(() => String, { nullable: true })
  className: string | null;

  /** Teachers: e.g. "Mathematics" */
  @Field(() => String, { nullable: true })
  title: string | null;

  /** Parents: +998... */
  @Field(() => String, { nullable: true })
  phone: string | null;

  /** Students → their parents; parents → their children */
  @Field(() => [LinkedUser])
  links: LinkedUser[];

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class TotalCounter {
  @Field(() => Int)
  total: number;
}

/** The shape of every list result: { list, metaCounter } */
@ObjectType()
export class Users {
  @Field(() => [UserListItem])
  list: UserListItem[];

  @Field(() => TotalCounter)
  metaCounter: TotalCounter;
}

// ───────────────────────────── CSV import ─────────────────────────────

/** One problem of a CSV row: what (code) and the value that caused it */
@ObjectType()
export class ImportIssue {
  @Field(() => ImportIssueCode)
  code: ImportIssueCode;

  @Field(() => String, { nullable: true })
  value: string | null;
}

@ObjectType()
export class ImportRowPreview {
  /** Line in the file (header = 1) */
  @Field(() => Int)
  line: number;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String)
  className: string;

  @Field(() => Int, { nullable: true })
  admissionYear: number | null;

  @Field(() => String, { nullable: true })
  parentName: string | null;

  @Field(() => String, { nullable: true })
  parentPhone: string | null;

  @Field(() => ImportRowStatus)
  status: ImportRowStatus;

  @Field(() => [ImportIssue])
  errors: ImportIssue[];

  /**
   * The login ID this row would get if imported now (Stitch "Student ID (preview)"). Not reserved:
   * if someone adds a student in between, the real IDs move up. Null for rows with errors.
   */
  @Field(() => String, { nullable: true })
  loginIdPreview: string | null;
}

@ObjectType()
export class ImportSummary {
  @Field(() => Int)
  ready: number;

  @Field(() => Int)
  linkParent: number;

  @Field(() => Int)
  errors: number;
}

@ObjectType()
export class ImportPreview {
  @Field(() => [ImportRowPreview])
  rows: ImportRowPreview[];

  @Field(() => ImportSummary)
  summary: ImportSummary;
}

@ObjectType()
export class ImportResult {
  @Field(() => Int)
  created: number;

  /** Students linked to a parent who already had an account */
  @Field(() => Int)
  linkedParents: number;

  /** Rows with errors left out (only with skipErrors) */
  @Field(() => Int)
  skipped: number;

  /** Login slips to print: shown only in this response */
  @Field(() => [CreateStudentResult])
  slips: CreateStudentResult[];
}
