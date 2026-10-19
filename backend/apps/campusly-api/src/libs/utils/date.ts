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
