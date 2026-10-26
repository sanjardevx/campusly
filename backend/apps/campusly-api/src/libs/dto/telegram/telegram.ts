import { Field, ObjectType } from '@nestjs/graphql';

/** "Connect Telegram" card: is the bot set up, and is this account connected */
@ObjectType()
export class TelegramStatus {
  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Boolean)
  linked: boolean;

  /** e.g. "campuslyreset_bot" (null when the bot is off) */
  @Field(() => String, { nullable: true })
  botUsername: string | null;
}

/** A t.me deep link with a one-time code: opening it in Telegram connects this account */
@ObjectType()
export class TelegramLink {
  @Field(() => String)
  url: string;

  @Field(() => Date)
  expiresAt: Date;
}
