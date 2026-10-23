/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AnnouncementsInquiry = {
  courseId?: string | null | undefined;
  limit?: number | null | undefined;
  page?: number | null | undefined;
  search?: string | null | undefined;
};

export type AssignmentType =
  | 'EXAM'
  | 'HOMEWORK'
  | 'QUIZ';

export type AttendanceMarkInput = {
  note?: string | null | undefined;
  status: AttendanceStatus;
  studentId: string;
};

export type AttendanceRange =
  | 'MONTH'
  | 'TODAY'
  | 'WEEK';

export type AttendanceStatus =
  | 'ABSENT'
  | 'EXCUSED'
  | 'LATE'
  | 'PRESENT';

export type AttentionPriority =
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM';

export type CalendarEventKind =
  | 'ASSIGNMENT'
  | 'DEADLINE'
  | 'EVENT'
  | 'HOLIDAY'
  | 'START'
  | 'TERM_END'
  | 'TERM_START';

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type CompletionType =
  | 'MANUAL'
  | 'VIDEO_WATCHED'
  | 'VIEW';

export type CourseStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DRAFT';

export type CourseTeacherRole =
  | 'ASSISTANT'
  | 'OWNER';

export type CoursesFilter = {
  academicYearId?: string | null | undefined;
  groupId?: string | null | undefined;
  status?: CourseStatus | null | undefined;
  subjectId?: string | null | undefined;
  teacherId?: string | null | undefined;
};

export type CreateAcademicYearInput = {
  endsAt: string;
  isCurrent?: boolean | null | undefined;
  name: string;
  startsAt: string;
};

export type CreateAssignmentInput = {
  acceptedFileTypes?: Array<string> | null | undefined;
  allowLate?: boolean | null | undefined;
  categoryId?: string | null | undefined;
  courseId: string;
  dueAt?: string | null | undefined;
  fileAssetIds?: Array<string> | null | undefined;
  finalAnswer?: string | null | undefined;
  instructions?: string | null | undefined;
  lessonId?: string | null | undefined;
  maxAttempts?: number | null | undefined;
  maxScore: number;
  moduleId?: string | null | undefined;
  title: string;
  tutorMode?: TutorMode | null | undefined;
  type: AssignmentType;
};

export type CreateCourseAnnouncementsInput = {
  body: string;
  courseIds: Array<string>;
  fileAssetIds?: Array<string> | null | undefined;
  isPinned?: boolean | null | undefined;
  title: string;
};

export type CreateCourseInput = {
  groupId: string;
  isSplitGroup?: boolean | null | undefined;
  periodId?: string | null | undefined;
  studentIds?: Array<string> | null | undefined;
  subjectId: string;
  teacherIds: Array<string>;
  title?: string | null | undefined;
};

export type CreateGroupInput = {
  academicYearId: string;
  name: string;
};

export type CreateLessonInput = {
  body?: string | null | undefined;
  completionType?: CompletionType | null | undefined;
  dueAt?: string | null | undefined;
  moduleId: string;
  title: string;
  tutorNotes?: string | null | undefined;
  type: LessonType;
};

export type CreateModuleInput = {
  courseId: string;
  endsAt?: string | null | undefined;
  startsAt?: string | null | undefined;
  title: string;
};

export type CreatePeriodInput = {
  academicYearId: string;
  endsAt: string;
  kind: PeriodKind;
  name: string;
  order: number;
  parentId?: string | null | undefined;
  startsAt: string;
};

export type CreateSchoolEventInput = {
  endsOn?: string | null | undefined;
  kind: SchoolEventKind;
  note?: string | null | undefined;
  startsOn: string;
  title: string;
};

export type CreateStudentInput = {
  admissionYear?: number | null | undefined;
  birthDate?: string | null | undefined;
  firstName: string;
  groupId: string;
  lastName: string;
  parent?: ParentInput | null | undefined;
};

export type CreateSubjectInput = {
  name: string;
};

export type CreateTeacherInput = {
  firstName: string;
  lastName: string;
  title?: string | null | undefined;
};

export type CreateUploadInput = {
  courseId: string;
  durationSec?: number | null | undefined;
  fileName: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
};

export type DeadlineKind =
  | 'ASSIGNMENT'
  | 'DEADLINE'
  | 'EVENT'
  | 'START'
  | 'TERM_END'
  | 'TERM_START';

export type Direction =
  | 'ASC'
  | 'DESC';

export type GradeCategoryInput = {
  id?: string | null | undefined;
  name: string;
  weight: number;
};

export type GradeSubmissionInput = {
  assignmentId: string;
  feedback?: string | null | undefined;
  score: number;
  studentId: string;
};

export type ImportIssueCode =
  | 'ADMISSION_YEAR_INVALID'
  | 'CLASS_EMPTY'
  | 'CLASS_NOT_FOUND'
  | 'FIRST_NAME_LENGTH'
  | 'LAST_NAME_LENGTH'
  | 'PARENT_LOGIN_TAKEN'
  | 'PARENT_NAME_INVALID'
  | 'PHONE_INVALID'
  | 'RELATION_UNKNOWN';

export type ImportRowStatus =
  | 'ERROR'
  | 'LINK_PARENT'
  | 'READY';

export type LessonType =
  | 'FILE'
  | 'LINK'
  | 'READING'
  | 'VIDEO';

export type MarkAttendanceInput = {
  courseId: string;
  date: string;
  lessonId?: string | null | undefined;
  records: Array<AttendanceMarkInput>;
  title?: string | null | undefined;
};

export type MediaKind =
  | 'DOCUMENT'
  | 'IMAGE'
  | 'OTHER'
  | 'VIDEO';

export type MediaStatus =
  | 'FAILED'
  | 'PROCESSING'
  | 'READY'
  | 'UPLOADING';

export type MoveStudentInput = {
  groupId: string;
  studentId: string;
};

export type ParentInput = {
  firstName: string;
  lastName: string;
  phone: string;
  relation: ParentRelation;
};

export type ParentRelation =
  | 'FATHER'
  | 'GUARDIAN'
  | 'MOTHER'
  | 'OTHER';

export type PasswordState =
  | 'EXPIRED'
  | 'MUST_CHANGE'
  | 'SET'
  | 'TEMPORARY';

export type PeriodKind =
  | 'CUSTOM'
  | 'MONTH'
  | 'QUARTER'
  | 'SEMESTER';

export type ProgressStatus =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'NOT_STARTED';

export type PublishGradesInput = {
  assignmentId: string;
  publish: boolean;
};

export type PublishInput = {
  id: string;
  publish: boolean;
  publishAt?: string | null | undefined;
};

export type PublishPeriodGradesInput = {
  courseId: string;
  periodId: string;
};

export type RecordExportInput = {
  format: RecordFormat;
  report: RecordReport;
  scope?: string | null | undefined;
  targetId?: string | null | undefined;
};

export type RecordFormat =
  | 'CSV'
  | 'PRINT';

export type RecordReport =
  | 'ATTENDANCE'
  | 'GRADES'
  | 'REPORT_CARD'
  | 'STUDENTS';

export type RecordStatus =
  | 'ACTIVE'
  | 'ARCHIVED';

export type ReorderInput = {
  ids: Array<string>;
  parentId: string;
};

export type ReturnSubmissionInput = {
  assignmentId: string;
  feedback?: string | null | undefined;
  studentId: string;
};

export type Role =
  | 'ADMIN'
  | 'PARENT'
  | 'STUDENT'
  | 'TEACHER';

export type SchoolEventKind =
  | 'DEADLINE'
  | 'EVENT'
  | 'HOLIDAY'
  | 'START';

export type SetCourseTeachersInput = {
  courseId: string;
  teacherIds: Array<string>;
};

