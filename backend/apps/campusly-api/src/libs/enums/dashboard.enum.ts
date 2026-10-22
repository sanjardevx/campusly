import { registerEnumType } from '@nestjs/graphql';

/** Attendance overview window, counted up to today (school timezone) */
export enum AttendanceRange {
  TODAY = 'TODAY',
  WEEK = 'WEEK', // Monday → today
  MONTH = 'MONTH', // the 1st → today
}
registerEnumType(AttendanceRange, { name: 'AttendanceRange' });

/** What a calendar day holds: the school's own events (SchoolEvent) and term dates (Period) */
export enum CalendarEventKind {
  HOLIDAY = 'HOLIDAY',
  EVENT = 'EVENT',
  DEADLINE = 'DEADLINE',
  START = 'START',
  TERM_START = 'TERM_START',
  TERM_END = 'TERM_END',
}
registerEnumType(CalendarEventKind, { name: 'CalendarEventKind' });

/** Students needing attention (rules in DashboardService.needsAttention) */
export enum AttentionPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}
registerEnumType(AttentionPriority, { name: 'AttentionPriority' });
