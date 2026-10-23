import { graphql } from '@/libs/gql';

/** Student home: one query for the whole page (the server scopes it to the student) */
export const STUDENT_OVERVIEW = graphql(`
  query StudentOverview {
    studentOverview {
      student {
        id
        firstName
        className
      }
      period {
        id
        name
        week
      }
      courses {
        courseId
        title
        subjectName
        teacherName
        progress
        newCount
      }
      continueLessons {
        lessonId
        courseId
        subjectName
        title
        type
        durationSec
        percent
      }
      upcoming {
        assignmentId
        courseId
        courseTitle
        title
        type
        dueAt
        isDone
      }
      overdue {
        assignmentId
        courseId
        courseTitle
        title
        type
        dueAt
      }
    }
  }
`);

/** Student calendar: school dates + the student's own due work (month: "YYYY-MM") */
export const STUDENT_CALENDAR = graphql(`
  query StudentCalendar($month: String!) {
    studentCalendar(month: $month) {
      id
      kind
      title
      startsOn
      endsOn
      note
      courseId
      assignmentId
    }
  }
`);
