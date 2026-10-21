import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Announcements } from '../announcement/announcement';
import { AttendanceSummary } from '../attendance/attendance';
import { AssignmentType } from '../../enums/assignment.enum';
import { ParentRelation } from '../../enums/user.enum';

@ObjectType()
export class OverviewStudent {
  @Field(() => String)
  id: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  /** e.g. "9A" (current class) */
  @Field(() => String, { nullable: true })
  className: string | null;
}

@ObjectType()
export class OverviewPeriod {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class OverviewCourse {
  @Field(() => String)
  courseId: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  subjectName: string;

  /** The owner teacher */
  @Field(() => String, { nullable: true })
  teacherName: string | null;

  /** Current period: the published snapshot, or the live % */
  @Field(() => Float, { nullable: true })
  score: number | null;

  @Field(() => Int, { nullable: true })
  mark: number | null;

  @Field(() => Boolean)
  isPublished: boolean;

  @Field(() => Float, { nullable: true })
  attendanceRate: number | null;
}

/** Due in the next 7 days */
@ObjectType()
export class UpcomingItem {
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

  @Field(() => Date)
  dueAt: Date;

  /** Submitted (or graded) already */
  @Field(() => Boolean)
  isDone: boolean;
}

/** A published grade only */
@ObjectType()
export class RecentGrade {
  @Field(() => String)
  assignmentId: string;

  @Field(() => String)
  courseTitle: string;

  @Field(() => String)
  title: string;

  @Field(() => Float)
  score: number;

  @Field(() => Float)
  maxScore: number;

  @Field(() => Float)
  percent: number;

  @Field(() => Date)
  publishedAt: Date;
}

/** The student / parent home page in one query */
@ObjectType()
export class StudentOverview {
  @Field(() => OverviewStudent)
  student: OverviewStudent;

  /** The period today is in (or the latest that has started); null before the year starts */
  @Field(() => OverviewPeriod, { nullable: true })
  period: OverviewPeriod | null;

  @Field(() => [OverviewCourse])
  courses: OverviewCourse[];

  /** All courses together */
  @Field(() => AttendanceSummary)
  attendance: AttendanceSummary;

  @Field(() => [UpcomingItem])
  upcoming: UpcomingItem[];

  @Field(() => [RecentGrade])
  recentGrades: RecentGrade[];

  /** The viewer's announcements: unread count and the latest 3 */
  @Field(() => Announcements)
  announcements: Announcements;
}

/** A parent's child, for the child switcher */
@ObjectType()
export class Child {
  @Field(() => String)
  id: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String, { nullable: true })
  className: string | null;

  @Field(() => ParentRelation)
  relation: ParentRelation;
}
