import { graphql } from '@/libs/gql';

/**
 * Parent home: one child (studentId from ?child=). The server checks the ParentStudent link
 * (resolveStudentScope); the current quarter comes from myGrades, the latest news from the overview.
 */
export const PARENT_HOME = graphql(`
  query ParentHome($studentId: String!) {
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
        week
      }
      upcoming {
        assignmentId
        courseTitle
        title
        dueAt
        isDone
      }
      recentGrades {
        assignmentId
        courseTitle
        title
        score
        maxScore
        publishedAt
        feedback
      }
      announcements {
        list {
          id
          title
          body
          courseTitle
          eventDate
          publishedAt
        }
      }
    }
    myGrades(studentId: $studentId) {
      period {
        id
        name
      }
      attendance {
        total
        present
        late
        excused
        absent
        rate
      }
      missing
      courses {
        courseId
        title
        subjectName
        teacherName
        percent
        mark
        isFinal
        missing
        items {
          assignmentId
          title
          type
          state
        }
      }
    }
  }
`);

/** The child's courses, for the course filter on the parent's Announcements page */
export const PARENT_CHILD_COURSES = graphql(`
  query ParentChildCourses($studentId: String!) {
    studentOverview(studentId: $studentId) {
      courses {
        courseId
        title
      }
    }
  }
`);

/** Attendance page: one quarter (default: the current one) for the chosen child */
export const PARENT_ATTENDANCE = graphql(`
  query ParentAttendance($studentId: String!, $periodId: String) {
    studentAttendance(studentId: $studentId, periodId: $periodId) {
      periods {
        id
        name
      }
      period {
        id
        name
      }
      summary {
        total
        present
        late
        excused
        absent
        rate
      }
      courses {
        courseId
        title
        subjectName
        teacherName
        summary {
          total
          present
          late
          excused
          absent
          rate
        }
      }
      lessons {
        date
        courseId
        courseTitle
        teacherName
        status
        note
      }
    }
  }
`);
