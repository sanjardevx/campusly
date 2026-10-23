import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AssignmentType } from '../../enums/assignment.enum';
import { CourseStatus } from '../../enums/course.enum';
import { DeadlineKind } from '../../enums/dashboard.enum';
import { DashboardPeriod } from './dashboard';

/** "Attendance today": one of the teacher's active courses and today's session (no timetable) */
@ObjectType()
export class TodayCourse {
  @Field(() => String)
  courseId: string;

  @Field(() => String)
  title: string;

  /** Active students of the course */
  @Field(() => Int)
  students: number;

  /** Marks in today's session (0 = not taken yet) */
  @Field(() => Int)
  marked: number;
}

/** "Needs grading": an assignment with work to grade or scores waiting to be published */
@ObjectType()
export class GradingItem {
  @Field(() => String)
  assignmentId: string;

  @Field(() => String)
  courseId: string;

  @Field(() => String)
  courseTitle: string;

  @Field(() => String)
  title: string;

  @Field(() => AssignmentType)
  type: AssignmentType;

  /** Submitted / late and not graded yet (an exam past its date: students without a score) */
  @Field(() => Int)
  toGrade: number;

  /** Students who handed something in (graded or not) */
  @Field(() => Int)
  submitted: number;

  @Field(() => Int)
  graded: number;

  /** Active students of the course */
  @Field(() => Int)
  students: number;

  @Field(() => Date, { nullable: true })
  dueAt: Date | null;

  @Field(() => Boolean)
  allowLate: boolean;

  /** Nothing left to grade, the deadline has passed, the scores are not published yet */
  @Field(() => Boolean)
  readyToPublish: boolean;
}

/** "My courses" card */
@ObjectType()
export class TeacherCourse {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => CourseStatus)
  status: CourseStatus;

  @Field(() => Int)
  students: number;

  /** The course week (module) today falls in; null = none */
  @Field(() => Int, { nullable: true })
  week: number | null;
}

/** "Upcoming deadlines" row */
@ObjectType()
export class TeacherDeadline {
  @Field(() => String)
  id: string;

  @Field(() => DeadlineKind)
  kind: DeadlineKind;

  /** The assignment's or event's title; the period name for TERM_START / TERM_END */
  @Field(() => String)
  title: string;

  /** The assignment's courses (one row for the same homework in 9A and 9B); empty for school dates */
  @Field(() => [String])
  courseTitles: string[];

  /** "YYYY-MM-DD" in the school timezone */
  @Field(() => String)
  date: string;

  /** The exact moment for an assignment (shown as a time); null for calendar dates */
  @Field(() => Date, { nullable: true })
  dueAt: Date | null;
}

/** "Recent announcements": the teacher's own, with read receipts */
@ObjectType()
export class TeacherAnnouncement {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  /** null = school-wide */
  @Field(() => String, { nullable: true })
  courseTitle: string | null;

  @Field(() => Date)
  publishedAt: Date;

  /** Students of the course who opened it */
  @Field(() => Int)
  reads: number;

  /** Active students of the course; null for a school-wide announcement */
  @Field(() => Int, { nullable: true })
  audience: number | null;
}

/** The teacher's home page: only their own courses (AccessPolicy.courseScope), counted on the server */
@ObjectType()
export class TeacherDashboard {
  /** "YYYY-MM-DD" in the school timezone */
  @Field(() => String)
  today: string;

  @Field(() => DashboardPeriod, { nullable: true })
  period: DashboardPeriod | null;

  /** Title of a holiday on today's date (no classes) */
  @Field(() => String, { nullable: true })
  holiday: string | null;

  @Field(() => [TodayCourse])
  todayCourses: TodayCourse[];

  /** Every submission waiting for a grade, across all the teacher's courses */
  @Field(() => Int)
  toGradeTotal: number;

  /** The first few, oldest deadline first */
  @Field(() => [GradingItem])
  grading: GradingItem[];

  @Field(() => [TeacherCourse])
  courses: TeacherCourse[];

  @Field(() => [TeacherDeadline])
  deadlines: TeacherDeadline[];

  @Field(() => [TeacherAnnouncement])
  announcements: TeacherAnnouncement[];
}
