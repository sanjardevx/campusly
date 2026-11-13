import { registerEnumType } from '@nestjs/graphql';

// Error codes sent to the client in `extensions.code`.
// The frontend translates codes into 4 languages, so it never compares message text.
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** Only shown after a correct password, so it does not reveal which IDs exist */
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  /** Unique value already used (e.g. a phone or login ID) */
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  /** A demo account tried something demos may not do (change password, manage users, upload) */
  DEMO_READ_ONLY = 'DEMO_READ_ONLY',
  /** The Telegram bot is not configured on this server */
  TELEGRAM_DISABLED = 'TELEGRAM_DISABLED',
  /** A password-reset link is wrong, expired or already used */
  RESET_LINK_INVALID = 'RESET_LINK_INVALID',
  /** Quiz questions cannot change once a student has started */
  QUIZ_LOCKED = 'QUIZ_LOCKED',
  /** The quiz cannot be started: no questions, past the due date, or grades already published */
  QUIZ_CLOSED = 'QUIZ_CLOSED',
  /** The attempt's time is over: the answer was not saved */
  QUIZ_TIME_UP = 'QUIZ_TIME_UP',
  /** The AI tutor is not connected on this server (TUTOR_PROVIDER=off) */
  TUTOR_DISABLED = 'TUTOR_DISABLED',
  /** The student used today's tutor requests */
  TUTOR_LIMIT = 'TUTOR_LIMIT',
  /** The school's tutor budget for today is used up */
  TUTOR_BUDGET = 'TUTOR_BUDGET',
  /** The student has a quiz open: the tutor is off until it is submitted */
  TUTOR_QUIZ_ACTIVE = 'TUTOR_QUIZ_ACTIVE',
  /** The teacher turned the tutor off for this assignment (or it is a quiz) */
  TUTOR_OFF = 'TUTOR_OFF',
  /** The model call failed; the request was not counted */
  TUTOR_FAILED = 'TUTOR_FAILED',
  /** A private question cannot be pinned as FAQ (the class would see it) */
  QUESTION_PRIVATE = 'QUESTION_PRIVATE',
  /** The home page slider already has 5 posts */
  SITE_CAROUSEL_FULL = 'SITE_CAROUSEL_FULL',
  /** The picture is not a finished website upload (createSiteUpload → confirmUpload) */
  SITE_IMAGE_INVALID = 'SITE_IMAGE_INVALID',
  /** An honor student goes on the public site only with the parents' consent */
  SITE_CONSENT_REQUIRED = 'SITE_CONSENT_REQUIRED',
  /** The phone number is not an Uzbek mobile number */
  INVALID_PHONE = 'INVALID_PHONE',
  /** S3 / CloudFront are not configured on this server (local run without AWS, CI) */
  MEDIA_DISABLED = 'MEDIA_DISABLED',
  // CSV import: the whole file is refused (row problems are ImportIssueCode instead)
  IMPORT_FILE_TOO_BIG = 'IMPORT_FILE_TOO_BIG',
  IMPORT_INVALID_CSV = 'IMPORT_INVALID_CSV',
  IMPORT_EMPTY = 'IMPORT_EMPTY',
  IMPORT_TOO_MANY_ROWS = 'IMPORT_TOO_MANY_ROWS',
  IMPORT_MISSING_COLUMNS = 'IMPORT_MISSING_COLUMNS',
  /** Some rows have problems and "Skip rows with errors" is off */
  IMPORT_HAS_ERRORS = 'IMPORT_HAS_ERRORS',
  IMPORT_NOTHING = 'IMPORT_NOTHING',
  /** Classes belong to an academic year: one must be marked current */
  NO_CURRENT_YEAR = 'NO_CURRENT_YEAR',
  // School settings and the calendar (the UI explains each one in the admin's language)
  TIMEZONE_UNKNOWN = 'TIMEZONE_UNKNOWN',
  /** 5 > 4 > 3 minimum percents */
  MARK_THRESHOLDS_ORDER = 'MARK_THRESHOLDS_ORDER',
  /** Homework + Quizzes + Exams must be 100 */
  WEIGHTS_SUM = 'WEIGHTS_SUM',
  /** Two grade categories of one course with the same name */
  CATEGORY_NAME_TAKEN = 'CATEGORY_NAME_TAKEN',
  /** The end date is not after the start date */
  DATES_ORDER = 'DATES_ORDER',
  YEAR_OVERLAP = 'YEAR_OVERLAP',
  /** Changing a year's dates would leave some of its periods outside it */
  PERIODS_OUTSIDE_YEAR = 'PERIODS_OUTSIDE_YEAR',
  PERIOD_OUTSIDE_YEAR = 'PERIOD_OUTSIDE_YEAR',
  PERIOD_OUTSIDE_PARENT = 'PERIOD_OUTSIDE_PARENT',
  PERIOD_PARENT_INVALID = 'PERIOD_PARENT_INVALID',
  /** Two periods of the same kind (two quarters) share days */
  PERIOD_OVERLAP = 'PERIOD_OVERLAP',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/** Sort direction for every list */
export enum Direction {
  ASC = 'asc',
  DESC = 'desc',
}
registerEnumType(Direction, { name: 'Direction' });
