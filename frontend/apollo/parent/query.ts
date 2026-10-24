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
