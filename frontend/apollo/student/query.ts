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

/** Course page: the weeks the teacher opened, their lessons, the course's published assignments */
export const STUDENT_COURSE = graphql(`
  query StudentCourse($courseId: String!) {
    courseDetail(courseId: $courseId) {
      id
      title
      subjectName
      groupName
      teachers {
        role
        firstName
        lastName
      }
      modules {
        id
        title
        order
        startsAt
        endsAt
        lessons {
          id
          title
          type
          order
          file {
            id
            name
            mimeType
            size
            durationSec
          }
        }
      }
    }
    courseAssignments(courseId: $courseId) {
      id
      moduleId
      type
      title
      maxScore
      dueAt
      allowLate
      gradesPublishedAt
    }
    courseProgress(courseId: $courseId) {
      progress
      lessons {
        lessonId
        status
        percent
      }
      assignments {
        assignmentId
        status
        score
      }
    }
  }
`);

/** Lesson page: the course's lessons in order (prev / next, week), the student's progress */
export const STUDENT_LESSON = graphql(`
  query StudentLesson($courseId: String!) {
    courseDetail(courseId: $courseId) {
      id
      title
      subjectName
      teachers {
        role
        firstName
        lastName
      }
      modules {
        id
        title
        order
        startsAt
        endsAt
        lessons {
          id
          title
          type
          body
          order
          completionType
          file {
            id
            name
            mimeType
            size
            durationSec
          }
        }
      }
    }
    courseProgress(courseId: $courseId) {
      progress
      lessons {
        lessonId
        status
        percent
      }
    }
  }
`);

/** The 3-hour video link with the student's watch rule (DECISIONS §11) */
export const LESSON_VIDEO = graphql(`
  query LessonVideo($lessonId: String!) {
    lessonVideo(lessonId: $lessonId) {
      url
      resumeAt
      isLocked
      maxSeekSec
      watermark
    }
  }
`);

/** A 15-minute link to a lesson file */
export const STUDENT_FILE_URL = graphql(`
  query StudentFileUrl($assetId: String!) {
    courseFileUrl(assetId: $assetId) {
      url
    }
  }
`);

/** Homework page: the assignment, its course (breadcrumb, week) and the student's own submission */
export const STUDENT_ASSIGNMENT = graphql(`
  query StudentAssignment($courseId: String!, $assignmentId: String!) {
    courseDetail(courseId: $courseId) {
      id
      title
      subjectName
      modules {
        id
        order
      }
    }
    assignment(id: $assignmentId) {
      id
      courseId
      moduleId
      type
      title
      instructions
      maxScore
      dueAt
      allowLate
      maxAttempts
      acceptedFileTypes
      timeLimitMin
      gradesPublishedAt
      files {
        id
        name
        mimeType
        size
      }
    }
    mySubmission(assignmentId: $assignmentId) {
      id
      status
      submittedAt
      score
      feedback
      gradedAt
      gradedByName
      attemptsLeft
      attempts {
        number
        text
        isLate
        submittedAt
        files {
          assetId
          originalName
          mimeType
          size
          url
        }
      }
      comments {
        id
        authorName
        authorRole
        body
        createdAt
      }
    }
  }
`);

/** Grades page: one period (null = the current one) with every course and assignment */
export const MY_GRADES = graphql(`
  query MyGrades($periodId: String, $studentId: String) {
    myGrades(periodId: $periodId, studentId: $studentId) {
      periods {
        id
        name
      }
      period {
        id
        name
      }
      attendanceRate
      missing
      courses {
        courseId
        title
        subjectName
        teacherName
        percent
        mark
        isFinal
        attendanceRate
        missing
        items {
          assignmentId
          title
          type
          dueAt
          maxScore
          state
          score
          feedback
        }
      }
    }
  }
`);

/** Final tab: one course's quarters and its annual grade */
export const MY_PERIOD_GRADES = graphql(`
  query MyPeriodGrades($courseId: String!, $studentId: String) {
    myPeriodGrades(courseId: $courseId, studentId: $studentId) {
      periods {
        periodId
        periodName
        score
        mark
        isPublished
      }
      annual {
        score
        mark
        isPublished
      }
    }
  }
`);

/** Announcements page (student; parent with input.studentId): one tab at a time, the tab counts come with it */
export const STUDENT_ANNOUNCEMENTS = graphql(`
  query StudentAnnouncements($input: AnnouncementsInquiry) {
    announcements(input: $input) {
      total
      all
      unread
      school
      list {
        id
        title
        body
        courseId
        courseTitle
        isPinned
        publishedAt
        authorName
        isRead
        files {
          id
          name
          mimeType
          size
        }
      }
    }
  }
`);

/** AI Study Tutor: the course's weeks, lessons and assignments, for the "Topic" picker */
export const STUDENT_TUTOR_TOPICS = graphql(`
  query StudentTutorTopics($courseId: String!) {
    courseDetail(courseId: $courseId) {
      id
      modules {
        id
        title
        order
        lessons {
          id
          title
        }
      }
    }
    courseAssignments(courseId: $courseId) {
      id
      moduleId
      title
      type
    }
  }
`);

/** The student's quiz: state, timer and (during the attempt) the shuffled questions */
export const MY_QUIZ = graphql(`
  query MyQuiz($assignmentId: String!) {
    myQuiz(assignmentId: $assignmentId) {
      assignmentId
      state
      canStart
      timeLimitMin
      questionCount
      totalPoints
      dueAt
      startedAt
      deadlineAt
      submittedAt
      serverNow
      questions {
        id
        type
        text
        points
        options
        myChoice
        myNumber
      }
    }
  }
`);

/** After grades are published: right / wrong per question and the right answers */
export const QUIZ_RESULT = graphql(`
  query QuizResult($assignmentId: String!) {
    quizResult(assignmentId: $assignmentId) {
      score
      maxScore
      submittedAt
      items {
        type
        text
        points
        options
        myChoice
        myNumber
        correctOption
        correctNumber
        tolerance
        isCorrect
        earned
      }
    }
  }
`);
