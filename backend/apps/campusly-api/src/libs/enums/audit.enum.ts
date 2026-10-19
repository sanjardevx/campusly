/** Every audited action, written as "<entity>.<verb>" so the activity log can be filtered */
export enum AuditAction {
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_RESET_PASSWORD = 'user.resetPassword',
  USER_BLOCK = 'user.block',
  USER_UNBLOCK = 'user.unblock',
  PARENT_LINK = 'parent.link',
  PARENT_UNLINK = 'parent.unlink',
  USERS_IMPORT = 'users.import',
  SETTINGS_UPDATE = 'settings.update',
  ACADEMIC_YEAR_CREATE = 'academicYear.create',
  ACADEMIC_YEAR_UPDATE = 'academicYear.update',
  PERIOD_CREATE = 'period.create',
  PERIOD_UPDATE = 'period.update',
}