export type SetGradeCategoriesInput = {
  categories: Array<GradeCategoryInput>;
  courseId: string;
};

export type SetLessonFileInput = {
  assetId?: string | null | undefined;
  lessonId: string;
};

export type SetLessonVideoInput = {
  assetId?: string | null | undefined;
  lessonId: string;
};

export type SubmissionStatus =
  | 'DRAFT'
  | 'GRADED'
  | 'LATE'
  | 'MISSING'
  | 'RETURNED'
  | 'SUBMITTED';

export type TutorMode =
  | 'CHECK_ONLY'
  | 'HINTS'
  | 'OFF';

export type UpdateAcademicYearInput = {
  endsAt?: string | null | undefined;
  id: string;
  name?: string | null | undefined;
  startsAt?: string | null | undefined;
};

export type UpdateAnnouncementInput = {
  body?: string | null | undefined;
  eventDate?: string | null | undefined;
  fileAssetIds?: Array<string> | null | undefined;
  id: string;
  isPinned?: boolean | null | undefined;
  title?: string | null | undefined;
};

export type UpdateAssignmentInput = {
  acceptedFileTypes?: Array<string> | null | undefined;
  allowLate?: boolean | null | undefined;
  categoryId?: string | null | undefined;
  dueAt?: string | null | undefined;
  fileAssetIds?: Array<string> | null | undefined;
  finalAnswer?: string | null | undefined;
  id: string;
  instructions?: string | null | undefined;
  lessonId?: string | null | undefined;
  maxAttempts?: number | null | undefined;
  maxScore?: number | null | undefined;
  moduleId?: string | null | undefined;
  title?: string | null | undefined;
  tutorMode?: TutorMode | null | undefined;
};

export type UpdateGroupInput = {
  id: string;
  name?: string | null | undefined;
  status?: RecordStatus | null | undefined;
};

export type UpdateLessonInput = {
  body?: string | null | undefined;
  completionType?: CompletionType | null | undefined;
  dueAt?: string | null | undefined;
  id: string;
  title?: string | null | undefined;
  tutorNotes?: string | null | undefined;
};

export type UpdateModuleInput = {
  endsAt?: string | null | undefined;
  id: string;
  isHidden?: boolean | null | undefined;
  startsAt?: string | null | undefined;
  title?: string | null | undefined;
};

export type UpdatePeriodInput = {
  endsAt?: string | null | undefined;
  id: string;
  name?: string | null | undefined;
  order?: number | null | undefined;
  startsAt?: string | null | undefined;
};

export type UpdateSchoolEventInput = {
  endsOn?: string | null | undefined;
  id: string;
  kind?: SchoolEventKind | null | undefined;
  note?: string | null | undefined;
  startsOn?: string | null | undefined;
  title?: string | null | undefined;
};

export type UpdateSchoolSettingsInput = {
  contactPhone?: string | null | undefined;
  defaultExamWeight?: number | null | undefined;
  defaultHomeworkWeight?: number | null | undefined;
  defaultLocale?: string | null | undefined;
  defaultQuizWeight?: number | null | undefined;
  mark3MinPercent?: number | null | undefined;
  mark4MinPercent?: number | null | undefined;
  mark5MinPercent?: number | null | undefined;
  officeHours?: string | null | undefined;
  schoolName?: string | null | undefined;
  telegramBotUrl?: string | null | undefined;
  telegramUrl?: string | null | undefined;
  tempPasswordDays?: number | null | undefined;
  tempPasswordUses?: number | null | undefined;
  timezone?: string | null | undefined;
};

export type UpdateSubjectInput = {
  id: string;
  name?: string | null | undefined;
  status?: RecordStatus | null | undefined;
};

export type UserStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'BLOCKED';

export type UsersInquiry = {
  direction?: Direction | null | undefined;
  limit: number;
  page: number;
  search: UsersSearch;
  sort?: string | null | undefined;
};

export type UsersSearch = {
  groupId?: string | null | undefined;
  groupIds?: Array<string> | null | undefined;
  passwordState?: PasswordState | null | undefined;
  role: Role;
  status?: UserStatus | null | undefined;
  text?: string | null | undefined;
};

export type ResetPasswordMutationVariables = Exact<{
  userId: string;
}>;


export type ResetPasswordMutation = { resetPassword: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean } };

export type BlockUserMutationVariables = Exact<{
  userId: string;
}>;


export type BlockUserMutation = { blockUser: boolean };

export type UnblockUserMutationVariables = Exact<{
  userId: string;
}>;


export type UnblockUserMutation = { unblockUser: boolean };

export type MoveStudentMutationVariables = Exact<{
  input: MoveStudentInput;
}>;


export type MoveStudentMutation = { moveStudent: { id: string, name: string, studentCount: number } };

export type CreateStudentMutationVariables = Exact<{
  input: CreateStudentInput;
}>;


export type CreateStudentMutation = { createStudent: { student: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean }, parent: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean } | null } };

export type LinkParentMutationVariables = Exact<{
  studentId: string;
  input: ParentInput;
}>;


export type LinkParentMutation = { linkParent: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean } };

export type CreateTeacherMutationVariables = Exact<{
  input: CreateTeacherInput;
}>;


export type CreateTeacherMutation = { createTeacher: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean } };

export type PreviewStudentImportMutationVariables = Exact<{
  csv: string;
}>;


export type PreviewStudentImportMutation = { previewStudentImport: { rows: Array<{ line: number, firstName: string, lastName: string, className: string, admissionYear: number | null, parentName: string | null, parentPhone: string | null, status: ImportRowStatus, loginIdPreview: string | null, errors: Array<{ code: ImportIssueCode, value: string | null }> }>, summary: { ready: number, linkParent: number, errors: number } } };

export type ImportStudentsMutationVariables = Exact<{
  csv: string;
  skipErrors: boolean;
}>;


export type ImportStudentsMutation = { importStudents: { created: number, linkedParents: number, skipped: number, slips: Array<{ student: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean }, parent: { userId: string, loginId: string, fullName: string, role: Role, tempPassword: string | null, isNew: boolean } | null }> } };

export type CreateGroupMutationVariables = Exact<{
  input: CreateGroupInput;
}>;


export type CreateGroupMutation = { createGroup: { id: string, name: string, studentCount: number, status: RecordStatus } };

export type UpdateGroupMutationVariables = Exact<{
  input: UpdateGroupInput;
}>;


export type UpdateGroupMutation = { updateGroup: { id: string, name: string, studentCount: number, status: RecordStatus } };

export type CreateCourseMutationVariables = Exact<{
  input: CreateCourseInput;
}>;


export type CreateCourseMutation = { createCourse: { id: string, title: string } };

export type SetCourseTeachersMutationVariables = Exact<{
  input: SetCourseTeachersInput;
}>;


export type SetCourseTeachersMutation = { setCourseTeachers: { id: string, teachers: Array<{ id: string, firstName: string, lastName: string, role: CourseTeacherRole }> } };

export type CreateSubjectMutationVariables = Exact<{
  input: CreateSubjectInput;
}>;


export type CreateSubjectMutation = { createSubject: { id: string, name: string, status: RecordStatus } };

export type UpdateSubjectMutationVariables = Exact<{
  input: UpdateSubjectInput;
}>;


export type UpdateSubjectMutation = { updateSubject: { id: string, name: string, status: RecordStatus } };

export type UpdateSchoolSettingsMutationVariables = Exact<{
  input: UpdateSchoolSettingsInput;
}>;


