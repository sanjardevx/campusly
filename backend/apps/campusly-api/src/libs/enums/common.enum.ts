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
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
