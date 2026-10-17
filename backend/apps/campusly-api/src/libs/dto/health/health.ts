import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Health {
  @Field(() => String)
  status: 'ok' | 'degraded';

  @Field(() => Boolean)
  postgres: boolean;

  @Field(() => Boolean)
  redis: boolean;

  /** Latest applied Prisma migration, e.g. "20261016143736_init" (null if none or DB down) */
  @Field(() => String, { nullable: true })
  migration: string | null;
}