export type UpdateSchoolSettingsMutation = { updateSchoolSettings: { schoolName: string, timezone: string, defaultLocale: string, defaultHomeworkWeight: number, defaultQuizWeight: number, defaultExamWeight: number, mark5MinPercent: number, mark4MinPercent: number, mark3MinPercent: number, contactPhone: string | null, officeHours: string | null, telegramUrl: string | null, telegramBotUrl: string | null, tempPasswordUses: number, tempPasswordDays: number } };

export type CreateAcademicYearMutationVariables = Exact<{
  input: CreateAcademicYearInput;
}>;


export type CreateAcademicYearMutation = { createAcademicYear: { id: string } };

export type UpdateAcademicYearMutationVariables = Exact<{
  input: UpdateAcademicYearInput;
}>;


export type UpdateAcademicYearMutation = { updateAcademicYear: { id: string } };

export type SetCurrentAcademicYearMutationVariables = Exact<{
  id: string;
}>;


export type SetCurrentAcademicYearMutation = { setCurrentAcademicYear: { id: string } };

export type CreatePeriodMutationVariables = Exact<{
  input: CreatePeriodInput;
}>;


export type CreatePeriodMutation = { createPeriod: { id: string } };

export type UpdatePeriodMutationVariables = Exact<{
  input: UpdatePeriodInput;
}>;


export type UpdatePeriodMutation = { updatePeriod: { id: string } };

export type LogRecordExportMutationVariables = Exact<{
  input: RecordExportInput;
}>;


export type LogRecordExportMutation = { logRecordExport: boolean };

export type CreateSchoolEventMutationVariables = Exact<{
  input: CreateSchoolEventInput;
}>;


export type CreateSchoolEventMutation = { createSchoolEvent: { id: string } };

export type UpdateSchoolEventMutationVariables = Exact<{
  input: UpdateSchoolEventInput;
}>;


export type UpdateSchoolEventMutation = { updateSchoolEvent: { id: string } };

export type ArchiveSchoolEventMutationVariables = Exact<{
  id: string;
}>;


export type ArchiveSchoolEventMutation = { archiveSchoolEvent: { id: string } };

export type UsersQueryVariables = Exact<{
  input: UsersInquiry;
}>;


export type UsersQuery = { users: { list: Array<{ id: string, loginId: string, role: Role, status: UserStatus, firstName: string, lastName: string, className: string | null, title: string | null, phone: string | null, passwordState: PasswordState, tempPasswordUsesLeft: number | null, lastActiveAt: string | null, links: Array<{ id: string, loginId: string, fullName: string, relation: ParentRelation }> }>, metaCounter: { total: number } } };

export type UserCountsQueryVariables = Exact<{ [key: string]: never; }>;


export type UserCountsQuery = { students: { metaCounter: { total: number } }, teachers: { metaCounter: { total: number } }, parents: { metaCounter: { total: number } }, admins: { metaCounter: { total: number } } };

export type GroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type GroupsQuery = { groups: Array<{ id: string, name: string, studentCount: number, status: RecordStatus }> };

export type CoursesQueryVariables = Exact<{
  filter?: CoursesFilter | null | undefined;
}>;


export type CoursesQuery = { courses: Array<{ id: string, title: string, status: CourseStatus, isSplitGroup: boolean, groupId: string, groupName: string, subjectId: string, subjectName: string, studentCount: number, teachers: Array<{ id: string, firstName: string, lastName: string, role: CourseTeacherRole }>, gradeCategories: Array<{ id: string, name: string, weight: number }> }> };

export type SubjectsQueryVariables = Exact<{
  includeArchived?: boolean | null | undefined;
}>;


export type SubjectsQuery = { subjects: Array<{ id: string, name: string, status: RecordStatus }> };

export type TeachersQueryVariables = Exact<{ [key: string]: never; }>;


export type TeachersQuery = { users: { list: Array<{ id: string, loginId: string, firstName: string, lastName: string, title: string | null }> } };

export type AcademicYearsQueryVariables = Exact<{ [key: string]: never; }>;


export type AcademicYearsQuery = { academicYears: Array<{ id: string, name: string, startsAt: string, endsAt: string, isCurrent: boolean }> };

export type RecordCoursesQueryVariables = Exact<{
  filter?: CoursesFilter | null | undefined;
}>;


export type RecordCoursesQuery = { courses: Array<{ id: string, title: string, groupName: string, subjectName: string }> };

export type CoursePeriodGradesQueryVariables = Exact<{
  courseId: string;
  periodId: string;
}>;


export type CoursePeriodGradesQuery = { coursePeriodGrades: Array<{ studentId: string, loginId: string, firstName: string, lastName: string, score: number | null, mark: number | null, isPublished: boolean }> };

export type AttendanceJournalQueryVariables = Exact<{
  courseId: string;
  from: string;
  to: string;
}>;


export type AttendanceJournalQuery = { attendanceJournal: { dates: Array<string>, rows: Array<{ studentId: string, loginId: string, firstName: string, lastName: string, statuses: Array<AttendanceStatus> }> } };

export type ReportCardQueryVariables = Exact<{
  studentId: string;
}>;


export type ReportCardQuery = { studentOverview: { student: { id: string, loginId: string, firstName: string, lastName: string, className: string | null }, period: { id: string, name: string } | null, attendance: { total: number, absent: number, rate: number | null }, courses: Array<{ courseId: string, title: string, subjectName: string, teacherName: string | null, score: number | null, mark: number | null, isPublished: boolean, attendanceRate: number | null }> } };

export type AdminDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminDashboardQuery = { adminDashboard: { today: string, students: number, newStudentsThisMonth: number, teachers: number, newTeachersThisMonth: number, classes: number, courses: number, attendanceThisMonth: number | null, attendanceLastMonth: number | null, notSignedIn: number, accounts: number, period: { id: string, name: string, week: number, weeks: number } | null, needsAttention: { total: number, high: number, medium: number, low: number, students: Array<{ studentId: string, loginId: string, firstName: string, lastName: string, className: string | null, priority: AttentionPriority, attendanceRate: number, marks: number }> }, recentActivity: Array<{ id: string, action: string, actorName: string | null, createdAt: string }> } };

export type AttendanceOverviewQueryVariables = Exact<{
  range: AttendanceRange;
}>;


export type AttendanceOverviewQuery = { attendanceOverview: { from: string, to: string, present: number, late: number, excused: number, absent: number, total: number } };

export type DashboardCalendarQueryVariables = Exact<{
  month: string;
}>;


export type DashboardCalendarQuery = { dashboardCalendar: Array<{ id: string, kind: CalendarEventKind, title: string, startsOn: string, endsOn: string, note: string | null, schoolEventId: string | null }> };

export type HealthQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthQuery = { health: { status: string, postgres: boolean, redis: boolean } };

export type CurrentYearQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentYearQuery = { currentAcademicYear: { id: string, name: string } | null };

export type UnreadAnnouncementsQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadAnnouncementsQuery = { announcements: { unread: number } };

export type PeriodsQueryVariables = Exact<{
  academicYearId: string;
}>;


export type PeriodsQuery = { periods: Array<{ id: string, name: string, kind: PeriodKind, order: number, startsAt: string, endsAt: string, parentId: string | null }> };

export type SchoolSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type SchoolSettingsQuery = { schoolSettings: { schoolName: string, timezone: string, defaultLocale: string, defaultHomeworkWeight: number, defaultQuizWeight: number, defaultExamWeight: number, mark5MinPercent: number, mark4MinPercent: number, mark3MinPercent: number, contactPhone: string | null, officeHours: string | null, telegramUrl: string | null, telegramBotUrl: string | null, tempPasswordUses: number, tempPasswordDays: number } };

export type StudentOverviewQueryVariables = Exact<{ [key: string]: never; }>;


