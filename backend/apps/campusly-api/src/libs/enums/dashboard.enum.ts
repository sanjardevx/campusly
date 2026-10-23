import { registerEnumType } from '@nestjs/graphql';

/** Attendance overview window, counted up to today (school timezone) */
export enum AttendanceRange {
  TODAY = 'TODAY',
  WEEK = 'WEEK', // Monday → today
  MONTH = 'MONTH', // the 1st → today
}
registerEnumType(AttendanceRange, { name: 'AttendanceRange' });

/** What a calendar day holds: the school's own events (SchoolEvent), term dates (Period) and, for a student, due work */
export enum CalendarEventKind {
  HOLIDAY = 'HOLIDAY',
  EVENT = 'EVENT',
  DEADLINE = 'DEADLINE',
  START = 'START',
  TERM_START = 'TERM_START',
  TERM_END = 'TERM_END',
  /** Student calendar only: an assignment of the student's course is due that day */
  ASSIGNMENT = 'ASSIGNMENT',
}
registerEnumType(CalendarEventKind, { name: 'CalendarEventKind' });

/** Students needing attention (rules in DashboardService.needsAttention) */
export enum AttentionPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}
registerEnumType(AttentionPriority, { name: 'AttentionPriority' });

/** A row of the teacher's "Upcoming deadlines": their own assignment or a school calendar date */
export enum DeadlineKind {
  ASSIGNMENT = 'ASSIGNMENT',
  DEADLINE = 'DEADLINE',
  START = 'START',
  EVENT = 'EVENT',
  TERM_START = 'TERM_START',
  TERM_END = 'TERM_END',
}
registerEnumType(DeadlineKind, { name: 'DeadlineKind' });
