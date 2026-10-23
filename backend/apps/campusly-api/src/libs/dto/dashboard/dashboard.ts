import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  AttentionPriority,
  CalendarEventKind,
} from '../../enums/dashboard.enum';

/** "Quarter 1, week 7 of 10" */
@ObjectType()
export class DashboardPeriod {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  week: number;

  @Field(() => Int)
  weeks: number;
}

/** A student flagged by the attention rules */
@ObjectType()
export class AttentionStudent {
  @Field(() => String)
  studentId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String, { nullable: true })
  className: string | null;

  @Field(() => AttentionPriority)
  priority: AttentionPriority;

  /** This period's attendance rate in % */
  @Field(() => Float)
  attendanceRate: number;

  /** Marks the rate is based on */
  @Field(() => Int)
  marks: number;
}

@ObjectType()
export class NeedsAttention {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  high: number;

  @Field(() => Int)
  medium: number;

  @Field(() => Int)
  low: number;

  /** The first few, most urgent first */
  @Field(() => [AttentionStudent])
  students: AttentionStudent[];
}

/** One audit row, without before / after (they may hold personal data) */
@ObjectType()
export class ActivityItem {
  @Field(() => String)
  id: string;

  /** AuditAction, e.g. "user.resetPassword" */
  @Field(() => String)
  action: string;

  /** null = the system or a batch job */
  @Field(() => String, { nullable: true })
  actorName: string | null;

  @Field(() => Date)
  createdAt: Date;
}

/** The admin home page: the school at a glance, counted on the server */
@ObjectType()
export class AdminDashboard {
  /** "YYYY-MM-DD" in the school timezone */
  @Field(() => String)
  today: string;

  /** null = no current year or it has not started yet */
  @Field(() => DashboardPeriod, { nullable: true })
  period: DashboardPeriod | null;

  /** Active students; growth = accounts created since the 1st of this month */
  @Field(() => Int)
  students: number;

  @Field(() => Int)
  newStudentsThisMonth: number;

  @Field(() => Int)
  teachers: number;

  @Field(() => Int)
  newTeachersThisMonth: number;

  /** Active classes and courses of the current year */
  @Field(() => Int)
  classes: number;

  @Field(() => Int)
  courses: number;

  /** Attendance rate this month (1st → today) and the whole previous month, in % */
  @Field(() => Float, { nullable: true })
  attendanceThisMonth: number | null;

  @Field(() => Float, { nullable: true })
  attendanceLastMonth: number | null;

  /** Active students and parents who have not set their own password yet */
  @Field(() => Int)
  notSignedIn: number;

  @Field(() => Int)
  accounts: number;

  @Field(() => NeedsAttention)
  needsAttention: NeedsAttention;

  @Field(() => [ActivityItem])
  recentActivity: ActivityItem[];
}

/** Donut: attendance marks by status in a window */
@ObjectType()
export class AttendanceOverview {
  /** "YYYY-MM-DD", both included */
  @Field(() => String)
  from: string;

  @Field(() => String)
  to: string;

  @Field(() => Int)
  present: number;

  @Field(() => Int)
  late: number;

  @Field(() => Int)
  excused: number;

  @Field(() => Int)
  absent: number;

  @Field(() => Int)
  total: number;
}

@ObjectType()
export class CalendarEvent {
  @Field(() => String)
  id: string;

  @Field(() => CalendarEventKind)
  kind: CalendarEventKind;

  /** The event's title, or the period name ("Quarter 2") */
  @Field(() => String)
  title: string;

  /** "YYYY-MM-DD", both included; the same day for a one-day event */
  @Field(() => String)
  startsOn: string;

  @Field(() => String)
  endsOn: string;

  @Field(() => String, { nullable: true })
  note: string | null;

  /** Set for the school's own events (they can be edited); null for term dates */
  @Field(() => String, { nullable: true })
  schoolEventId: string | null;

  /** ASSIGNMENT only: where the student opens it */
  @Field(() => String, { nullable: true })
  courseId: string | null;

  @Field(() => String, { nullable: true })
  assignmentId: string | null;
}