export type StudentOverviewQuery = { studentOverview: { student: { id: string, firstName: string, className: string | null }, period: { id: string, name: string, week: number } | null, courses: Array<{ courseId: string, title: string, subjectName: string, teacherName: string | null, progress: number | null, newCount: number }>, continueLessons: Array<{ lessonId: string, courseId: string, subjectName: string, title: string, type: LessonType, durationSec: number | null, percent: number | null }>, upcoming: Array<{ assignmentId: string, courseId: string, courseTitle: string, title: string, type: AssignmentType, dueAt: string, isDone: boolean }>, overdue: Array<{ assignmentId: string, courseId: string, courseTitle: string, title: string, type: AssignmentType, dueAt: string }> } };

export type StudentCalendarQueryVariables = Exact<{
  month: string;
}>;


export type StudentCalendarQuery = { studentCalendar: Array<{ id: string, kind: CalendarEventKind, title: string, startsOn: string, endsOn: string, note: string | null, courseId: string | null, assignmentId: string | null }> };

export type StudentCourseQueryVariables = Exact<{
  courseId: string;
}>;


export type StudentCourseQuery = { courseDetail: { id: string, title: string, subjectName: string, groupName: string, teachers: Array<{ role: CourseTeacherRole, firstName: string, lastName: string }>, modules: Array<{ id: string, title: string, order: number, startsAt: string | null, endsAt: string | null, lessons: Array<{ id: string, title: string, type: LessonType, order: number, file: { id: string, name: string, mimeType: string, size: number, durationSec: number | null } | null }> }> }, courseAssignments: Array<{ id: string, moduleId: string | null, type: AssignmentType, title: string, maxScore: number, dueAt: string | null, allowLate: boolean, gradesPublishedAt: string | null }>, courseProgress: { progress: number | null, lessons: Array<{ lessonId: string, status: ProgressStatus, percent: number | null }>, assignments: Array<{ assignmentId: string, status: SubmissionStatus | null, score: number | null }> } };

export type CreateModuleMutationVariables = Exact<{
  input: CreateModuleInput;
}>;


export type CreateModuleMutation = { createModule: { id: string } };

export type UpdateModuleMutationVariables = Exact<{
  input: UpdateModuleInput;
}>;


export type UpdateModuleMutation = { updateModule: { id: string, isHidden: boolean } };

export type PublishModuleMutationVariables = Exact<{
  input: PublishInput;
}>;


export type PublishModuleMutation = { publishModule: { id: string, publishedAt: string | null } };

export type ReorderModulesMutationVariables = Exact<{
  input: ReorderInput;
}>;


export type ReorderModulesMutation = { reorderModules: Array<{ id: string, order: number }> };

export type CreateLessonMutationVariables = Exact<{
  input: CreateLessonInput;
}>;


export type CreateLessonMutation = { createLesson: { id: string } };

export type UpdateLessonMutationVariables = Exact<{
  input: UpdateLessonInput;
}>;


export type UpdateLessonMutation = { updateLesson: { id: string } };

export type PublishLessonMutationVariables = Exact<{
  input: PublishInput;
}>;


export type PublishLessonMutation = { publishLesson: { id: string, publishedAt: string | null } };

export type ReorderLessonsMutationVariables = Exact<{
  input: ReorderInput;
}>;


export type ReorderLessonsMutation = { reorderLessons: { id: string } };

export type SetLessonVideoMutationVariables = Exact<{
  input: SetLessonVideoInput;
}>;


export type SetLessonVideoMutation = { setLessonVideo: { id: string } };

export type SetLessonFileMutationVariables = Exact<{
  input: SetLessonFileInput;
}>;


export type SetLessonFileMutation = { setLessonFile: { id: string } };

export type CreateUploadMutationVariables = Exact<{
  input: CreateUploadInput;
}>;


export type CreateUploadMutation = { createUpload: { assetId: string, uploadUrl: string } };

export type ConfirmUploadMutationVariables = Exact<{
  assetId: string;
}>;


export type ConfirmUploadMutation = { confirmUpload: { id: string, status: MediaStatus, originalName: string, size: number } };

export type CreateAssignmentMutationVariables = Exact<{
  input: CreateAssignmentInput;
}>;


export type CreateAssignmentMutation = { createAssignment: { id: string } };

export type UpdateAssignmentMutationVariables = Exact<{
  input: UpdateAssignmentInput;
}>;


export type UpdateAssignmentMutation = { updateAssignment: { id: string } };

export type PublishAssignmentMutationVariables = Exact<{
  input: PublishInput;
}>;


export type PublishAssignmentMutation = { publishAssignment: { id: string, publishedAt: string | null } };

export type GradeSubmissionMutationVariables = Exact<{
  input: GradeSubmissionInput;
}>;


export type GradeSubmissionMutation = { gradeSubmission: { id: string, status: SubmissionStatus, score: number | null, feedback: string | null, gradedAt: string | null, gradedByName: string | null } };

export type ReturnSubmissionMutationVariables = Exact<{
  input: ReturnSubmissionInput;
}>;


export type ReturnSubmissionMutation = { returnSubmission: { id: string, status: SubmissionStatus } };

export type GiveZeroToMissingMutationVariables = Exact<{
  assignmentId: string;
}>;


export type GiveZeroToMissingMutation = { giveZeroToMissing: number };

export type PublishGradesMutationVariables = Exact<{
  input: PublishGradesInput;
}>;


export type PublishGradesMutation = { publishGrades: { id: string, gradesPublishedAt: string | null } };

export type SetGradeCategoriesMutationVariables = Exact<{
  input: SetGradeCategoriesInput;
}>;


export type SetGradeCategoriesMutation = { setGradeCategories: Array<{ id: string, name: string, weight: number, order: number }> };

export type PublishPeriodGradesMutationVariables = Exact<{
  input: PublishPeriodGradesInput;
}>;


export type PublishPeriodGradesMutation = { publishPeriodGrades: Array<{ studentId: string, isPublished: boolean, publishedAt: string | null }> };

export type MarkAttendanceMutationVariables = Exact<{
  input: MarkAttendanceInput;
}>;


export type MarkAttendanceMutation = { markAttendance: { courseId: string, date: string, isMarked: boolean, rows: Array<{ studentId: string, status: AttendanceStatus, note: string | null }> } };

export type CreateCourseAnnouncementsMutationVariables = Exact<{
  input: CreateCourseAnnouncementsInput;
}>;


export type CreateCourseAnnouncementsMutation = { createCourseAnnouncements: Array<{ id: string }> };

export type UpdateAnnouncementMutationVariables = Exact<{
  input: UpdateAnnouncementInput;
}>;


export type UpdateAnnouncementMutation = { updateAnnouncement: { id: string, isPinned: boolean } };

export type ArchiveAnnouncementMutationVariables = Exact<{
  id: string;
}>;


export type ArchiveAnnouncementMutation = { archiveAnnouncement: { id: string } };

export type TeacherDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherDashboardQuery = { teacherDashboard: { today: string, holiday: string | null, toGradeTotal: number, period: { id: string, name: string, week: number, weeks: number } | null, todayCourses: Array<{ courseId: string, title: string, students: number, marked: number }>, grading: Array<{ assignmentId: string, courseId: string, courseTitle: string, title: string, type: AssignmentType, toGrade: number, submitted: number, graded: number, students: number, dueAt: string | null, allowLate: boolean, readyToPublish: boolean }>, courses: Array<{ id: string, title: string, status: CourseStatus, students: number, week: number | null }>, deadlines: Array<{ id: string, kind: DeadlineKind, title: string, courseTitles: Array<string>, date: string, dueAt: string | null }>, announcements: Array<{ id: string, title: string, courseTitle: string | null, publishedAt: string, reads: number, audience: number | null }> } };

