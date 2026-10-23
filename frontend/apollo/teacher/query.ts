import { graphql } from '@/libs/gql';

// Teacher portal queries (DECISIONS §8: @Roles(TEACHER), every list limited to the teacher's courses)

/** Teacher home: one request, counted on the server (no IDs sent: the token says who is asking) */
export const TEACHER_DASHBOARD = graphql(`
  query TeacherDashboard {
    teacherDashboard {
      today
      period {
        id
        name
        week
        weeks
      }
      holiday
      todayCourses {
        courseId
        title
        students
        marked
      }
      toGradeTotal
      grading {
        assignmentId
        courseId
        courseTitle
        title
        type
        toGrade
        submitted
        graded
        students
        dueAt
        allowLate
        readyToPublish
      }
      courses {
        id
        title
        status
        students
        week
      }
      deadlines {
        id
        kind
        title
        courseTitles
        date
        dueAt
      }
      announcements {
        id
        title
        courseTitle
        publishedAt
        reads
        audience
      }
    }
  }
`);
