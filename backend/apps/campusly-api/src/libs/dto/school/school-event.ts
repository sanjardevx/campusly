import { Field, ObjectType } from '@nestjs/graphql';
import { RecordStatus } from '../../enums/course.enum';
import { SchoolEventKind } from '../../enums/school.enum';

/** A school calendar entry (holiday, event, deadline, start) */
@ObjectType()
export class SchoolEvent {
  @Field(() => String)
  id: string;

  @Field(() => SchoolEventKind)
  kind: SchoolEventKind;

  @Field(() => String)
  title: string;

  /** "YYYY-MM-DD" */
  @Field(() => String)
  startsOn: string;

  /** "YYYY-MM-DD"; the same as startsOn for a one-day event */
  @Field(() => String)
  endsOn: string;

  @Field(() => String, { nullable: true })
  note: string | null;

  @Field(() => RecordStatus)
  status: RecordStatus;
}
