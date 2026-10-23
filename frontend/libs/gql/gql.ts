/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation ResetPassword($userId: String!) {\n    resetPassword(userId: $userId) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n": typeof types.ResetPasswordDocument,
    "\n  mutation BlockUser($userId: String!) {\n    blockUser(userId: $userId)\n  }\n": typeof types.BlockUserDocument,
    "\n  mutation UnblockUser($userId: String!) {\n    unblockUser(userId: $userId)\n  }\n": typeof types.UnblockUserDocument,
    "\n  mutation MoveStudent($input: MoveStudentInput!) {\n    moveStudent(input: $input) {\n      id\n      name\n      studentCount\n    }\n  }\n": typeof types.MoveStudentDocument,
    "\n  mutation CreateStudent($input: CreateStudentInput!) {\n    createStudent(input: $input) {\n      student {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n      parent {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n    }\n  }\n": typeof types.CreateStudentDocument,
    "\n  mutation LinkParent($studentId: String!, $input: ParentInput!) {\n    linkParent(studentId: $studentId, input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n": typeof types.LinkParentDocument,
    "\n  mutation CreateTeacher($input: CreateTeacherInput!) {\n    createTeacher(input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n": typeof types.CreateTeacherDocument,
    "\n  mutation PreviewStudentImport($csv: String!) {\n    previewStudentImport(csv: $csv) {\n      rows {\n        line\n        firstName\n        lastName\n        className\n        admissionYear\n        parentName\n        parentPhone\n        status\n        loginIdPreview\n        errors {\n          code\n          value\n        }\n      }\n      summary {\n        ready\n        linkParent\n        errors\n      }\n    }\n  }\n": typeof types.PreviewStudentImportDocument,
    "\n  mutation ImportStudents($csv: String!, $skipErrors: Boolean!) {\n    importStudents(csv: $csv, skipErrors: $skipErrors) {\n      created\n      linkedParents\n      skipped\n      slips {\n        student {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n        parent {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n      }\n    }\n  }\n": typeof types.ImportStudentsDocument,
    "\n  mutation CreateGroup($input: CreateGroupInput!) {\n    createGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n": typeof types.CreateGroupDocument,
    "\n  mutation UpdateGroup($input: UpdateGroupInput!) {\n    updateGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n": typeof types.UpdateGroupDocument,
    "\n  mutation CreateCourse($input: CreateCourseInput!) {\n    createCourse(input: $input) {\n      id\n      title\n    }\n  }\n": typeof types.CreateCourseDocument,
    "\n  mutation SetCourseTeachers($input: SetCourseTeachersInput!) {\n    setCourseTeachers(input: $input) {\n      id\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n    }\n  }\n": typeof types.SetCourseTeachersDocument,
    "\n  mutation CreateSubject($input: CreateSubjectInput!) {\n    createSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n": typeof types.CreateSubjectDocument,
    "\n  mutation UpdateSubject($input: UpdateSubjectInput!) {\n    updateSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n": typeof types.UpdateSubjectDocument,
    "\n  mutation UpdateSchoolSettings($input: UpdateSchoolSettingsInput!) {\n    updateSchoolSettings(input: $input) {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n": typeof types.UpdateSchoolSettingsDocument,
    "\n  mutation CreateAcademicYear($input: CreateAcademicYearInput!) {\n    createAcademicYear(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateAcademicYearDocument,
    "\n  mutation UpdateAcademicYear($input: UpdateAcademicYearInput!) {\n    updateAcademicYear(input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateAcademicYearDocument,
    "\n  mutation SetCurrentAcademicYear($id: String!) {\n    setCurrentAcademicYear(id: $id) {\n      id\n    }\n  }\n": typeof types.SetCurrentAcademicYearDocument,
    "\n  mutation CreatePeriod($input: CreatePeriodInput!) {\n    createPeriod(input: $input) {\n      id\n    }\n  }\n": typeof types.CreatePeriodDocument,
    "\n  mutation UpdatePeriod($input: UpdatePeriodInput!) {\n    updatePeriod(input: $input) {\n      id\n    }\n  }\n": typeof types.UpdatePeriodDocument,
    "\n  mutation LogRecordExport($input: RecordExportInput!) {\n    logRecordExport(input: $input)\n  }\n": typeof types.LogRecordExportDocument,
    "\n  mutation CreateSchoolEvent($input: CreateSchoolEventInput!) {\n    createSchoolEvent(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateSchoolEventDocument,
    "\n  mutation UpdateSchoolEvent($input: UpdateSchoolEventInput!) {\n    updateSchoolEvent(input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateSchoolEventDocument,
    "\n  mutation ArchiveSchoolEvent($id: String!) {\n    archiveSchoolEvent(id: $id) {\n      id\n    }\n  }\n": typeof types.ArchiveSchoolEventDocument,
    "\n  query Users($input: UsersInquiry!) {\n    users(input: $input) {\n      list {\n        id\n        loginId\n        role\n        status\n        firstName\n        lastName\n        className\n        title\n        phone\n        passwordState\n        tempPasswordUsesLeft\n        lastActiveAt\n        links {\n          id\n          loginId\n          fullName\n          relation\n        }\n      }\n      metaCounter {\n        total\n      }\n    }\n  }\n": typeof types.UsersDocument,
    "\n  query UserCounts {\n    students: users(input: { page: 1, limit: 1, search: { role: STUDENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    teachers: users(input: { page: 1, limit: 1, search: { role: TEACHER } }) {\n      metaCounter {\n        total\n      }\n    }\n    parents: users(input: { page: 1, limit: 1, search: { role: PARENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    admins: users(input: { page: 1, limit: 1, search: { role: ADMIN } }) {\n      metaCounter {\n        total\n      }\n    }\n  }\n": typeof types.UserCountsDocument,
    "\n  query Groups {\n    groups {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n": typeof types.GroupsDocument,
    "\n  query Courses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      status\n      isSplitGroup\n      groupId\n      groupName\n      subjectId\n      subjectName\n      studentCount\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n      gradeCategories {\n        id\n        name\n        weight\n      }\n    }\n  }\n": typeof types.CoursesDocument,
    "\n  query Subjects($includeArchived: Boolean) {\n    subjects(includeArchived: $includeArchived) {\n      id\n      name\n      status\n    }\n  }\n": typeof types.SubjectsDocument,
    "\n  query Teachers {\n    users(input: { page: 1, limit: 100, sort: \"lastName\", direction: ASC, search: { role: TEACHER, status: ACTIVE } }) {\n      list {\n        id\n        loginId\n        firstName\n        lastName\n        title\n      }\n    }\n  }\n": typeof types.TeachersDocument,
    "\n  query AcademicYears {\n    academicYears {\n      id\n      name\n      startsAt\n      endsAt\n      isCurrent\n    }\n  }\n": typeof types.AcademicYearsDocument,
    "\n  query RecordCourses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      groupName\n      subjectName\n    }\n  }\n": typeof types.RecordCoursesDocument,
    "\n  query CoursePeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      score\n      mark\n      isPublished\n    }\n  }\n": typeof types.CoursePeriodGradesDocument,
    "\n  query AttendanceJournal($courseId: String!, $from: String!, $to: String!) {\n    attendanceJournal(courseId: $courseId, from: $from, to: $to) {\n      dates\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        statuses\n      }\n    }\n  }\n": typeof types.AttendanceJournalDocument,
    "\n  query ReportCard($studentId: String!) {\n    studentOverview(studentId: $studentId) {\n      student {\n        id\n        loginId\n        firstName\n        lastName\n        className\n      }\n      period {\n        id\n        name\n      }\n      attendance {\n        total\n        absent\n        rate\n      }\n      courses {\n        courseId\n        title\n        subjectName\n        teacherName\n        score\n        mark\n        isPublished\n        attendanceRate\n      }\n    }\n  }\n": typeof types.ReportCardDocument,
    "\n  query AdminDashboard {\n    adminDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      students\n      newStudentsThisMonth\n      teachers\n      newTeachersThisMonth\n      classes\n      courses\n      attendanceThisMonth\n      attendanceLastMonth\n      notSignedIn\n      accounts\n      needsAttention {\n        total\n        high\n        medium\n        low\n        students {\n          studentId\n          loginId\n          firstName\n          lastName\n          className\n          priority\n          attendanceRate\n          marks\n        }\n      }\n      recentActivity {\n        id\n        action\n        actorName\n        createdAt\n      }\n    }\n  }\n": typeof types.AdminDashboardDocument,
    "\n  query AttendanceOverview($range: AttendanceRange!) {\n    attendanceOverview(range: $range) {\n      from\n      to\n      present\n      late\n      excused\n      absent\n      total\n    }\n  }\n": typeof types.AttendanceOverviewDocument,
    "\n  query DashboardCalendar($month: String!) {\n    dashboardCalendar(month: $month) {\n      id\n      kind\n      title\n      startsOn\n      endsOn\n      note\n      schoolEventId\n    }\n  }\n": typeof types.DashboardCalendarDocument,
    "\n  query Health {\n    health {\n      status\n      postgres\n      redis\n    }\n  }\n": typeof types.HealthDocument,
    "\n  query CurrentYear {\n    currentAcademicYear {\n      id\n      name\n    }\n  }\n": typeof types.CurrentYearDocument,
    "\n  query UnreadAnnouncements {\n    announcements(input: { limit: 1 }) {\n      unread\n    }\n  }\n": typeof types.UnreadAnnouncementsDocument,
    "\n  query Periods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      kind\n      order\n      startsAt\n      endsAt\n      parentId\n    }\n  }\n": typeof types.PeriodsDocument,
    "\n  query SchoolSettings {\n    schoolSettings {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n": typeof types.SchoolSettingsDocument,
    "\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n": typeof types.TeacherDashboardDocument,
    "\n  mutation ChangePassword($input: ChangePasswordInput!) {\n    changePassword(input: $input) {\n      accessToken\n    }\n  }\n": typeof types.ChangePasswordDocument,
    "\n  query Me {\n    me {\n      id\n      loginId\n      role\n      firstName\n      lastName\n      locale\n      mustChangePassword\n    }\n  }\n": typeof types.MeDocument,
    "\n  query MyChildren {\n    myChildren {\n      id\n      loginId\n      firstName\n      lastName\n      className\n    }\n  }\n": typeof types.MyChildrenDocument,
};
const documents: Documents = {
    "\n  mutation ResetPassword($userId: String!) {\n    resetPassword(userId: $userId) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n": types.ResetPasswordDocument,
    "\n  mutation BlockUser($userId: String!) {\n    blockUser(userId: $userId)\n  }\n": types.BlockUserDocument,
    "\n  mutation UnblockUser($userId: String!) {\n    unblockUser(userId: $userId)\n  }\n": types.UnblockUserDocument,
    "\n  mutation MoveStudent($input: MoveStudentInput!) {\n    moveStudent(input: $input) {\n      id\n      name\n      studentCount\n    }\n  }\n": types.MoveStudentDocument,
    "\n  mutation CreateStudent($input: CreateStudentInput!) {\n    createStudent(input: $input) {\n      student {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n      parent {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n    }\n  }\n": types.CreateStudentDocument,
    "\n  mutation LinkParent($studentId: String!, $input: ParentInput!) {\n    linkParent(studentId: $studentId, input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n": types.LinkParentDocument,
    "\n  mutation CreateTeacher($input: CreateTeacherInput!) {\n    createTeacher(input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n": types.CreateTeacherDocument,
    "\n  mutation PreviewStudentImport($csv: String!) {\n    previewStudentImport(csv: $csv) {\n      rows {\n        line\n        firstName\n        lastName\n        className\n        admissionYear\n        parentName\n        parentPhone\n        status\n        loginIdPreview\n        errors {\n          code\n          value\n        }\n      }\n      summary {\n        ready\n        linkParent\n        errors\n      }\n    }\n  }\n": types.PreviewStudentImportDocument,
    "\n  mutation ImportStudents($csv: String!, $skipErrors: Boolean!) {\n    importStudents(csv: $csv, skipErrors: $skipErrors) {\n      created\n      linkedParents\n      skipped\n      slips {\n        student {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n        parent {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n      }\n    }\n  }\n": types.ImportStudentsDocument,
    "\n  mutation CreateGroup($input: CreateGroupInput!) {\n    createGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n": types.CreateGroupDocument,
    "\n  mutation UpdateGroup($input: UpdateGroupInput!) {\n    updateGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n": types.UpdateGroupDocument,
    "\n  mutation CreateCourse($input: CreateCourseInput!) {\n    createCourse(input: $input) {\n      id\n      title\n    }\n  }\n": types.CreateCourseDocument,
    "\n  mutation SetCourseTeachers($input: SetCourseTeachersInput!) {\n    setCourseTeachers(input: $input) {\n      id\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n    }\n  }\n": types.SetCourseTeachersDocument,
    "\n  mutation CreateSubject($input: CreateSubjectInput!) {\n    createSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n": types.CreateSubjectDocument,
    "\n  mutation UpdateSubject($input: UpdateSubjectInput!) {\n    updateSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n": types.UpdateSubjectDocument,
    "\n  mutation UpdateSchoolSettings($input: UpdateSchoolSettingsInput!) {\n    updateSchoolSettings(input: $input) {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n": types.UpdateSchoolSettingsDocument,
    "\n  mutation CreateAcademicYear($input: CreateAcademicYearInput!) {\n    createAcademicYear(input: $input) {\n      id\n    }\n  }\n": types.CreateAcademicYearDocument,
    "\n  mutation UpdateAcademicYear($input: UpdateAcademicYearInput!) {\n    updateAcademicYear(input: $input) {\n      id\n    }\n  }\n": types.UpdateAcademicYearDocument,
    "\n  mutation SetCurrentAcademicYear($id: String!) {\n    setCurrentAcademicYear(id: $id) {\n      id\n    }\n  }\n": types.SetCurrentAcademicYearDocument,
    "\n  mutation CreatePeriod($input: CreatePeriodInput!) {\n    createPeriod(input: $input) {\n      id\n    }\n  }\n": types.CreatePeriodDocument,
    "\n  mutation UpdatePeriod($input: UpdatePeriodInput!) {\n    updatePeriod(input: $input) {\n      id\n    }\n  }\n": types.UpdatePeriodDocument,
    "\n  mutation LogRecordExport($input: RecordExportInput!) {\n    logRecordExport(input: $input)\n  }\n": types.LogRecordExportDocument,
    "\n  mutation CreateSchoolEvent($input: CreateSchoolEventInput!) {\n    createSchoolEvent(input: $input) {\n      id\n    }\n  }\n": types.CreateSchoolEventDocument,
    "\n  mutation UpdateSchoolEvent($input: UpdateSchoolEventInput!) {\n    updateSchoolEvent(input: $input) {\n      id\n    }\n  }\n": types.UpdateSchoolEventDocument,
    "\n  mutation ArchiveSchoolEvent($id: String!) {\n    archiveSchoolEvent(id: $id) {\n      id\n    }\n  }\n": types.ArchiveSchoolEventDocument,
    "\n  query Users($input: UsersInquiry!) {\n    users(input: $input) {\n      list {\n        id\n        loginId\n        role\n        status\n        firstName\n        lastName\n        className\n        title\n        phone\n        passwordState\n        tempPasswordUsesLeft\n        lastActiveAt\n        links {\n          id\n          loginId\n          fullName\n          relation\n        }\n      }\n      metaCounter {\n        total\n      }\n    }\n  }\n": types.UsersDocument,
    "\n  query UserCounts {\n    students: users(input: { page: 1, limit: 1, search: { role: STUDENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    teachers: users(input: { page: 1, limit: 1, search: { role: TEACHER } }) {\n      metaCounter {\n        total\n      }\n    }\n    parents: users(input: { page: 1, limit: 1, search: { role: PARENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    admins: users(input: { page: 1, limit: 1, search: { role: ADMIN } }) {\n      metaCounter {\n        total\n      }\n    }\n  }\n": types.UserCountsDocument,
    "\n  query Groups {\n    groups {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n": types.GroupsDocument,
    "\n  query Courses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      status\n      isSplitGroup\n      groupId\n      groupName\n      subjectId\n      subjectName\n      studentCount\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n      gradeCategories {\n        id\n        name\n        weight\n      }\n    }\n  }\n": types.CoursesDocument,
    "\n  query Subjects($includeArchived: Boolean) {\n    subjects(includeArchived: $includeArchived) {\n      id\n      name\n      status\n    }\n  }\n": types.SubjectsDocument,
    "\n  query Teachers {\n    users(input: { page: 1, limit: 100, sort: \"lastName\", direction: ASC, search: { role: TEACHER, status: ACTIVE } }) {\n      list {\n        id\n        loginId\n        firstName\n        lastName\n        title\n      }\n    }\n  }\n": types.TeachersDocument,
    "\n  query AcademicYears {\n    academicYears {\n      id\n      name\n      startsAt\n      endsAt\n      isCurrent\n    }\n  }\n": types.AcademicYearsDocument,
    "\n  query RecordCourses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      groupName\n      subjectName\n    }\n  }\n": types.RecordCoursesDocument,
    "\n  query CoursePeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      score\n      mark\n      isPublished\n    }\n  }\n": types.CoursePeriodGradesDocument,
    "\n  query AttendanceJournal($courseId: String!, $from: String!, $to: String!) {\n    attendanceJournal(courseId: $courseId, from: $from, to: $to) {\n      dates\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        statuses\n      }\n    }\n  }\n": types.AttendanceJournalDocument,
    "\n  query ReportCard($studentId: String!) {\n    studentOverview(studentId: $studentId) {\n      student {\n        id\n        loginId\n        firstName\n        lastName\n        className\n      }\n      period {\n        id\n        name\n      }\n      attendance {\n        total\n        absent\n        rate\n      }\n      courses {\n        courseId\n        title\n        subjectName\n        teacherName\n        score\n        mark\n        isPublished\n        attendanceRate\n      }\n    }\n  }\n": types.ReportCardDocument,
    "\n  query AdminDashboard {\n    adminDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      students\n      newStudentsThisMonth\n      teachers\n      newTeachersThisMonth\n      classes\n      courses\n      attendanceThisMonth\n      attendanceLastMonth\n      notSignedIn\n      accounts\n      needsAttention {\n        total\n        high\n        medium\n        low\n        students {\n          studentId\n          loginId\n          firstName\n          lastName\n          className\n          priority\n          attendanceRate\n          marks\n        }\n      }\n      recentActivity {\n        id\n        action\n        actorName\n        createdAt\n      }\n    }\n  }\n": types.AdminDashboardDocument,
    "\n  query AttendanceOverview($range: AttendanceRange!) {\n    attendanceOverview(range: $range) {\n      from\n      to\n      present\n      late\n      excused\n      absent\n      total\n    }\n  }\n": types.AttendanceOverviewDocument,
    "\n  query DashboardCalendar($month: String!) {\n    dashboardCalendar(month: $month) {\n      id\n      kind\n      title\n      startsOn\n      endsOn\n      note\n      schoolEventId\n    }\n  }\n": types.DashboardCalendarDocument,
    "\n  query Health {\n    health {\n      status\n      postgres\n      redis\n    }\n  }\n": types.HealthDocument,
    "\n  query CurrentYear {\n    currentAcademicYear {\n      id\n      name\n    }\n  }\n": types.CurrentYearDocument,
    "\n  query UnreadAnnouncements {\n    announcements(input: { limit: 1 }) {\n      unread\n    }\n  }\n": types.UnreadAnnouncementsDocument,
    "\n  query Periods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      kind\n      order\n      startsAt\n      endsAt\n      parentId\n    }\n  }\n": types.PeriodsDocument,
    "\n  query SchoolSettings {\n    schoolSettings {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n": types.SchoolSettingsDocument,
    "\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n": types.TeacherDashboardDocument,
    "\n  mutation ChangePassword($input: ChangePasswordInput!) {\n    changePassword(input: $input) {\n      accessToken\n    }\n  }\n": types.ChangePasswordDocument,
    "\n  query Me {\n    me {\n      id\n      loginId\n      role\n      firstName\n      lastName\n      locale\n      mustChangePassword\n    }\n  }\n": types.MeDocument,
    "\n  query MyChildren {\n    myChildren {\n      id\n      loginId\n      firstName\n      lastName\n      className\n    }\n  }\n": types.MyChildrenDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetPassword($userId: String!) {\n    resetPassword(userId: $userId) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n"): (typeof documents)["\n  mutation ResetPassword($userId: String!) {\n    resetPassword(userId: $userId) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BlockUser($userId: String!) {\n    blockUser(userId: $userId)\n  }\n"): (typeof documents)["\n  mutation BlockUser($userId: String!) {\n    blockUser(userId: $userId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnblockUser($userId: String!) {\n    unblockUser(userId: $userId)\n  }\n"): (typeof documents)["\n  mutation UnblockUser($userId: String!) {\n    unblockUser(userId: $userId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveStudent($input: MoveStudentInput!) {\n    moveStudent(input: $input) {\n      id\n      name\n      studentCount\n    }\n  }\n"): (typeof documents)["\n  mutation MoveStudent($input: MoveStudentInput!) {\n    moveStudent(input: $input) {\n      id\n      name\n      studentCount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateStudent($input: CreateStudentInput!) {\n    createStudent(input: $input) {\n      student {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n      parent {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateStudent($input: CreateStudentInput!) {\n    createStudent(input: $input) {\n      student {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n      parent {\n        userId\n        loginId\n        fullName\n        role\n        tempPassword\n        isNew\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LinkParent($studentId: String!, $input: ParentInput!) {\n    linkParent(studentId: $studentId, input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n"): (typeof documents)["\n  mutation LinkParent($studentId: String!, $input: ParentInput!) {\n    linkParent(studentId: $studentId, input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTeacher($input: CreateTeacherInput!) {\n    createTeacher(input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTeacher($input: CreateTeacherInput!) {\n    createTeacher(input: $input) {\n      userId\n      loginId\n      fullName\n      role\n      tempPassword\n      isNew\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PreviewStudentImport($csv: String!) {\n    previewStudentImport(csv: $csv) {\n      rows {\n        line\n        firstName\n        lastName\n        className\n        admissionYear\n        parentName\n        parentPhone\n        status\n        loginIdPreview\n        errors {\n          code\n          value\n        }\n      }\n      summary {\n        ready\n        linkParent\n        errors\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation PreviewStudentImport($csv: String!) {\n    previewStudentImport(csv: $csv) {\n      rows {\n        line\n        firstName\n        lastName\n        className\n        admissionYear\n        parentName\n        parentPhone\n        status\n        loginIdPreview\n        errors {\n          code\n          value\n        }\n      }\n      summary {\n        ready\n        linkParent\n        errors\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ImportStudents($csv: String!, $skipErrors: Boolean!) {\n    importStudents(csv: $csv, skipErrors: $skipErrors) {\n      created\n      linkedParents\n      skipped\n      slips {\n        student {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n        parent {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ImportStudents($csv: String!, $skipErrors: Boolean!) {\n    importStudents(csv: $csv, skipErrors: $skipErrors) {\n      created\n      linkedParents\n      skipped\n      slips {\n        student {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n        parent {\n          userId\n          loginId\n          fullName\n          role\n          tempPassword\n          isNew\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateGroup($input: CreateGroupInput!) {\n    createGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation CreateGroup($input: CreateGroupInput!) {\n    createGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateGroup($input: UpdateGroupInput!) {\n    updateGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateGroup($input: UpdateGroupInput!) {\n    updateGroup(input: $input) {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCourse($input: CreateCourseInput!) {\n    createCourse(input: $input) {\n      id\n      title\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCourse($input: CreateCourseInput!) {\n    createCourse(input: $input) {\n      id\n      title\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetCourseTeachers($input: SetCourseTeachersInput!) {\n    setCourseTeachers(input: $input) {\n      id\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SetCourseTeachers($input: SetCourseTeachersInput!) {\n    setCourseTeachers(input: $input) {\n      id\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSubject($input: CreateSubjectInput!) {\n    createSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSubject($input: CreateSubjectInput!) {\n    createSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSubject($input: UpdateSubjectInput!) {\n    updateSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSubject($input: UpdateSubjectInput!) {\n    updateSubject(input: $input) {\n      id\n      name\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSchoolSettings($input: UpdateSchoolSettingsInput!) {\n    updateSchoolSettings(input: $input) {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSchoolSettings($input: UpdateSchoolSettingsInput!) {\n    updateSchoolSettings(input: $input) {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAcademicYear($input: CreateAcademicYearInput!) {\n    createAcademicYear(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAcademicYear($input: CreateAcademicYearInput!) {\n    createAcademicYear(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAcademicYear($input: UpdateAcademicYearInput!) {\n    updateAcademicYear(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAcademicYear($input: UpdateAcademicYearInput!) {\n    updateAcademicYear(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetCurrentAcademicYear($id: String!) {\n    setCurrentAcademicYear(id: $id) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation SetCurrentAcademicYear($id: String!) {\n    setCurrentAcademicYear(id: $id) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePeriod($input: CreatePeriodInput!) {\n    createPeriod(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePeriod($input: CreatePeriodInput!) {\n    createPeriod(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePeriod($input: UpdatePeriodInput!) {\n    updatePeriod(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePeriod($input: UpdatePeriodInput!) {\n    updatePeriod(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LogRecordExport($input: RecordExportInput!) {\n    logRecordExport(input: $input)\n  }\n"): (typeof documents)["\n  mutation LogRecordExport($input: RecordExportInput!) {\n    logRecordExport(input: $input)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSchoolEvent($input: CreateSchoolEventInput!) {\n    createSchoolEvent(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSchoolEvent($input: CreateSchoolEventInput!) {\n    createSchoolEvent(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSchoolEvent($input: UpdateSchoolEventInput!) {\n    updateSchoolEvent(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSchoolEvent($input: UpdateSchoolEventInput!) {\n    updateSchoolEvent(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveSchoolEvent($id: String!) {\n    archiveSchoolEvent(id: $id) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveSchoolEvent($id: String!) {\n    archiveSchoolEvent(id: $id) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Users($input: UsersInquiry!) {\n    users(input: $input) {\n      list {\n        id\n        loginId\n        role\n        status\n        firstName\n        lastName\n        className\n        title\n        phone\n        passwordState\n        tempPasswordUsesLeft\n        lastActiveAt\n        links {\n          id\n          loginId\n          fullName\n          relation\n        }\n      }\n      metaCounter {\n        total\n      }\n    }\n  }\n"): (typeof documents)["\n  query Users($input: UsersInquiry!) {\n    users(input: $input) {\n      list {\n        id\n        loginId\n        role\n        status\n        firstName\n        lastName\n        className\n        title\n        phone\n        passwordState\n        tempPasswordUsesLeft\n        lastActiveAt\n        links {\n          id\n          loginId\n          fullName\n          relation\n        }\n      }\n      metaCounter {\n        total\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query UserCounts {\n    students: users(input: { page: 1, limit: 1, search: { role: STUDENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    teachers: users(input: { page: 1, limit: 1, search: { role: TEACHER } }) {\n      metaCounter {\n        total\n      }\n    }\n    parents: users(input: { page: 1, limit: 1, search: { role: PARENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    admins: users(input: { page: 1, limit: 1, search: { role: ADMIN } }) {\n      metaCounter {\n        total\n      }\n    }\n  }\n"): (typeof documents)["\n  query UserCounts {\n    students: users(input: { page: 1, limit: 1, search: { role: STUDENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    teachers: users(input: { page: 1, limit: 1, search: { role: TEACHER } }) {\n      metaCounter {\n        total\n      }\n    }\n    parents: users(input: { page: 1, limit: 1, search: { role: PARENT } }) {\n      metaCounter {\n        total\n      }\n    }\n    admins: users(input: { page: 1, limit: 1, search: { role: ADMIN } }) {\n      metaCounter {\n        total\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Groups {\n    groups {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n"): (typeof documents)["\n  query Groups {\n    groups {\n      id\n      name\n      studentCount\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Courses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      status\n      isSplitGroup\n      groupId\n      groupName\n      subjectId\n      subjectName\n      studentCount\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n      gradeCategories {\n        id\n        name\n        weight\n      }\n    }\n  }\n"): (typeof documents)["\n  query Courses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      status\n      isSplitGroup\n      groupId\n      groupName\n      subjectId\n      subjectName\n      studentCount\n      teachers {\n        id\n        firstName\n        lastName\n        role\n      }\n      gradeCategories {\n        id\n        name\n        weight\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Subjects($includeArchived: Boolean) {\n    subjects(includeArchived: $includeArchived) {\n      id\n      name\n      status\n    }\n  }\n"): (typeof documents)["\n  query Subjects($includeArchived: Boolean) {\n    subjects(includeArchived: $includeArchived) {\n      id\n      name\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Teachers {\n    users(input: { page: 1, limit: 100, sort: \"lastName\", direction: ASC, search: { role: TEACHER, status: ACTIVE } }) {\n      list {\n        id\n        loginId\n        firstName\n        lastName\n        title\n      }\n    }\n  }\n"): (typeof documents)["\n  query Teachers {\n    users(input: { page: 1, limit: 100, sort: \"lastName\", direction: ASC, search: { role: TEACHER, status: ACTIVE } }) {\n      list {\n        id\n        loginId\n        firstName\n        lastName\n        title\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AcademicYears {\n    academicYears {\n      id\n      name\n      startsAt\n      endsAt\n      isCurrent\n    }\n  }\n"): (typeof documents)["\n  query AcademicYears {\n    academicYears {\n      id\n      name\n      startsAt\n      endsAt\n      isCurrent\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RecordCourses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      groupName\n      subjectName\n    }\n  }\n"): (typeof documents)["\n  query RecordCourses($filter: CoursesFilter) {\n    courses(filter: $filter) {\n      id\n      title\n      groupName\n      subjectName\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CoursePeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      score\n      mark\n      isPublished\n    }\n  }\n"): (typeof documents)["\n  query CoursePeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      score\n      mark\n      isPublished\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AttendanceJournal($courseId: String!, $from: String!, $to: String!) {\n    attendanceJournal(courseId: $courseId, from: $from, to: $to) {\n      dates\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        statuses\n      }\n    }\n  }\n"): (typeof documents)["\n  query AttendanceJournal($courseId: String!, $from: String!, $to: String!) {\n    attendanceJournal(courseId: $courseId, from: $from, to: $to) {\n      dates\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        statuses\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ReportCard($studentId: String!) {\n    studentOverview(studentId: $studentId) {\n      student {\n        id\n        loginId\n        firstName\n        lastName\n        className\n      }\n      period {\n        id\n        name\n      }\n      attendance {\n        total\n        absent\n        rate\n      }\n      courses {\n        courseId\n        title\n        subjectName\n        teacherName\n        score\n        mark\n        isPublished\n        attendanceRate\n      }\n    }\n  }\n"): (typeof documents)["\n  query ReportCard($studentId: String!) {\n    studentOverview(studentId: $studentId) {\n      student {\n        id\n        loginId\n        firstName\n        lastName\n        className\n      }\n      period {\n        id\n        name\n      }\n      attendance {\n        total\n        absent\n        rate\n      }\n      courses {\n        courseId\n        title\n        subjectName\n        teacherName\n        score\n        mark\n        isPublished\n        attendanceRate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminDashboard {\n    adminDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      students\n      newStudentsThisMonth\n      teachers\n      newTeachersThisMonth\n      classes\n      courses\n      attendanceThisMonth\n      attendanceLastMonth\n      notSignedIn\n      accounts\n      needsAttention {\n        total\n        high\n        medium\n        low\n        students {\n          studentId\n          loginId\n          firstName\n          lastName\n          className\n          priority\n          attendanceRate\n          marks\n        }\n      }\n      recentActivity {\n        id\n        action\n        actorName\n        createdAt\n      }\n    }\n  }\n"): (typeof documents)["\n  query AdminDashboard {\n    adminDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      students\n      newStudentsThisMonth\n      teachers\n      newTeachersThisMonth\n      classes\n      courses\n      attendanceThisMonth\n      attendanceLastMonth\n      notSignedIn\n      accounts\n      needsAttention {\n        total\n        high\n        medium\n        low\n        students {\n          studentId\n          loginId\n          firstName\n          lastName\n          className\n          priority\n          attendanceRate\n          marks\n        }\n      }\n      recentActivity {\n        id\n        action\n        actorName\n        createdAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AttendanceOverview($range: AttendanceRange!) {\n    attendanceOverview(range: $range) {\n      from\n      to\n      present\n      late\n      excused\n      absent\n      total\n    }\n  }\n"): (typeof documents)["\n  query AttendanceOverview($range: AttendanceRange!) {\n    attendanceOverview(range: $range) {\n      from\n      to\n      present\n      late\n      excused\n      absent\n      total\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardCalendar($month: String!) {\n    dashboardCalendar(month: $month) {\n      id\n      kind\n      title\n      startsOn\n      endsOn\n      note\n      schoolEventId\n    }\n  }\n"): (typeof documents)["\n  query DashboardCalendar($month: String!) {\n    dashboardCalendar(month: $month) {\n      id\n      kind\n      title\n      startsOn\n      endsOn\n      note\n      schoolEventId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Health {\n    health {\n      status\n      postgres\n      redis\n    }\n  }\n"): (typeof documents)["\n  query Health {\n    health {\n      status\n      postgres\n      redis\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CurrentYear {\n    currentAcademicYear {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  query CurrentYear {\n    currentAcademicYear {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query UnreadAnnouncements {\n    announcements(input: { limit: 1 }) {\n      unread\n    }\n  }\n"): (typeof documents)["\n  query UnreadAnnouncements {\n    announcements(input: { limit: 1 }) {\n      unread\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Periods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      kind\n      order\n      startsAt\n      endsAt\n      parentId\n    }\n  }\n"): (typeof documents)["\n  query Periods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      kind\n      order\n      startsAt\n      endsAt\n      parentId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SchoolSettings {\n    schoolSettings {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n"): (typeof documents)["\n  query SchoolSettings {\n    schoolSettings {\n      schoolName\n      timezone\n      defaultLocale\n      defaultHomeworkWeight\n      defaultQuizWeight\n      defaultExamWeight\n      mark5MinPercent\n      mark4MinPercent\n      mark3MinPercent\n      contactPhone\n      officeHours\n      telegramUrl\n      telegramBotUrl\n      tempPasswordUses\n      tempPasswordDays\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n"): (typeof documents)["\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangePassword($input: ChangePasswordInput!) {\n    changePassword(input: $input) {\n      accessToken\n    }\n  }\n"): (typeof documents)["\n  mutation ChangePassword($input: ChangePasswordInput!) {\n    changePassword(input: $input) {\n      accessToken\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      loginId\n      role\n      firstName\n      lastName\n      locale\n      mustChangePassword\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      id\n      loginId\n      role\n      firstName\n      lastName\n      locale\n      mustChangePassword\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyChildren {\n    myChildren {\n      id\n      loginId\n      firstName\n      lastName\n      className\n    }\n  }\n"): (typeof documents)["\n  query MyChildren {\n    myChildren {\n      id\n      loginId\n      firstName\n      lastName\n      className\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;