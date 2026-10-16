import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Health {
  @Field(() => String)
  status: 'ok' | 'degraded';

  @Field(() => Boolean)
  postgres: boolean;

  @Field(() => Boolean)
  redis: boolean;
}
