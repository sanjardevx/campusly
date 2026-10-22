import { graphql } from '@/libs/gql';

// Admin console queries (DECISIONS §8: every one of them is @Roles(ADMIN) on the server)

/** Users page table: one page of one role, with the filters from the URL */
export const USERS = graphql(`
  query Users($input: UsersInquiry!) {
    users(input: $input) {
      list {
        id
        loginId
        role
        status
        firstName
        lastName
        className
        title
        phone
        passwordState
        tempPasswordUsesLeft
        lastActiveAt
        links {
          id
          loginId
          fullName
          relation
        }
      }
      metaCounter {
        total
      }
    }
  }
`);

/** The four tab counters in ONE request: GraphQL aliases call the same field four times */
export const USER_COUNTS = graphql(`
  query UserCounts {
    students: users(input: { page: 1, limit: 1, search: { role: STUDENT } }) {
      metaCounter {
        total
      }
    }
    teachers: users(input: { page: 1, limit: 1, search: { role: TEACHER } }) {
      metaCounter {
        total
      }
    }
    parents: users(input: { page: 1, limit: 1, search: { role: PARENT } }) {
      metaCounter {
        total
      }
    }
    admins: users(input: { page: 1, limit: 1, search: { role: ADMIN } }) {
      metaCounter {
        total
      }
    }
  }
`);

/** Classes of the current academic year (class filter, later the class pickers) */
export const GROUPS = graphql(`
  query Groups {
    groups {
      id
      name
      studentCount
      status
    }
  }
`);

/** Courses of one class (Classes & Courses page); every class's courses when groupId is empty */
export const COURSES = graphql(`
  query Courses($filter: CoursesFilter) {
    courses(filter: $filter) {
      id
      title
      status
      isSplitGroup
      groupId
      groupName
      subjectId
      subjectName
      studentCount
      teachers {
        id
        firstName
        lastName
        role
      }
      gradeCategories {
        id
        name
        weight
      }
    }
  }
`);

export const SUBJECTS = graphql(`
  query Subjects($includeArchived: Boolean) {
    subjects(includeArchived: $includeArchived) {
      id
      name
      status
    }
  }
`);

/** Active teachers for the teacher pickers (a school has dozens, not thousands) */
export const TEACHERS = graphql(`
  query Teachers {
    users(input: { page: 1, limit: 100, sort: "lastName", direction: ASC, search: { role: TEACHER, status: ACTIVE } }) {
      list {
        id
        loginId
        firstName
        lastName
        title
      }
    }
  }
`);

/** Every academic year, newest first (Settings) */
export const ACADEMIC_YEARS = graphql(`
  query AcademicYears {
    academicYears {
      id
      name
      startsAt
      endsAt
      isCurrent
    }
  }
`);

// ───────────────────────── Records page ─────────────────────────

/** Courses of any academic year (records of past years stay reachable) */
export const RECORD_COURSES = graphql(`
  query RecordCourses($filter: CoursesFilter) {
    courses(filter: $filter) {
      id
      title
      groupName
      subjectName
    }
  }
`);

/** One course, one quarter: the class grades journal */
export const COURSE_PERIOD_GRADES = graphql(`
  query CoursePeriodGrades($courseId: String!, $periodId: String!) {
    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {
      studentId
      loginId
      firstName
      lastName
      score
      mark
      isPublished
    }
  }
`);

/** One course over a date range: days attendance was taken × students */
export const ATTENDANCE_JOURNAL = graphql(`
  query AttendanceJournal($courseId: String!, $from: String!, $to: String!) {
    attendanceJournal(courseId: $courseId, from: $from, to: $to) {
      dates
      rows {
        studentId
        loginId
        firstName
        lastName
        statuses
      }
    }
  }
`);

/** One student's report card: every course of the current quarter */
export const REPORT_CARD = graphql(`
  query ReportCard($studentId: String!) {
    studentOverview(studentId: $studentId) {
      student {
        id
        loginId
        firstName
        lastName
        className
      }
      period {
        id
        name
      }
      attendance {
        total
        absent
        rate
      }
      courses {
        courseId
        title
        subjectName
        teacherName
        score
        mark
        isPublished
        attendanceRate
      }
    }
  }
`);

/** Admin home page: school-wide numbers, counted on the server */
export const ADMIN_DASHBOARD = graphql(`
  query AdminDashboard {
    adminDashboard {
      today
      period {
        id
        name
        week
        weeks
      }
      students
      newStudentsThisMonth
      teachers
      newTeachersThisMonth
      classes
      courses
      attendanceThisMonth
      attendanceLastMonth
      notSignedIn
      accounts
      needsAttention {
        total
        high
        medium
        low
        students {
          studentId
          loginId
          firstName
          lastName
          className
          priority
          attendanceRate
          marks
        }
      }
      recentActivity {
        id
        action
        actorName
        createdAt
      }
    }
  }
`);

/** Dashboard donut: marks by status (its own query: the range switch reloads only this card) */
export const ATTENDANCE_OVERVIEW = graphql(`
  query AttendanceOverview($range: AttendanceRange!) {
    attendanceOverview(range: $range) {
      from
      to
      present
      late
      excused
      absent
      total
    }
  }
`);

/** Dashboard calendar: the school's events and term dates of one month ("YYYY-MM") */
export const DASHBOARD_CALENDAR = graphql(`
  query DashboardCalendar($month: String!) {
    dashboardCalendar(month: $month) {
      id
      kind
      title
      startsOn
      endsOn
      note
      schoolEventId
    }
  }
`);
