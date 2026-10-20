import { Field, Int, ObjectType } from '@nestjs/graphql';
import { RecordStatus } from '../../enums/course.enum';

/** A class of one academic year, e.g. 9A of 2026–27 */
@ObjectType()
export class Group {
  @Field(() => String)
  id: string;

  @Field(() => String)
  academicYearId: string;

  @Field(() => String)
  name: string;

  @Field(() => RecordStatus)
  status: RecordStatus;

  /** Students in the class now (members who left are not counted) */
  @Field(() => Int)
  studentCount: number;
}
