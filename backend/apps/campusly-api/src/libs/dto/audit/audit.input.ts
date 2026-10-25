import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../config';
import { AuditAction } from '../../enums/audit.enum';

const ACTIONS = Object.values(AuditAction);

/** Admin Activity log: newest first, one page at a time */
@InputType()
export class AuditLogsInquiry {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number;

  /** One action, e.g. "user.block"; none = every action */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(ACTIONS)
  action?: AuditAction;

  /** Only what this person did ("show only Nilufar's changes") */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  actorId?: string;
}
