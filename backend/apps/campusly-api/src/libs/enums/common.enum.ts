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
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/** Sort direction for every list (Nestar used 1 / -1 for Mongo) */
export enum Direction {
  ASC = 'asc',
  DESC = 'desc',
}
registerEnumType(Direction, { name: 'Direction' });