export type TeachingCoursesQueryVariables = Exact<{ [key: string]: never; }>;


export type TeachingCoursesQuery = { teachingCourses: Array<{ id: string, title: string, status: CourseStatus, studentCount: number, groupName: string, subjectName: string }> };

export type TeacherCourseQueryVariables = Exact<{
  courseId: string;
}>;


export type TeacherCourseQuery = { courseDetail: { id: string, title: string, status: CourseStatus, academicYearId: string, groupName: string, subjectName: string, studentCount: number, modules: Array<{ id: string, title: string, order: number, startsAt: string | null, endsAt: string | null, isHidden: boolean, publishedAt: string | null, lessons: Array<{ id: string, moduleId: string, title: string, type: LessonType, body: string | null, dueAt: string | null, order: number, publishedAt: string | null, videoAssetId: string | null, file: { id: string, kind: MediaKind, status: MediaStatus, name: string, mimeType: string, size: number, durationSec: number | null } | null }> }> } };

export type CourseAssignmentsQueryVariables = Exact<{
  courseId: string;
}>;


export type CourseAssignmentsQuery = { courseAssignments: Array<{ id: string, moduleId: string | null, categoryId: string, type: AssignmentType, title: string, instructions: string | null, maxScore: number, dueAt: string | null, allowLate: boolean, maxAttempts: number, acceptedFileTypes: Array<string>, publishedAt: string | null, gradesPublishedAt: string | null, files: Array<{ id: string, kind: MediaKind, status: MediaStatus, name: string, mimeType: string, size: number, durationSec: number | null }> }> };

export type CoursePeriodsQueryVariables = Exact<{
  academicYearId: string;
}>;


export type CoursePeriodsQuery = { periods: Array<{ id: string, name: string, parentId: string | null, startsAt: string, endsAt: string }> };

export type CourseFileUrlQueryVariables = Exact<{
  assetId: string;
}>;


export type CourseFileUrlQuery = { courseFileUrl: { url: string } };

export type TeacherLessonVideoQueryVariables = Exact<{
  lessonId: string;
}>;


export type TeacherLessonVideoQuery = { lessonVideo: { url: string } };

export type GradingAssignmentQueryVariables = Exact<{
  id: string;
}>;


export type GradingAssignmentQuery = { assignment: { id: string, courseId: string, type: AssignmentType, title: string, instructions: string | null, maxScore: number, dueAt: string | null, allowLate: boolean, maxAttempts: number, publishedAt: string | null, gradesPublishedAt: string | null } };

export type AssignmentSubmissionsQueryVariables = Exact<{
  assignmentId: string;
}>;


export type AssignmentSubmissionsQuery = { assignmentSubmissions: Array<{ studentId: string, loginId: string, firstName: string, lastName: string, submission: { id: string, status: SubmissionStatus, score: number | null, feedback: string | null, submittedAt: string | null, gradedAt: string | null, gradedByName: string | null, attemptsLeft: number, attempts: Array<{ number: number, text: string | null, isLate: boolean, submittedAt: string, files: Array<{ assetId: string, originalName: string, mimeType: string, size: number, url: string | null }> }> } | null }> };

export type GradebookCoursesQueryVariables = Exact<{ [key: string]: never; }>;


export type GradebookCoursesQuery = { teachingCourses: Array<{ id: string, title: string, status: CourseStatus, academicYearId: string, studentCount: number, gradeCategories: Array<{ id: string, name: string, weight: number, order: number }> }> };

export type GradebookGradesQueryVariables = Exact<{
  courseId: string;
  periodId: string;
}>;


export type GradebookGradesQuery = { courseGrades: Array<{ studentId: string, loginId: string, firstName: string, lastName: string, percent: number | null, mark: number | null, categories: Array<{ categoryId: string, name: string, weight: number, percent: number | null, count: number, earned: number, possible: number }>, items: Array<{ assignmentId: string, title: string, categoryName: string, type: AssignmentType, score: number, maxScore: number, status: SubmissionStatus, dueAt: string | null }> }> };

export type GradebookPeriodGradesQueryVariables = Exact<{
  courseId: string;
  periodId: string;
}>;


export type GradebookPeriodGradesQuery = { coursePeriodGrades: Array<{ studentId: string, isPublished: boolean, publishedAt: string | null, isOutdated: boolean, score: number | null }> };

export type GradebookAnnualGradesQueryVariables = Exact<{
  courseId: string;
}>;


export type GradebookAnnualGradesQuery = { courseAnnualGrades: Array<{ periods: Array<{ periodId: string | null, periodName: string, score: number | null, mark: number | null, isPublished: boolean }>, annual: { studentId: string, loginId: string, firstName: string, lastName: string, score: number | null, mark: number | null, finalScore: number | null } }> };

export type TeacherAttendanceQueryVariables = Exact<{
  courseId: string;
  date: string;
}>;


export type TeacherAttendanceQuery = { courseAttendance: { courseId: string, date: string, isMarked: boolean, rows: Array<{ studentId: string, loginId: string, firstName: string, lastName: string, status: AttendanceStatus, note: string | null }> } };

export type TeacherAnnouncementsQueryVariables = Exact<{
  input?: AnnouncementsInquiry | null | undefined;
}>;


export type TeacherAnnouncementsQuery = { announcements: { total: number, list: Array<{ id: string, title: string, body: string, courseId: string | null, courseTitle: string | null, isPinned: boolean, publishedAt: string, authorName: string, authorRole: Role, audience: number | null, studentReads: number | null, files: Array<{ id: string, kind: MediaKind, status: MediaStatus, name: string, mimeType: string, size: number, durationSec: number | null }> }> } };

export type ChangePasswordMutationVariables = Exact<{
  input: ChangePasswordInput;
}>;


export type ChangePasswordMutation = { changePassword: { accessToken: string } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, loginId: string, role: Role, firstName: string, lastName: string, locale: string, mustChangePassword: boolean } };

export type MyChildrenQueryVariables = Exact<{ [key: string]: never; }>;


export type MyChildrenQuery = { myChildren: Array<{ id: string, loginId: string, firstName: string, lastName: string, className: string | null }> };


