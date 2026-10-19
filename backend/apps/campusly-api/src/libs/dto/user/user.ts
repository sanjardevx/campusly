import { Field, ObjectType } from '@nestjs/graphql';
import { Role, UserStatus } from '../../enums/user.enum';

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
