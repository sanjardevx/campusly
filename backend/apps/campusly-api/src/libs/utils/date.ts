import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../enums/common.enum';

/**
 * Calendar dates (period start, birth date, attendance day) are "YYYY-MM-DD" in the API.
 * As a DateTime they would shift a day in another timezone (2026-11-09 → 2026-11-08T19:00).
 * In the DB they are @db.Date, stored as UTC midnight.
 */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-09" → Date (UTC midnight). Rejects impossible dates such as 2026-02-30. */
export function toDbDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || fromDbDate(date) !== value) {
    throw new BadRequestException({
      code: ErrorCode.BAD_REQUEST,
      message: `${value} is not a valid date`,
    });
  }
  return date;
}

/** Date from a @db.Date column → "2026-11-09" */
export const fromDbDate = (date: Date): string =>
  date.toISOString().slice(0, 10);

/** IANA name such as "Asia/Tashkent" */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The UTC moment a calendar day starts in a timezone.
 * "2026-09-02" in Asia/Tashkent (UTC+5) → 2026-09-01T19:00:00Z.
 * Used for period boundaries: an assignment due at 03:00 on 1 November in Tashkent
 * (22:00 UTC on 31 October) belongs to November, not to the quarter that ends on 31 October.
 */
export function startOfDayInZone(day: string, timeZone: string): Date {
  const utcMidnight = toDbDate(day);
  const offset = zoneOffsetMinutes(utcMidnight, timeZone);
  const guess = new Date(utcMidnight.getTime() - offset * 60_000);
  // A daylight-saving change on that night: use the offset of the result itself
  const exact = zoneOffsetMinutes(guess, timeZone);
  return exact === offset
    ? guess
    : new Date(utcMidnight.getTime() - exact * 60_000);
}

/** Today's calendar date in a timezone: "2026-10-21" (the server itself runs in UTC) */
export function todayInZone(timeZone: string, now = new Date()): string {
  // en-CA prints dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Monday to Friday of the week that contains `day`; Saturday and Sunday show that week too */
export function weekDays(day: string): string[] {
  const date = toDbDate(day);
  // getUTCDay: 0 = Sunday … 6 = Saturday → days since Monday
  const fromMonday = (date.getUTCDay() + 6) % 7;
  const monday = date.getTime() - fromMonday * 86_400_000;
  return [0, 1, 2, 3, 4].map((i) =>
    fromDbDate(new Date(monday + i * 86_400_000)),
  );
}

/**
 * Week number of a period and how many weeks it has (week 1 starts on its first day). In a break
 * after the period the last week is shown, never "week 12 of 10".
 */
export function periodWeek(startsAt: Date, endsAt: Date, day: string) {
  const days = (a: Date, b: Date) =>
    Math.floor((b.getTime() - a.getTime()) / 86_400_000);
  const weeks = Math.ceil((days(startsAt, endsAt) + 1) / 7);
  const week = Math.min(
    weeks,
    Math.floor(days(startsAt, toDbDate(day)) / 7) + 1,
  );
  return { week, weeks };
}

/** "2026-10-31" → "2026-11-01" */
export function nextDay(day: string): string {
  return fromDbDate(new Date(toDbDate(day).getTime() + 86_400_000));
}

/** How many minutes the timezone is ahead of UTC at that moment (Tashkent: +300) */
function zoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}
