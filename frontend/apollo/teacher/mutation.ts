import { graphql } from '@/libs/gql';

// Teacher portal changes. Every one checks on the server that the user teaches this course
// (AccessPolicy.assertCanEditCourse); the page refetches the course after each one.

// ───────────────────────── weeks ─────────────────────────

export const CREATE_MODULE = graphql(`
  mutation CreateModule($input: CreateModuleInput!) {
    createModule(input: $input) {
      id
    }
  }
`);

export const UPDATE_MODULE = graphql(`
  mutation UpdateModule($input: UpdateModuleInput!) {
    updateModule(input: $input) {
      id
      isHidden
    }
  }
`);

export const PUBLISH_MODULE = graphql(`
  mutation PublishModule($input: PublishInput!) {
    publishModule(input: $input) {
      id
      publishedAt
    }
  }
`);

export const REORDER_MODULES = graphql(`
  mutation ReorderModules($input: ReorderInput!) {
    reorderModules(input: $input) {
      id
      order
    }
  }
`);

// ───────────────────────── lessons ─────────────────────────

export const CREATE_LESSON = graphql(`
  mutation CreateLesson($input: CreateLessonInput!) {
    createLesson(input: $input) {
      id
    }
  }
`);

export const UPDATE_LESSON = graphql(`
  mutation UpdateLesson($input: UpdateLessonInput!) {
    updateLesson(input: $input) {
      id
    }
  }
`);

export const PUBLISH_LESSON = graphql(`
  mutation PublishLesson($input: PublishInput!) {
    publishLesson(input: $input) {
      id
      publishedAt
    }
  }
`);

export const REORDER_LESSONS = graphql(`
  mutation ReorderLessons($input: ReorderInput!) {
    reorderLessons(input: $input) {
      id
    }
  }
`);

export const SET_LESSON_VIDEO = graphql(`
  mutation SetLessonVideo($input: SetLessonVideoInput!) {
    setLessonVideo(input: $input) {
      id
    }
  }
`);

export const SET_LESSON_FILE = graphql(`
  mutation SetLessonFile($input: SetLessonFileInput!) {
    setLessonFile(input: $input) {
      id
    }
  }
`);

// ───────────────────────── uploads ─────────────────────────

/** Step 1: the server checks type and size and gives a presigned S3 PUT link */
export const CREATE_UPLOAD = graphql(`
  mutation CreateUpload($input: CreateUploadInput!) {
    createUpload(input: $input) {
      assetId
      uploadUrl
    }
  }
`);

/** Step 3 (after the browser's PUT): the server asks S3 what arrived → READY */
export const CONFIRM_UPLOAD = graphql(`
  mutation ConfirmUpload($assetId: String!) {
    confirmUpload(assetId: $assetId) {
      id
      status
      originalName
      size
    }
  }
`);

// ───────────────────────── assignments ─────────────────────────

export const CREATE_ASSIGNMENT = graphql(`
  mutation CreateAssignment($input: CreateAssignmentInput!) {
    createAssignment(input: $input) {
      id
    }
  }
`);

export const UPDATE_ASSIGNMENT = graphql(`
  mutation UpdateAssignment($input: UpdateAssignmentInput!) {
    updateAssignment(input: $input) {
      id
    }
  }
`);

export const PUBLISH_ASSIGNMENT = graphql(`
  mutation PublishAssignment($input: PublishInput!) {
    publishAssignment(input: $input) {
      id
      publishedAt
    }
  }
`);

// ───────────────────────── grading ─────────────────────────

/** Saved at once, but students see it only after publishGrades (one mapper hides it) */
export const GRADE_SUBMISSION = graphql(`
  mutation GradeSubmission($input: GradeSubmissionInput!) {
    gradeSubmission(input: $input) {
      id
      status
      score
      feedback
      gradedAt
      gradedByName
    }
  }
`);

/** "Please redo": one more attempt for the student, the score is cleared */
export const RETURN_SUBMISSION = graphql(`
  mutation ReturnSubmission($input: ReturnSubmissionInput!) {
    returnSubmission(input: $input) {
      id
      status
    }
  }
`);

/** After the deadline: 0 (MISSING) for every student who handed in nothing; returns how many */
export const GIVE_ZERO_TO_MISSING = graphql(`
  mutation GiveZeroToMissing($assignmentId: String!) {
    giveZeroToMissing(assignmentId: $assignmentId)
  }
`);

export const PUBLISH_GRADES = graphql(`
  mutation PublishGrades($input: PublishGradesInput!) {
    publishGrades(input: $input) {
      id
      gradesPublishedAt
    }
  }
`);
