import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { AttendanceStatus } from '../../enums/attendance.enum';

/** One student on the teacher's attendance screen */
@ObjectType()
export class AttendanceRow {
  @Field(() => String)
  studentId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  /** PRESENT until the teacher marks something else */
  @Field(() => AttendanceStatus)
  status: AttendanceStatus;

  @Field(() => String, { nullable: true })
  note: string | null;
}

/** A course on one day: the class session and the whole roster */
@ObjectType()
export class CourseAttendance {
  @Field(() => String)
  courseId: string;

  /** "YYYY-MM-DD" */
  @Field(() => String)
  date: string;

  /** false = not taken yet for this day (everyone shows as PRESENT by default) */
  @Field(() => Boolean)
  isMarked: boolean;

  @Field(() => String, { nullable: true })
  lessonId: string | null;

  /** Active students, by name */
  @Field(() => [AttendanceRow])
  rows: AttendanceRow[];
}

@ObjectType()
export class AttendanceSummary {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  present: number;

  @Field(() => Int)
  late: number;

  @Field(() => Int)
  absent: number;

  @Field(() => Int)
  excused: number;

  /** (present + late + excused) / total, in %; null = no sessions yet */
  @Field(() => Float, { nullable: true })
  rate: number | null;
}

@ObjectType()
export class AttendanceEntry {
  /** "YYYY-MM-DD" */
  @Field(() => String)
  date: string;

  @Field(() => AttendanceStatus)
  status: AttendanceStatus;

  @Field(() => String, { nullable: true })
  note: string | null;
}

/** One student's attendance in one course (newest first) */
@ObjectType()
export class StudentAttendance {
  @Field(() => String)
  studentId: string;

  @Field(() => String)
  courseId: string;

  @Field(() => AttendanceSummary)
  summary: AttendanceSummary;

  @Field(() => [AttendanceEntry])
  entries: AttendanceEntry[];
}

/** One student's line in the journal: one status per date of `AttendanceJournal.dates` */
@ObjectType()
export class AttendanceJournalRow {
  @Field(() => String)
  studentId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  /** Same order as `dates`; a student without a record that day is PRESENT */
  @Field(() => [AttendanceStatus])
  statuses: AttendanceStatus[];
}

/** A course over a date range (Records page): the days attendance was taken × the active roster */
@ObjectType()
export class AttendanceJournal {
  @Field(() => String)
  courseId: string;

  /** "YYYY-MM-DD", oldest first; only days with a class session */
  @Field(() => [String])
  dates: string[];

  @Field(() => [AttendanceJournalRow])
  rows: AttendanceJournalRow[];
}
