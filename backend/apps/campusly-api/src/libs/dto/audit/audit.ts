import { Field, ObjectType } from '@nestjs/graphql';
import { Role } from '../../enums/user.enum';
import { TotalCounter } from '../user/user';

/** One changed field: the value before and after, as short text (null = no value) */
@ObjectType()
export class AuditChange {
  @Field(() => String)
  field: string;

  @Field(() => String, { nullable: true })
  before: string | null;

  @Field(() => String, { nullable: true })
  after: string | null;
}

/** Who did it */
@ObjectType()
export class AuditActor {
  @Field(() => String)
  id: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => Role)
  role: Role;
}

@ObjectType()
export class AuditLogItem {
  @Field(() => String)
  id: string;

  /** "<entity>.<verb>", e.g. "user.block" — the frontend turns it into words */
  @Field(() => String)
  action: string;

  /** Model name, e.g. "User", "Course" */
  @Field(() => String)
  entityType: string;

  @Field(() => String, { nullable: true })
  entityId: string | null;

  /** A readable name of the changed record, taken from its saved snapshot ("Aziz Karimov", "9A") */
  @Field(() => String, { nullable: true })
  target: string | null;

  /** null = the system or a batch job */
  @Field(() => AuditActor, { nullable: true })
  actor: AuditActor | null;

  /** Only the fields that changed (a create shows what was set) */
  @Field(() => [AuditChange])
  changes: AuditChange[];

  @Field(() => Date)
  createdAt: Date;
}

/** Same shape as the other lists: { list, metaCounter } */
@ObjectType()
export class AuditLogs {
  @Field(() => [AuditLogItem])
  list: AuditLogItem[];

  @Field(() => TotalCounter)
  metaCounter: TotalCounter;
}
