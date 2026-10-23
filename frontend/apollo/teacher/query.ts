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

/** "My courses": the teacher's own courses (CourseTeacher) */
export const TEACHING_COURSES = graphql(`
  query TeachingCourses {
    teachingCourses {
      id
      title
      status
      studentCount
      groupName
      subjectName
    }
  }
`);


/** The course page: weeks with their lessons (drafts too: teachers see everything) */
export const TEACHER_COURSE = graphql(`
  query TeacherCourse($courseId: String!) {
    courseDetail(courseId: $courseId) {
      id
      title
      status
      academicYearId
      groupName
      subjectName
      studentCount
      modules {
        id
        title
        order
        startsAt
        endsAt
        isHidden
        publishedAt
        lessons {
          id
          moduleId
          title
          type
          body
          dueAt
          order
          publishedAt
          videoAssetId
          file {
            id
            kind
            status
            name
            mimeType
            size
            durationSec
          }
        }
      }
    }
  }
`);

/** Every assignment of the course; the page puts each one into its week (moduleId) */
export const COURSE_ASSIGNMENTS = graphql(`
  query CourseAssignments($courseId: String!) {
    courseAssignments(courseId: $courseId) {
      id
      moduleId
      categoryId
      type
      title
      instructions
      maxScore
      dueAt
      allowLate
      maxAttempts
      acceptedFileTypes
      publishedAt
      gradesPublishedAt
      files {
        id
        kind
        status
        name
        mimeType
        size
        durationSec
      }
    }
  }
`);

/** Quarters of the course's year: the header shows the one today is in */
export const COURSE_PERIODS = graphql(`
  query CoursePeriods($academicYearId: String!) {
    periods(academicYearId: $academicYearId) {
      id
      name
      parentId
      startsAt
      endsAt
    }
  }
`);

/** A 15-minute link to a lesson file or an attachment (the server checks who may open it) */
export const COURSE_FILE_URL = graphql(`
  query CourseFileUrl($assetId: String!) {
    courseFileUrl(assetId: $assetId) {
      url
    }
  }
`);

/** A lesson video's 3-hour link (the teacher's own preview) */
export const TEACHER_LESSON_VIDEO = graphql(`
  query TeacherLessonVideo($lessonId: String!) {
    lessonVideo(lessonId: $lessonId) {
      url
    }
  }
`);

/** The grading page header: one assignment (the server checks the teacher may see it) */
export const GRADING_ASSIGNMENT = graphql(`
  query GradingAssignment($id: String!) {
    assignment(id: $id) {
      id
      courseId
      type
      title
      instructions
      maxScore
      dueAt
      allowLate
      maxAttempts
      publishedAt
      gradesPublishedAt
    }
  }
`);

/** Every active student of the course with their submission (attempts, signed file links) */
export const ASSIGNMENT_SUBMISSIONS = graphql(`
  query AssignmentSubmissions($assignmentId: String!) {
    assignmentSubmissions(assignmentId: $assignmentId) {
      studentId
      loginId
      firstName
      lastName
      submission {
        id
        status
        score
        feedback
        submittedAt
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
      }
    }
  }
`);

/** Gradebook course picker: the teacher's courses with their categories (weights modal) */
export const GRADEBOOK_COURSES = graphql(`
  query GradebookCourses {
    teachingCourses {
      id
      title
      status
      academicYearId
      studentCount
      gradeCategories {
        id
        name
        weight
        order
      }
    }
  }
`);

/** One period of the class: each student's % per category (published grades only) and the mark */
export const COURSE_GRADES = graphql(`
  query GradebookGrades($courseId: String!, $periodId: String!) {
    courseGrades(courseId: $courseId, periodId: $periodId) {
      studentId
      loginId
      firstName
      lastName
      percent
      mark
      categories {
        categoryId
        name
        weight
        percent
        count
        earned
        possible
      }
      items {
        assignmentId
        title
        categoryName
        type
        score
        maxScore
        status
        dueAt
      }
    }
  }
`);

/** Published quarter grades (snapshot, "changed since") for the same period */
export const COURSE_PERIOD_GRADES = graphql(`
  query GradebookPeriodGrades($courseId: String!, $periodId: String!) {
    coursePeriodGrades(courseId: $courseId, periodId: $periodId) {
      studentId
      isPublished
      publishedAt
      isOutdated
      score
    }
  }
`);

/** "Final" tab: every student's quarters and the annual grade */
export const COURSE_ANNUAL_GRADES = graphql(`
  query GradebookAnnualGrades($courseId: String!) {
    courseAnnualGrades(courseId: $courseId) {
      periods {
        periodId
        periodName
        score
        mark
        isPublished
      }
      annual {
        studentId
        loginId
        firstName
        lastName
        score
        mark
        finalScore
      }
    }
  }
`);

/** One course, one day: every active student; not taken yet → everyone PRESENT, isMarked false */
export const TEACHER_ATTENDANCE = graphql(`
  query TeacherAttendance($courseId: String!, $date: String!) {
    courseAttendance(courseId: $courseId, date: $date) {
      courseId
      date
      isMarked
      rows {
        studentId
        loginId
        firstName
        lastName
        status
        note
      }
    }
  }
`);
