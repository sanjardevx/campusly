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
