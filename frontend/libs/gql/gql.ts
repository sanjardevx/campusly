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
    "\n  mutation CreateModule($input: CreateModuleInput!) {\n    createModule(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateModuleDocument,
    "\n  mutation UpdateModule($input: UpdateModuleInput!) {\n    updateModule(input: $input) {\n      id\n      isHidden\n    }\n  }\n": typeof types.UpdateModuleDocument,
    "\n  mutation PublishModule($input: PublishInput!) {\n    publishModule(input: $input) {\n      id\n      publishedAt\n    }\n  }\n": typeof types.PublishModuleDocument,
    "\n  mutation ReorderModules($input: ReorderInput!) {\n    reorderModules(input: $input) {\n      id\n      order\n    }\n  }\n": typeof types.ReorderModulesDocument,
    "\n  mutation CreateLesson($input: CreateLessonInput!) {\n    createLesson(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateLessonDocument,
    "\n  mutation UpdateLesson($input: UpdateLessonInput!) {\n    updateLesson(input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateLessonDocument,
    "\n  mutation PublishLesson($input: PublishInput!) {\n    publishLesson(input: $input) {\n      id\n      publishedAt\n    }\n  }\n": typeof types.PublishLessonDocument,
    "\n  mutation ReorderLessons($input: ReorderInput!) {\n    reorderLessons(input: $input) {\n      id\n    }\n  }\n": typeof types.ReorderLessonsDocument,
    "\n  mutation SetLessonVideo($input: SetLessonVideoInput!) {\n    setLessonVideo(input: $input) {\n      id\n    }\n  }\n": typeof types.SetLessonVideoDocument,
    "\n  mutation SetLessonFile($input: SetLessonFileInput!) {\n    setLessonFile(input: $input) {\n      id\n    }\n  }\n": typeof types.SetLessonFileDocument,
    "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    createUpload(input: $input) {\n      assetId\n      uploadUrl\n    }\n  }\n": typeof types.CreateUploadDocument,
    "\n  mutation ConfirmUpload($assetId: String!) {\n    confirmUpload(assetId: $assetId) {\n      id\n      status\n      originalName\n      size\n    }\n  }\n": typeof types.ConfirmUploadDocument,
    "\n  mutation CreateAssignment($input: CreateAssignmentInput!) {\n    createAssignment(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateAssignmentDocument,
    "\n  mutation UpdateAssignment($input: UpdateAssignmentInput!) {\n    updateAssignment(input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateAssignmentDocument,
    "\n  mutation PublishAssignment($input: PublishInput!) {\n    publishAssignment(input: $input) {\n      id\n      publishedAt\n    }\n  }\n": typeof types.PublishAssignmentDocument,
    "\n  mutation GradeSubmission($input: GradeSubmissionInput!) {\n    gradeSubmission(input: $input) {\n      id\n      status\n      score\n      feedback\n      gradedAt\n      gradedByName\n    }\n  }\n": typeof types.GradeSubmissionDocument,
    "\n  mutation ReturnSubmission($input: ReturnSubmissionInput!) {\n    returnSubmission(input: $input) {\n      id\n      status\n    }\n  }\n": typeof types.ReturnSubmissionDocument,
    "\n  mutation GiveZeroToMissing($assignmentId: String!) {\n    giveZeroToMissing(assignmentId: $assignmentId)\n  }\n": typeof types.GiveZeroToMissingDocument,
    "\n  mutation PublishGrades($input: PublishGradesInput!) {\n    publishGrades(input: $input) {\n      id\n      gradesPublishedAt\n    }\n  }\n": typeof types.PublishGradesDocument,
    "\n  mutation SetGradeCategories($input: SetGradeCategoriesInput!) {\n    setGradeCategories(input: $input) {\n      id\n      name\n      weight\n      order\n    }\n  }\n": typeof types.SetGradeCategoriesDocument,
    "\n  mutation PublishPeriodGrades($input: PublishPeriodGradesInput!) {\n    publishPeriodGrades(input: $input) {\n      studentId\n      isPublished\n      publishedAt\n    }\n  }\n": typeof types.PublishPeriodGradesDocument,
    "\n  mutation MarkAttendance($input: MarkAttendanceInput!) {\n    markAttendance(input: $input) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        status\n        note\n      }\n    }\n  }\n": typeof types.MarkAttendanceDocument,
    "\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n": typeof types.TeacherDashboardDocument,
    "\n  query TeachingCourses {\n    teachingCourses {\n      id\n      title\n      status\n      studentCount\n      groupName\n      subjectName\n    }\n  }\n": typeof types.TeachingCoursesDocument,
    "\n  query TeacherCourse($courseId: String!) {\n    courseDetail(courseId: $courseId) {\n      id\n      title\n      status\n      academicYearId\n      groupName\n      subjectName\n      studentCount\n      modules {\n        id\n        title\n        order\n        startsAt\n        endsAt\n        isHidden\n        publishedAt\n        lessons {\n          id\n          moduleId\n          title\n          type\n          body\n          dueAt\n          order\n          publishedAt\n          videoAssetId\n          file {\n            id\n            kind\n            status\n            name\n            mimeType\n            size\n            durationSec\n          }\n        }\n      }\n    }\n  }\n": typeof types.TeacherCourseDocument,
    "\n  query CourseAssignments($courseId: String!) {\n    courseAssignments(courseId: $courseId) {\n      id\n      moduleId\n      categoryId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      acceptedFileTypes\n      publishedAt\n      gradesPublishedAt\n      files {\n        id\n        kind\n        status\n        name\n        mimeType\n        size\n        durationSec\n      }\n    }\n  }\n": typeof types.CourseAssignmentsDocument,
    "\n  query CoursePeriods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      parentId\n      startsAt\n      endsAt\n    }\n  }\n": typeof types.CoursePeriodsDocument,
    "\n  query CourseFileUrl($assetId: String!) {\n    courseFileUrl(assetId: $assetId) {\n      url\n    }\n  }\n": typeof types.CourseFileUrlDocument,
    "\n  query TeacherLessonVideo($lessonId: String!) {\n    lessonVideo(lessonId: $lessonId) {\n      url\n    }\n  }\n": typeof types.TeacherLessonVideoDocument,
    "\n  query GradingAssignment($id: String!) {\n    assignment(id: $id) {\n      id\n      courseId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      publishedAt\n      gradesPublishedAt\n    }\n  }\n": typeof types.GradingAssignmentDocument,
    "\n  query AssignmentSubmissions($assignmentId: String!) {\n    assignmentSubmissions(assignmentId: $assignmentId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      submission {\n        id\n        status\n        score\n        feedback\n        submittedAt\n        gradedAt\n        gradedByName\n        attemptsLeft\n        attempts {\n          number\n          text\n          isLate\n          submittedAt\n          files {\n            assetId\n            originalName\n            mimeType\n            size\n            url\n          }\n        }\n      }\n    }\n  }\n": typeof types.AssignmentSubmissionsDocument,
    "\n  query GradebookCourses {\n    teachingCourses {\n      id\n      title\n      status\n      academicYearId\n      studentCount\n      gradeCategories {\n        id\n        name\n        weight\n        order\n      }\n    }\n  }\n": typeof types.GradebookCoursesDocument,
    "\n  query GradebookGrades($courseId: String!, $periodId: String!) {\n    courseGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      percent\n      mark\n      categories {\n        categoryId\n        name\n        weight\n        percent\n        count\n        earned\n        possible\n      }\n      items {\n        assignmentId\n        title\n        categoryName\n        type\n        score\n        maxScore\n        status\n        dueAt\n      }\n    }\n  }\n": typeof types.GradebookGradesDocument,
    "\n  query GradebookPeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      isPublished\n      publishedAt\n      isOutdated\n      score\n    }\n  }\n": typeof types.GradebookPeriodGradesDocument,
    "\n  query GradebookAnnualGrades($courseId: String!) {\n    courseAnnualGrades(courseId: $courseId) {\n      periods {\n        periodId\n        periodName\n        score\n        mark\n        isPublished\n      }\n      annual {\n        studentId\n        loginId\n        firstName\n        lastName\n        score\n        mark\n        finalScore\n      }\n    }\n  }\n": typeof types.GradebookAnnualGradesDocument,
    "\n  query TeacherAttendance($courseId: String!, $date: String!) {\n    courseAttendance(courseId: $courseId, date: $date) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        status\n        note\n      }\n    }\n  }\n": typeof types.TeacherAttendanceDocument,
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
    "\n  mutation CreateModule($input: CreateModuleInput!) {\n    createModule(input: $input) {\n      id\n    }\n  }\n": types.CreateModuleDocument,
    "\n  mutation UpdateModule($input: UpdateModuleInput!) {\n    updateModule(input: $input) {\n      id\n      isHidden\n    }\n  }\n": types.UpdateModuleDocument,
    "\n  mutation PublishModule($input: PublishInput!) {\n    publishModule(input: $input) {\n      id\n      publishedAt\n    }\n  }\n": types.PublishModuleDocument,
    "\n  mutation ReorderModules($input: ReorderInput!) {\n    reorderModules(input: $input) {\n      id\n      order\n    }\n  }\n": types.ReorderModulesDocument,
    "\n  mutation CreateLesson($input: CreateLessonInput!) {\n    createLesson(input: $input) {\n      id\n    }\n  }\n": types.CreateLessonDocument,
    "\n  mutation UpdateLesson($input: UpdateLessonInput!) {\n    updateLesson(input: $input) {\n      id\n    }\n  }\n": types.UpdateLessonDocument,
    "\n  mutation PublishLesson($input: PublishInput!) {\n    publishLesson(input: $input) {\n      id\n      publishedAt\n    }\n  }\n": types.PublishLessonDocument,
    "\n  mutation ReorderLessons($input: ReorderInput!) {\n    reorderLessons(input: $input) {\n      id\n    }\n  }\n": types.ReorderLessonsDocument,
    "\n  mutation SetLessonVideo($input: SetLessonVideoInput!) {\n    setLessonVideo(input: $input) {\n      id\n    }\n  }\n": types.SetLessonVideoDocument,
    "\n  mutation SetLessonFile($input: SetLessonFileInput!) {\n    setLessonFile(input: $input) {\n      id\n    }\n  }\n": types.SetLessonFileDocument,
    "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    createUpload(input: $input) {\n      assetId\n      uploadUrl\n    }\n  }\n": types.CreateUploadDocument,
    "\n  mutation ConfirmUpload($assetId: String!) {\n    confirmUpload(assetId: $assetId) {\n      id\n      status\n      originalName\n      size\n    }\n  }\n": types.ConfirmUploadDocument,
    "\n  mutation CreateAssignment($input: CreateAssignmentInput!) {\n    createAssignment(input: $input) {\n      id\n    }\n  }\n": types.CreateAssignmentDocument,
    "\n  mutation UpdateAssignment($input: UpdateAssignmentInput!) {\n    updateAssignment(input: $input) {\n      id\n    }\n  }\n": types.UpdateAssignmentDocument,
    "\n  mutation PublishAssignment($input: PublishInput!) {\n    publishAssignment(input: $input) {\n      id\n      publishedAt\n    }\n  }\n": types.PublishAssignmentDocument,
    "\n  mutation GradeSubmission($input: GradeSubmissionInput!) {\n    gradeSubmission(input: $input) {\n      id\n      status\n      score\n      feedback\n      gradedAt\n      gradedByName\n    }\n  }\n": types.GradeSubmissionDocument,
    "\n  mutation ReturnSubmission($input: ReturnSubmissionInput!) {\n    returnSubmission(input: $input) {\n      id\n      status\n    }\n  }\n": types.ReturnSubmissionDocument,
    "\n  mutation GiveZeroToMissing($assignmentId: String!) {\n    giveZeroToMissing(assignmentId: $assignmentId)\n  }\n": types.GiveZeroToMissingDocument,
    "\n  mutation PublishGrades($input: PublishGradesInput!) {\n    publishGrades(input: $input) {\n      id\n      gradesPublishedAt\n    }\n  }\n": types.PublishGradesDocument,
    "\n  mutation SetGradeCategories($input: SetGradeCategoriesInput!) {\n    setGradeCategories(input: $input) {\n      id\n      name\n      weight\n      order\n    }\n  }\n": types.SetGradeCategoriesDocument,
    "\n  mutation PublishPeriodGrades($input: PublishPeriodGradesInput!) {\n    publishPeriodGrades(input: $input) {\n      studentId\n      isPublished\n      publishedAt\n    }\n  }\n": types.PublishPeriodGradesDocument,
    "\n  mutation MarkAttendance($input: MarkAttendanceInput!) {\n    markAttendance(input: $input) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        status\n        note\n      }\n    }\n  }\n": types.MarkAttendanceDocument,
    "\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n": types.TeacherDashboardDocument,
    "\n  query TeachingCourses {\n    teachingCourses {\n      id\n      title\n      status\n      studentCount\n      groupName\n      subjectName\n    }\n  }\n": types.TeachingCoursesDocument,
    "\n  query TeacherCourse($courseId: String!) {\n    courseDetail(courseId: $courseId) {\n      id\n      title\n      status\n      academicYearId\n      groupName\n      subjectName\n      studentCount\n      modules {\n        id\n        title\n        order\n        startsAt\n        endsAt\n        isHidden\n        publishedAt\n        lessons {\n          id\n          moduleId\n          title\n          type\n          body\n          dueAt\n          order\n          publishedAt\n          videoAssetId\n          file {\n            id\n            kind\n            status\n            name\n            mimeType\n            size\n            durationSec\n          }\n        }\n      }\n    }\n  }\n": types.TeacherCourseDocument,
    "\n  query CourseAssignments($courseId: String!) {\n    courseAssignments(courseId: $courseId) {\n      id\n      moduleId\n      categoryId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      acceptedFileTypes\n      publishedAt\n      gradesPublishedAt\n      files {\n        id\n        kind\n        status\n        name\n        mimeType\n        size\n        durationSec\n      }\n    }\n  }\n": types.CourseAssignmentsDocument,
    "\n  query CoursePeriods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      parentId\n      startsAt\n      endsAt\n    }\n  }\n": types.CoursePeriodsDocument,
    "\n  query CourseFileUrl($assetId: String!) {\n    courseFileUrl(assetId: $assetId) {\n      url\n    }\n  }\n": types.CourseFileUrlDocument,
    "\n  query TeacherLessonVideo($lessonId: String!) {\n    lessonVideo(lessonId: $lessonId) {\n      url\n    }\n  }\n": types.TeacherLessonVideoDocument,
    "\n  query GradingAssignment($id: String!) {\n    assignment(id: $id) {\n      id\n      courseId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      publishedAt\n      gradesPublishedAt\n    }\n  }\n": types.GradingAssignmentDocument,
    "\n  query AssignmentSubmissions($assignmentId: String!) {\n    assignmentSubmissions(assignmentId: $assignmentId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      submission {\n        id\n        status\n        score\n        feedback\n        submittedAt\n        gradedAt\n        gradedByName\n        attemptsLeft\n        attempts {\n          number\n          text\n          isLate\n          submittedAt\n          files {\n            assetId\n            originalName\n            mimeType\n            size\n            url\n          }\n        }\n      }\n    }\n  }\n": types.AssignmentSubmissionsDocument,
    "\n  query GradebookCourses {\n    teachingCourses {\n      id\n      title\n      status\n      academicYearId\n      studentCount\n      gradeCategories {\n        id\n        name\n        weight\n        order\n      }\n    }\n  }\n": types.GradebookCoursesDocument,
    "\n  query GradebookGrades($courseId: String!, $periodId: String!) {\n    courseGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      percent\n      mark\n      categories {\n        categoryId\n        name\n        weight\n        percent\n        count\n        earned\n        possible\n      }\n      items {\n        assignmentId\n        title\n        categoryName\n        type\n        score\n        maxScore\n        status\n        dueAt\n      }\n    }\n  }\n": types.GradebookGradesDocument,
    "\n  query GradebookPeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      isPublished\n      publishedAt\n      isOutdated\n      score\n    }\n  }\n": types.GradebookPeriodGradesDocument,
    "\n  query GradebookAnnualGrades($courseId: String!) {\n    courseAnnualGrades(courseId: $courseId) {\n      periods {\n        periodId\n        periodName\n        score\n        mark\n        isPublished\n      }\n      annual {\n        studentId\n        loginId\n        firstName\n        lastName\n        score\n        mark\n        finalScore\n      }\n    }\n  }\n": types.GradebookAnnualGradesDocument,
    "\n  query TeacherAttendance($courseId: String!, $date: String!) {\n    courseAttendance(courseId: $courseId, date: $date) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        status\n        note\n      }\n    }\n  }\n": types.TeacherAttendanceDocument,
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
export function graphql(source: "\n  mutation CreateModule($input: CreateModuleInput!) {\n    createModule(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateModule($input: CreateModuleInput!) {\n    createModule(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateModule($input: UpdateModuleInput!) {\n    updateModule(input: $input) {\n      id\n      isHidden\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateModule($input: UpdateModuleInput!) {\n    updateModule(input: $input) {\n      id\n      isHidden\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PublishModule($input: PublishInput!) {\n    publishModule(input: $input) {\n      id\n      publishedAt\n    }\n  }\n"): (typeof documents)["\n  mutation PublishModule($input: PublishInput!) {\n    publishModule(input: $input) {\n      id\n      publishedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReorderModules($input: ReorderInput!) {\n    reorderModules(input: $input) {\n      id\n      order\n    }\n  }\n"): (typeof documents)["\n  mutation ReorderModules($input: ReorderInput!) {\n    reorderModules(input: $input) {\n      id\n      order\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateLesson($input: CreateLessonInput!) {\n    createLesson(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateLesson($input: CreateLessonInput!) {\n    createLesson(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateLesson($input: UpdateLessonInput!) {\n    updateLesson(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateLesson($input: UpdateLessonInput!) {\n    updateLesson(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PublishLesson($input: PublishInput!) {\n    publishLesson(input: $input) {\n      id\n      publishedAt\n    }\n  }\n"): (typeof documents)["\n  mutation PublishLesson($input: PublishInput!) {\n    publishLesson(input: $input) {\n      id\n      publishedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReorderLessons($input: ReorderInput!) {\n    reorderLessons(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation ReorderLessons($input: ReorderInput!) {\n    reorderLessons(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetLessonVideo($input: SetLessonVideoInput!) {\n    setLessonVideo(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation SetLessonVideo($input: SetLessonVideoInput!) {\n    setLessonVideo(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetLessonFile($input: SetLessonFileInput!) {\n    setLessonFile(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation SetLessonFile($input: SetLessonFileInput!) {\n    setLessonFile(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    createUpload(input: $input) {\n      assetId\n      uploadUrl\n    }\n  }\n"): (typeof documents)["\n  mutation CreateUpload($input: CreateUploadInput!) {\n    createUpload(input: $input) {\n      assetId\n      uploadUrl\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ConfirmUpload($assetId: String!) {\n    confirmUpload(assetId: $assetId) {\n      id\n      status\n      originalName\n      size\n    }\n  }\n"): (typeof documents)["\n  mutation ConfirmUpload($assetId: String!) {\n    confirmUpload(assetId: $assetId) {\n      id\n      status\n      originalName\n      size\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAssignment($input: CreateAssignmentInput!) {\n    createAssignment(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAssignment($input: CreateAssignmentInput!) {\n    createAssignment(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAssignment($input: UpdateAssignmentInput!) {\n    updateAssignment(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAssignment($input: UpdateAssignmentInput!) {\n    updateAssignment(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PublishAssignment($input: PublishInput!) {\n    publishAssignment(input: $input) {\n      id\n      publishedAt\n    }\n  }\n"): (typeof documents)["\n  mutation PublishAssignment($input: PublishInput!) {\n    publishAssignment(input: $input) {\n      id\n      publishedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation GradeSubmission($input: GradeSubmissionInput!) {\n    gradeSubmission(input: $input) {\n      id\n      status\n      score\n      feedback\n      gradedAt\n      gradedByName\n    }\n  }\n"): (typeof documents)["\n  mutation GradeSubmission($input: GradeSubmissionInput!) {\n    gradeSubmission(input: $input) {\n      id\n      status\n      score\n      feedback\n      gradedAt\n      gradedByName\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReturnSubmission($input: ReturnSubmissionInput!) {\n    returnSubmission(input: $input) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation ReturnSubmission($input: ReturnSubmissionInput!) {\n    returnSubmission(input: $input) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation GiveZeroToMissing($assignmentId: String!) {\n    giveZeroToMissing(assignmentId: $assignmentId)\n  }\n"): (typeof documents)["\n  mutation GiveZeroToMissing($assignmentId: String!) {\n    giveZeroToMissing(assignmentId: $assignmentId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PublishGrades($input: PublishGradesInput!) {\n    publishGrades(input: $input) {\n      id\n      gradesPublishedAt\n    }\n  }\n"): (typeof documents)["\n  mutation PublishGrades($input: PublishGradesInput!) {\n    publishGrades(input: $input) {\n      id\n      gradesPublishedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetGradeCategories($input: SetGradeCategoriesInput!) {\n    setGradeCategories(input: $input) {\n      id\n      name\n      weight\n      order\n    }\n  }\n"): (typeof documents)["\n  mutation SetGradeCategories($input: SetGradeCategoriesInput!) {\n    setGradeCategories(input: $input) {\n      id\n      name\n      weight\n      order\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PublishPeriodGrades($input: PublishPeriodGradesInput!) {\n    publishPeriodGrades(input: $input) {\n      studentId\n      isPublished\n      publishedAt\n    }\n  }\n"): (typeof documents)["\n  mutation PublishPeriodGrades($input: PublishPeriodGradesInput!) {\n    publishPeriodGrades(input: $input) {\n      studentId\n      isPublished\n      publishedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MarkAttendance($input: MarkAttendanceInput!) {\n    markAttendance(input: $input) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        status\n        note\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MarkAttendance($input: MarkAttendanceInput!) {\n    markAttendance(input: $input) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        status\n        note\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n"): (typeof documents)["\n  query TeacherDashboard {\n    teacherDashboard {\n      today\n      period {\n        id\n        name\n        week\n        weeks\n      }\n      holiday\n      todayCourses {\n        courseId\n        title\n        students\n        marked\n      }\n      toGradeTotal\n      grading {\n        assignmentId\n        courseId\n        courseTitle\n        title\n        type\n        toGrade\n        submitted\n        graded\n        students\n        dueAt\n        allowLate\n        readyToPublish\n      }\n      courses {\n        id\n        title\n        status\n        students\n        week\n      }\n      deadlines {\n        id\n        kind\n        title\n        courseTitles\n        date\n        dueAt\n      }\n      announcements {\n        id\n        title\n        courseTitle\n        publishedAt\n        reads\n        audience\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeachingCourses {\n    teachingCourses {\n      id\n      title\n      status\n      studentCount\n      groupName\n      subjectName\n    }\n  }\n"): (typeof documents)["\n  query TeachingCourses {\n    teachingCourses {\n      id\n      title\n      status\n      studentCount\n      groupName\n      subjectName\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeacherCourse($courseId: String!) {\n    courseDetail(courseId: $courseId) {\n      id\n      title\n      status\n      academicYearId\n      groupName\n      subjectName\n      studentCount\n      modules {\n        id\n        title\n        order\n        startsAt\n        endsAt\n        isHidden\n        publishedAt\n        lessons {\n          id\n          moduleId\n          title\n          type\n          body\n          dueAt\n          order\n          publishedAt\n          videoAssetId\n          file {\n            id\n            kind\n            status\n            name\n            mimeType\n            size\n            durationSec\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query TeacherCourse($courseId: String!) {\n    courseDetail(courseId: $courseId) {\n      id\n      title\n      status\n      academicYearId\n      groupName\n      subjectName\n      studentCount\n      modules {\n        id\n        title\n        order\n        startsAt\n        endsAt\n        isHidden\n        publishedAt\n        lessons {\n          id\n          moduleId\n          title\n          type\n          body\n          dueAt\n          order\n          publishedAt\n          videoAssetId\n          file {\n            id\n            kind\n            status\n            name\n            mimeType\n            size\n            durationSec\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CourseAssignments($courseId: String!) {\n    courseAssignments(courseId: $courseId) {\n      id\n      moduleId\n      categoryId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      acceptedFileTypes\n      publishedAt\n      gradesPublishedAt\n      files {\n        id\n        kind\n        status\n        name\n        mimeType\n        size\n        durationSec\n      }\n    }\n  }\n"): (typeof documents)["\n  query CourseAssignments($courseId: String!) {\n    courseAssignments(courseId: $courseId) {\n      id\n      moduleId\n      categoryId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      acceptedFileTypes\n      publishedAt\n      gradesPublishedAt\n      files {\n        id\n        kind\n        status\n        name\n        mimeType\n        size\n        durationSec\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CoursePeriods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      parentId\n      startsAt\n      endsAt\n    }\n  }\n"): (typeof documents)["\n  query CoursePeriods($academicYearId: String!) {\n    periods(academicYearId: $academicYearId) {\n      id\n      name\n      parentId\n      startsAt\n      endsAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CourseFileUrl($assetId: String!) {\n    courseFileUrl(assetId: $assetId) {\n      url\n    }\n  }\n"): (typeof documents)["\n  query CourseFileUrl($assetId: String!) {\n    courseFileUrl(assetId: $assetId) {\n      url\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeacherLessonVideo($lessonId: String!) {\n    lessonVideo(lessonId: $lessonId) {\n      url\n    }\n  }\n"): (typeof documents)["\n  query TeacherLessonVideo($lessonId: String!) {\n    lessonVideo(lessonId: $lessonId) {\n      url\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GradingAssignment($id: String!) {\n    assignment(id: $id) {\n      id\n      courseId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      publishedAt\n      gradesPublishedAt\n    }\n  }\n"): (typeof documents)["\n  query GradingAssignment($id: String!) {\n    assignment(id: $id) {\n      id\n      courseId\n      type\n      title\n      instructions\n      maxScore\n      dueAt\n      allowLate\n      maxAttempts\n      publishedAt\n      gradesPublishedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AssignmentSubmissions($assignmentId: String!) {\n    assignmentSubmissions(assignmentId: $assignmentId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      submission {\n        id\n        status\n        score\n        feedback\n        submittedAt\n        gradedAt\n        gradedByName\n        attemptsLeft\n        attempts {\n          number\n          text\n          isLate\n          submittedAt\n          files {\n            assetId\n            originalName\n            mimeType\n            size\n            url\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query AssignmentSubmissions($assignmentId: String!) {\n    assignmentSubmissions(assignmentId: $assignmentId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      submission {\n        id\n        status\n        score\n        feedback\n        submittedAt\n        gradedAt\n        gradedByName\n        attemptsLeft\n        attempts {\n          number\n          text\n          isLate\n          submittedAt\n          files {\n            assetId\n            originalName\n            mimeType\n            size\n            url\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GradebookCourses {\n    teachingCourses {\n      id\n      title\n      status\n      academicYearId\n      studentCount\n      gradeCategories {\n        id\n        name\n        weight\n        order\n      }\n    }\n  }\n"): (typeof documents)["\n  query GradebookCourses {\n    teachingCourses {\n      id\n      title\n      status\n      academicYearId\n      studentCount\n      gradeCategories {\n        id\n        name\n        weight\n        order\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GradebookGrades($courseId: String!, $periodId: String!) {\n    courseGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      percent\n      mark\n      categories {\n        categoryId\n        name\n        weight\n        percent\n        count\n        earned\n        possible\n      }\n      items {\n        assignmentId\n        title\n        categoryName\n        type\n        score\n        maxScore\n        status\n        dueAt\n      }\n    }\n  }\n"): (typeof documents)["\n  query GradebookGrades($courseId: String!, $periodId: String!) {\n    courseGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      loginId\n      firstName\n      lastName\n      percent\n      mark\n      categories {\n        categoryId\n        name\n        weight\n        percent\n        count\n        earned\n        possible\n      }\n      items {\n        assignmentId\n        title\n        categoryName\n        type\n        score\n        maxScore\n        status\n        dueAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GradebookPeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      isPublished\n      publishedAt\n      isOutdated\n      score\n    }\n  }\n"): (typeof documents)["\n  query GradebookPeriodGrades($courseId: String!, $periodId: String!) {\n    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {\n      studentId\n      isPublished\n      publishedAt\n      isOutdated\n      score\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GradebookAnnualGrades($courseId: String!) {\n    courseAnnualGrades(courseId: $courseId) {\n      periods {\n        periodId\n        periodName\n        score\n        mark\n        isPublished\n      }\n      annual {\n        studentId\n        loginId\n        firstName\n        lastName\n        score\n        mark\n        finalScore\n      }\n    }\n  }\n"): (typeof documents)["\n  query GradebookAnnualGrades($courseId: String!) {\n    courseAnnualGrades(courseId: $courseId) {\n      periods {\n        periodId\n        periodName\n        score\n        mark\n        isPublished\n      }\n      annual {\n        studentId\n        loginId\n        firstName\n        lastName\n        score\n        mark\n        finalScore\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeacherAttendance($courseId: String!, $date: String!) {\n    courseAttendance(courseId: $courseId, date: $date) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        status\n        note\n      }\n    }\n  }\n"): (typeof documents)["\n  query TeacherAttendance($courseId: String!, $date: String!) {\n    courseAttendance(courseId: $courseId, date: $date) {\n      courseId\n      date\n      isMarked\n      rows {\n        studentId\n        loginId\n        firstName\n        lastName\n        status\n        note\n      }\n    }\n  }\n"];
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