export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}}]}}]} as unknown as DocumentNode<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const BlockUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BlockUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blockUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode<BlockUserMutation, BlockUserMutationVariables>;
export const UnblockUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnblockUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unblockUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}]}}]} as unknown as DocumentNode<UnblockUserMutation, UnblockUserMutationVariables>;
export const MoveStudentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveStudent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MoveStudentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveStudent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}}]}}]}}]} as unknown as DocumentNode<MoveStudentMutation, MoveStudentMutationVariables>;
export const CreateStudentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateStudent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateStudentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createStudent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"student"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}}]}}]}}]} as unknown as DocumentNode<CreateStudentMutation, CreateStudentMutationVariables>;
export const LinkParentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LinkParent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"studentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ParentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkParent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"studentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"studentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}}]}}]} as unknown as DocumentNode<LinkParentMutation, LinkParentMutationVariables>;
export const CreateTeacherDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTeacher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTeacherInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeacher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}}]}}]} as unknown as DocumentNode<CreateTeacherMutation, CreateTeacherMutationVariables>;
export const PreviewStudentImportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PreviewStudentImport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"csv"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewStudentImport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"csv"},"value":{"kind":"Variable","name":{"kind":"Name","value":"csv"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"line"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"className"}},{"kind":"Field","name":{"kind":"Name","value":"admissionYear"}},{"kind":"Field","name":{"kind":"Name","value":"parentName"}},{"kind":"Field","name":{"kind":"Name","value":"parentPhone"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"loginIdPreview"}},{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"linkParent"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]}}]} as unknown as DocumentNode<PreviewStudentImportMutation, PreviewStudentImportMutationVariables>;
export const ImportStudentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportStudents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"csv"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skipErrors"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importStudents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"csv"},"value":{"kind":"Variable","name":{"kind":"Name","value":"csv"}}},{"kind":"Argument","name":{"kind":"Name","value":"skipErrors"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skipErrors"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"linkedParents"}},{"kind":"Field","name":{"kind":"Name","value":"skipped"}},{"kind":"Field","name":{"kind":"Name","value":"slips"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"student"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"tempPassword"}},{"kind":"Field","name":{"kind":"Name","value":"isNew"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ImportStudentsMutation, ImportStudentsMutationVariables>;
export const CreateGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CreateGroupMutation, CreateGroupMutationVariables>;
export const UpdateGroupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateGroupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdateGroupMutation, UpdateGroupMutationVariables>;
export const CreateCourseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCourseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCourse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<CreateCourseMutation, CreateCourseMutationVariables>;
export const SetCourseTeachersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetCourseTeachers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetCourseTeachersInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setCourseTeachers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<SetCourseTeachersMutation, SetCourseTeachersMutationVariables>;
export const CreateSubjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSubjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CreateSubjectMutation, CreateSubjectMutationVariables>;
export const UpdateSubjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSubjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdateSubjectMutation, UpdateSubjectMutationVariables>;
export const UpdateSchoolSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSchoolSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSchoolSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSchoolSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"schoolName"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"defaultLocale"}},{"kind":"Field","name":{"kind":"Name","value":"defaultHomeworkWeight"}},{"kind":"Field","name":{"kind":"Name","value":"defaultQuizWeight"}},{"kind":"Field","name":{"kind":"Name","value":"defaultExamWeight"}},{"kind":"Field","name":{"kind":"Name","value":"mark5MinPercent"}},{"kind":"Field","name":{"kind":"Name","value":"mark4MinPercent"}},{"kind":"Field","name":{"kind":"Name","value":"mark3MinPercent"}},{"kind":"Field","name":{"kind":"Name","value":"contactPhone"}},{"kind":"Field","name":{"kind":"Name","value":"officeHours"}},{"kind":"Field","name":{"kind":"Name","value":"telegramUrl"}},{"kind":"Field","name":{"kind":"Name","value":"telegramBotUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tempPasswordUses"}},{"kind":"Field","name":{"kind":"Name","value":"tempPasswordDays"}}]}}]}}]} as unknown as DocumentNode<UpdateSchoolSettingsMutation, UpdateSchoolSettingsMutationVariables>;
export const CreateAcademicYearDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAcademicYear"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAcademicYearInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAcademicYear"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateAcademicYearMutation, CreateAcademicYearMutationVariables>;
export const UpdateAcademicYearDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAcademicYear"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAcademicYearInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAcademicYear"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateAcademicYearMutation, UpdateAcademicYearMutationVariables>;
export const SetCurrentAcademicYearDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetCurrentAcademicYear"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setCurrentAcademicYear"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetCurrentAcademicYearMutation, SetCurrentAcademicYearMutationVariables>;
export const CreatePeriodDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePeriod"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePeriodInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPeriod"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreatePeriodMutation, CreatePeriodMutationVariables>;
export const UpdatePeriodDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePeriod"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePeriodInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePeriod"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdatePeriodMutation, UpdatePeriodMutationVariables>;
export const LogRecordExportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogRecordExport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RecordExportInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logRecordExport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<LogRecordExportMutation, LogRecordExportMutationVariables>;
export const CreateSchoolEventDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSchoolEvent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSchoolEventInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSchoolEvent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateSchoolEventMutation, CreateSchoolEventMutationVariables>;
export const UpdateSchoolEventDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSchoolEvent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSchoolEventInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSchoolEvent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateSchoolEventMutation, UpdateSchoolEventMutationVariables>;
export const ArchiveSchoolEventDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveSchoolEvent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveSchoolEvent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ArchiveSchoolEventMutation, ArchiveSchoolEventMutationVariables>;
export const UsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Users"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UsersInquiry"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"list"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"className"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"passwordState"}},{"kind":"Field","name":{"kind":"Name","value":"tempPasswordUsesLeft"}},{"kind":"Field","name":{"kind":"Name","value":"lastActiveAt"}},{"kind":"Field","name":{"kind":"Name","value":"links"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"relation"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaCounter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]}}]} as unknown as DocumentNode<UsersQuery, UsersQueryVariables>;
export const UserCountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserCounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"students"},"name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"search"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"EnumValue","value":"STUDENT"}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metaCounter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"teachers"},"name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"search"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"EnumValue","value":"TEACHER"}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metaCounter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"parents"},"name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"search"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"EnumValue","value":"PARENT"}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metaCounter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"admins"},"name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"search"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"EnumValue","value":"ADMIN"}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metaCounter"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]}}]} as unknown as DocumentNode<UserCountsQuery, UserCountsQueryVariables>;
export const GroupsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Groups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"groups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<GroupsQuery, GroupsQueryVariables>;
export const CoursesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Courses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoursesFilter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isSplitGroup"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}},{"kind":"Field","name":{"kind":"Name","value":"groupName"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gradeCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"weight"}}]}}]}}]}}]} as unknown as DocumentNode<CoursesQuery, CoursesQueryVariables>;
export const SubjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Subjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeArchived"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"includeArchived"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeArchived"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SubjectsQuery, SubjectsQueryVariables>;
export const TeachersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"100"}},{"kind":"ObjectField","name":{"kind":"Name","value":"sort"},"value":{"kind":"StringValue","value":"lastName","block":false}},{"kind":"ObjectField","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"ASC"}},{"kind":"ObjectField","name":{"kind":"Name","value":"search"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"EnumValue","value":"TEACHER"}},{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"EnumValue","value":"ACTIVE"}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"list"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]} as unknown as DocumentNode<TeachersQuery, TeachersQueryVariables>;
export const AcademicYearsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AcademicYears"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"academicYears"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"isCurrent"}}]}}]}}]} as unknown as DocumentNode<AcademicYearsQuery, AcademicYearsQueryVariables>;
export const RecordCoursesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RecordCourses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoursesFilter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"groupName"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}}]}}]}}]} as unknown as DocumentNode<RecordCoursesQuery, RecordCoursesQueryVariables>;
export const CoursePeriodGradesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CoursePeriodGrades"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"periodId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coursePeriodGrades"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"periodId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"periodId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"mark"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}}]}}]}}]} as unknown as DocumentNode<CoursePeriodGradesQuery, CoursePeriodGradesQueryVariables>;
export const AttendanceJournalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AttendanceJournal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceJournal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dates"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"statuses"}}]}}]}}]}}]} as unknown as DocumentNode<AttendanceJournalQuery, AttendanceJournalQueryVariables>;
export const ReportCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReportCard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"studentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentOverview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"studentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"studentId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"student"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"className"}}]}},{"kind":"Field","name":{"kind":"Name","value":"period"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attendance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"absent"}},{"kind":"Field","name":{"kind":"Name","value":"rate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}},{"kind":"Field","name":{"kind":"Name","value":"teacherName"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"mark"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRate"}}]}}]}}]}}]} as unknown as DocumentNode<ReportCardQuery, ReportCardQueryVariables>;
export const AdminDashboardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminDashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminDashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"period"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"week"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"students"}},{"kind":"Field","name":{"kind":"Name","value":"newStudentsThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"teachers"}},{"kind":"Field","name":{"kind":"Name","value":"newTeachersThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"classes"}},{"kind":"Field","name":{"kind":"Name","value":"courses"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceLastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"notSignedIn"}},{"kind":"Field","name":{"kind":"Name","value":"accounts"}},{"kind":"Field","name":{"kind":"Name","value":"needsAttention"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"high"}},{"kind":"Field","name":{"kind":"Name","value":"medium"}},{"kind":"Field","name":{"kind":"Name","value":"low"}},{"kind":"Field","name":{"kind":"Name","value":"students"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"className"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"attendanceRate"}},{"kind":"Field","name":{"kind":"Name","value":"marks"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"recentActivity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"actorName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdminDashboardQuery, AdminDashboardQueryVariables>;
export const AttendanceOverviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AttendanceOverview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AttendanceRange"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceOverview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"from"}},{"kind":"Field","name":{"kind":"Name","value":"to"}},{"kind":"Field","name":{"kind":"Name","value":"present"}},{"kind":"Field","name":{"kind":"Name","value":"late"}},{"kind":"Field","name":{"kind":"Name","value":"excused"}},{"kind":"Field","name":{"kind":"Name","value":"absent"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<AttendanceOverviewQuery, AttendanceOverviewQueryVariables>;
export const DashboardCalendarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DashboardCalendar"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"month"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dashboardCalendar"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"month"},"value":{"kind":"Variable","name":{"kind":"Name","value":"month"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"schoolEventId"}}]}}]}}]} as unknown as DocumentNode<DashboardCalendarQuery, DashboardCalendarQueryVariables>;
export const HealthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Health"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"health"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"postgres"}},{"kind":"Field","name":{"kind":"Name","value":"redis"}}]}}]}}]} as unknown as DocumentNode<HealthQuery, HealthQueryVariables>;
export const CurrentYearDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentYear"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentAcademicYear"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<CurrentYearQuery, CurrentYearQueryVariables>;
export const UnreadAnnouncementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UnreadAnnouncements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"announcements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unread"}}]}}]}}]} as unknown as DocumentNode<UnreadAnnouncementsQuery, UnreadAnnouncementsQueryVariables>;
export const PeriodsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Periods"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"academicYearId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"periods"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"academicYearId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"academicYearId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}}]}}]}}]} as unknown as DocumentNode<PeriodsQuery, PeriodsQueryVariables>;
export const SchoolSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SchoolSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"schoolSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"schoolName"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"defaultLocale"}},{"kind":"Field","name":{"kind":"Name","value":"defaultHomeworkWeight"}},{"kind":"Field","name":{"kind":"Name","value":"defaultQuizWeight"}},{"kind":"Field","name":{"kind":"Name","value":"defaultExamWeight"}},{"kind":"Field","name":{"kind":"Name","value":"mark5MinPercent"}},{"kind":"Field","name":{"kind":"Name","value":"mark4MinPercent"}},{"kind":"Field","name":{"kind":"Name","value":"mark3MinPercent"}},{"kind":"Field","name":{"kind":"Name","value":"contactPhone"}},{"kind":"Field","name":{"kind":"Name","value":"officeHours"}},{"kind":"Field","name":{"kind":"Name","value":"telegramUrl"}},{"kind":"Field","name":{"kind":"Name","value":"telegramBotUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tempPasswordUses"}},{"kind":"Field","name":{"kind":"Name","value":"tempPasswordDays"}}]}}]}}]} as unknown as DocumentNode<SchoolSettingsQuery, SchoolSettingsQueryVariables>;
export const StudentOverviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentOverview"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentOverview"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"student"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"className"}}]}},{"kind":"Field","name":{"kind":"Name","value":"period"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"week"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}},{"kind":"Field","name":{"kind":"Name","value":"teacherName"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"newCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"continueLessons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonId"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"durationSec"}},{"kind":"Field","name":{"kind":"Name","value":"percent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"upcoming"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignmentId"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"isDone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"overdue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignmentId"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}}]}}]}}]}}]} as unknown as DocumentNode<StudentOverviewQuery, StudentOverviewQueryVariables>;
export const StudentCalendarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentCalendar"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"month"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentCalendar"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"month"},"value":{"kind":"Variable","name":{"kind":"Name","value":"month"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"assignmentId"}}]}}]}}]} as unknown as DocumentNode<StudentCalendarQuery, StudentCalendarQueryVariables>;
export const StudentCourseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StudentCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseDetail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}},{"kind":"Field","name":{"kind":"Name","value":"groupName"}},{"kind":"Field","name":{"kind":"Name","value":"teachers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"lessons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"durationSec"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"courseAssignments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"moduleId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"maxScore"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"allowLate"}},{"kind":"Field","name":{"kind":"Name","value":"gradesPublishedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courseProgress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"lessons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"percent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignmentId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}}]}}]}}]} as unknown as DocumentNode<StudentCourseQuery, StudentCourseQueryVariables>;
export const CreateModuleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateModule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateModuleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createModule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateModuleMutation, CreateModuleMutationVariables>;
export const UpdateModuleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateModule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateModuleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateModule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}}]}}]}}]} as unknown as DocumentNode<UpdateModuleMutation, UpdateModuleMutationVariables>;
export const PublishModuleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishModule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishModule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishModuleMutation, PublishModuleMutationVariables>;
export const ReorderModulesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReorderModules"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReorderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reorderModules"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]} as unknown as DocumentNode<ReorderModulesMutation, ReorderModulesMutationVariables>;
export const CreateLessonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLesson"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateLessonInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLesson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateLessonMutation, CreateLessonMutationVariables>;
export const UpdateLessonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLesson"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateLessonInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLesson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateLessonMutation, UpdateLessonMutationVariables>;
export const PublishLessonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishLesson"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishLesson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishLessonMutation, PublishLessonMutationVariables>;
export const ReorderLessonsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReorderLessons"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReorderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reorderLessons"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ReorderLessonsMutation, ReorderLessonsMutationVariables>;
export const SetLessonVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetLessonVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetLessonVideoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setLessonVideo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetLessonVideoMutation, SetLessonVideoMutationVariables>;
export const SetLessonFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetLessonFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetLessonFileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setLessonFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetLessonFileMutation, SetLessonFileMutationVariables>;
export const CreateUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateUploadInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assetId"}},{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}}]}}]}}]} as unknown as DocumentNode<CreateUploadMutation, CreateUploadMutationVariables>;
export const ConfirmUploadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfirmUpload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"confirmUpload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"assetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assetId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"originalName"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]}}]} as unknown as DocumentNode<ConfirmUploadMutation, ConfirmUploadMutationVariables>;
export const CreateAssignmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateAssignmentMutation, CreateAssignmentMutationVariables>;
export const UpdateAssignmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateAssignmentMutation, UpdateAssignmentMutationVariables>;
export const PublishAssignmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishAssignmentMutation, PublishAssignmentMutationVariables>;
export const GradeSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GradeSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GradeSubmissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gradeSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"feedback"}},{"kind":"Field","name":{"kind":"Name","value":"gradedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gradedByName"}}]}}]}}]} as unknown as DocumentNode<GradeSubmissionMutation, GradeSubmissionMutationVariables>;
export const ReturnSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReturnSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReturnSubmissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"returnSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ReturnSubmissionMutation, ReturnSubmissionMutationVariables>;
export const GiveZeroToMissingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GiveZeroToMissing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assignmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"giveZeroToMissing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"assignmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assignmentId"}}}]}]}}]} as unknown as DocumentNode<GiveZeroToMissingMutation, GiveZeroToMissingMutationVariables>;
export const PublishGradesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishGrades"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishGradesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishGrades"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gradesPublishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishGradesMutation, PublishGradesMutationVariables>;
export const SetGradeCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetGradeCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetGradeCategoriesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setGradeCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"weight"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]} as unknown as DocumentNode<SetGradeCategoriesMutation, SetGradeCategoriesMutationVariables>;
export const PublishPeriodGradesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishPeriodGrades"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublishPeriodGradesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishPeriodGrades"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishPeriodGradesMutation, PublishPeriodGradesMutationVariables>;
export const MarkAttendanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkAttendance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarkAttendanceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markAttendance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"isMarked"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"note"}}]}}]}}]}}]} as unknown as DocumentNode<MarkAttendanceMutation, MarkAttendanceMutationVariables>;
export const CreateCourseAnnouncementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCourseAnnouncements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCourseAnnouncementsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCourseAnnouncements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateCourseAnnouncementsMutation, CreateCourseAnnouncementsMutationVariables>;
export const UpdateAnnouncementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAnnouncement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAnnouncementInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAnnouncement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}}]}}]}}]} as unknown as DocumentNode<UpdateAnnouncementMutation, UpdateAnnouncementMutationVariables>;
export const ArchiveAnnouncementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveAnnouncement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveAnnouncement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ArchiveAnnouncementMutation, ArchiveAnnouncementMutationVariables>;
export const TeacherDashboardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherDashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherDashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"today"}},{"kind":"Field","name":{"kind":"Name","value":"period"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"week"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"holiday"}},{"kind":"Field","name":{"kind":"Name","value":"todayCourses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"students"}},{"kind":"Field","name":{"kind":"Name","value":"marked"}}]}},{"kind":"Field","name":{"kind":"Name","value":"toGradeTotal"}},{"kind":"Field","name":{"kind":"Name","value":"grading"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignmentId"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"toGrade"}},{"kind":"Field","name":{"kind":"Name","value":"submitted"}},{"kind":"Field","name":{"kind":"Name","value":"graded"}},{"kind":"Field","name":{"kind":"Name","value":"students"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"allowLate"}},{"kind":"Field","name":{"kind":"Name","value":"readyToPublish"}}]}},{"kind":"Field","name":{"kind":"Name","value":"courses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"students"}},{"kind":"Field","name":{"kind":"Name","value":"week"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deadlines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitles"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"announcements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"reads"}},{"kind":"Field","name":{"kind":"Name","value":"audience"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherDashboardQuery, TeacherDashboardQueryVariables>;
export const TeachingCoursesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeachingCourses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teachingCourses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"groupName"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}}]}}]}}]} as unknown as DocumentNode<TeachingCoursesQuery, TeachingCoursesQueryVariables>;
export const TeacherCourseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherCourse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseDetail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"academicYearId"}},{"kind":"Field","name":{"kind":"Name","value":"groupName"}},{"kind":"Field","name":{"kind":"Name","value":"subjectName"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lessons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"moduleId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"videoAssetId"}},{"kind":"Field","name":{"kind":"Name","value":"file"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"durationSec"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<TeacherCourseQuery, TeacherCourseQueryVariables>;
export const CourseAssignmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CourseAssignments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseAssignments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"moduleId"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"maxScore"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"allowLate"}},{"kind":"Field","name":{"kind":"Name","value":"maxAttempts"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedFileTypes"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gradesPublishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"durationSec"}}]}}]}}]}}]} as unknown as DocumentNode<CourseAssignmentsQuery, CourseAssignmentsQueryVariables>;
export const CoursePeriodsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CoursePeriods"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"academicYearId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"periods"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"academicYearId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"academicYearId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]}}]} as unknown as DocumentNode<CoursePeriodsQuery, CoursePeriodsQueryVariables>;
export const CourseFileUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CourseFileUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseFileUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"assetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assetId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]} as unknown as DocumentNode<CourseFileUrlQuery, CourseFileUrlQueryVariables>;
export const TeacherLessonVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherLessonVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lessonId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lessonVideo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"lessonId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lessonId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]} as unknown as DocumentNode<TeacherLessonVideoQuery, TeacherLessonVideoQueryVariables>;
export const GradingAssignmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GradingAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"maxScore"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}},{"kind":"Field","name":{"kind":"Name","value":"allowLate"}},{"kind":"Field","name":{"kind":"Name","value":"maxAttempts"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gradesPublishedAt"}}]}}]}}]} as unknown as DocumentNode<GradingAssignmentQuery, GradingAssignmentQueryVariables>;
export const AssignmentSubmissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AssignmentSubmissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assignmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignmentSubmissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"assignmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assignmentId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"submission"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"feedback"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gradedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gradedByName"}},{"kind":"Field","name":{"kind":"Name","value":"attemptsLeft"}},{"kind":"Field","name":{"kind":"Name","value":"attempts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"isLate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assetId"}},{"kind":"Field","name":{"kind":"Name","value":"originalName"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<AssignmentSubmissionsQuery, AssignmentSubmissionsQueryVariables>;
export const GradebookCoursesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GradebookCourses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teachingCourses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"academicYearId"}},{"kind":"Field","name":{"kind":"Name","value":"studentCount"}},{"kind":"Field","name":{"kind":"Name","value":"gradeCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"weight"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]} as unknown as DocumentNode<GradebookCoursesQuery, GradebookCoursesQueryVariables>;
export const GradebookGradesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GradebookGrades"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"periodId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseGrades"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"periodId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"periodId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"percent"}},{"kind":"Field","name":{"kind":"Name","value":"mark"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"weight"}},{"kind":"Field","name":{"kind":"Name","value":"percent"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"earned"}},{"kind":"Field","name":{"kind":"Name","value":"possible"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignmentId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"categoryName"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"maxScore"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dueAt"}}]}}]}}]}}]} as unknown as DocumentNode<GradebookGradesQuery, GradebookGradesQueryVariables>;
export const GradebookPeriodGradesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GradebookPeriodGrades"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"periodId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coursePeriodGrades"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"periodId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"periodId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isOutdated"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}}]}}]} as unknown as DocumentNode<GradebookPeriodGradesQuery, GradebookPeriodGradesQueryVariables>;
export const GradebookAnnualGradesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GradebookAnnualGrades"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseAnnualGrades"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"periods"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"periodId"}},{"kind":"Field","name":{"kind":"Name","value":"periodName"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"mark"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}}]}},{"kind":"Field","name":{"kind":"Name","value":"annual"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"mark"}},{"kind":"Field","name":{"kind":"Name","value":"finalScore"}}]}}]}}]}}]} as unknown as DocumentNode<GradebookAnnualGradesQuery, GradebookAnnualGradesQueryVariables>;
export const TeacherAttendanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAttendance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"date"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseAttendance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"courseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"courseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"date"},"value":{"kind":"Variable","name":{"kind":"Name","value":"date"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"isMarked"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"note"}}]}}]}}]}}]} as unknown as DocumentNode<TeacherAttendanceQuery, TeacherAttendanceQueryVariables>;
export const TeacherAnnouncementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAnnouncements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AnnouncementsInquiry"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"announcements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"list"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"courseId"}},{"kind":"Field","name":{"kind":"Name","value":"courseTitle"}},{"kind":"Field","name":{"kind":"Name","value":"isPinned"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorRole"}},{"kind":"Field","name":{"kind":"Name","value":"audience"}},{"kind":"Field","name":{"kind":"Name","value":"studentReads"}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"durationSec"}}]}}]}}]}}]}}]} as unknown as DocumentNode<TeacherAnnouncementsQuery, TeacherAnnouncementsQueryVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}}]}}]}}]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"mustChangePassword"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const MyChildrenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyChildren"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myChildren"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"className"}}]}}]}}]} as unknown as DocumentNode<MyChildrenQuery, MyChildrenQueryVariables>;