import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Announcements } from '../announcement/announcement';
import { AttendanceSummary } from '../attendance/attendance';
import { AssignmentType } from '../../enums/assignment.enum';
import { LessonType } from '../../enums/course.enum';
import { GradeItemState } from '../../enums/grade.enum';
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

  /** Week of the period today is in (1 = the first week), school timezone */
  @Field(() => Int)
  week: number;
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

  /** Completed lessons / published lessons in visible weeks; null when there are none */
  @Field(() => Float, { nullable: true })
  progress: number | null;

  /** Unread announcements + lessons / assignments published in the last 7 days, not opened yet */
  @Field(() => Int)
  newCount: number;
}

/** A lesson the student started and has not completed ("Continue") */
@ObjectType()
export class ContinueLesson {
  @Field(() => String)
  lessonId: string;

  @Field(() => String)
  courseId: string;

  @Field(() => String)
  courseTitle: string;

  @Field(() => String)
  subjectName: string;

  @Field(() => String)
  title: string;

  @Field(() => LessonType)
  type: LessonType;

  @Field(() => Int, { nullable: true })
  durationSec: number | null;

  /** Furthest point reached, % of the video; null without a video length */
  @Field(() => Float, { nullable: true })
  percent: number | null;
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

  /** The teacher's comment (grades are published, so it may be shown) */
  @Field(() => String, { nullable: true })
  feedback: string | null;
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

  /** Started, not completed (latest first) */
  @Field(() => [ContinueLesson])
  continueLessons: ContinueLesson[];

  @Field(() => [UpcomingItem])
  upcoming: UpcomingItem[];

  /** Past due, not handed in, and still open (late work allowed, grades not published) */
  @Field(() => [UpcomingItem])
  overdue: UpcomingItem[];

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

/** A period in the gradebook tabs */
@ObjectType()
export class PeriodRef {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;
}

/** One assignment in the student's gradebook */
@ObjectType()
export class MyGradeItem {
  @Field(() => String)
  assignmentId: string;

  @Field(() => String)
  title: string;

  @Field(() => AssignmentType)
  type: AssignmentType;

  @Field(() => Date, { nullable: true })
  dueAt: Date | null;

  @Field(() => Float)
  maxScore: number;

  @Field(() => GradeItemState)
  state: GradeItemState;

  /** Only once the grades are published */
  @Field(() => Float, { nullable: true })
  score: number | null;

  @Field(() => String, { nullable: true })
  feedback: string | null;
}

/** One course row of the gradebook in one period */
@ObjectType()
export class MyCourseGrades {
  @Field(() => String)
  courseId: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  subjectName: string;

  @Field(() => String, { nullable: true })
  teacherName: string | null;

  /** The published snapshot, or the live % from published grades */
  @Field(() => Float, { nullable: true })
  percent: number | null;

  @Field(() => Int, { nullable: true })
  mark: number | null;

  /** false = live, can still change ("Not final") */
  @Field(() => Boolean)
  isFinal: boolean;

  /** This course, this period */
  @Field(() => Float, { nullable: true })
  attendanceRate: number | null;

  /** Past due and not handed in, or a published "missing" zero */
  @Field(() => Int)
  missing: number;

  @Field(() => [MyGradeItem])
  items: MyGradeItem[];
}

/** The student's gradebook for one period, in one query */
@ObjectType()
export class MyGrades {
  /** The year's quarters (leaf periods), for the tabs */
  @Field(() => [PeriodRef])
  periods: PeriodRef[];

  /** The period shown: the one asked for, else the current one; null before the year starts */
  @Field(() => PeriodRef, { nullable: true })
  period: PeriodRef | null;

  /** All courses together, this period */
  @Field(() => Float, { nullable: true })
  attendanceRate: number | null;

  /** The same marks counted ("32 of 34 lessons · 2 excused" on the parent home) */
  @Field(() => AttendanceSummary)
  attendance: AttendanceSummary;

  @Field(() => Int)
  missing: number;

  @Field(() => [MyCourseGrades])
  courses: MyCourseGrades[];
}
