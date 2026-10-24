import { graphql } from '@/libs/gql';

/** Heartbeat from the player: the server decides how far the student really got */
export const UPDATE_LESSON_PROGRESS = graphql(`
  mutation UpdateLessonProgress($input: LessonProgressInput!) {
    updateLessonProgress(input: $input) {
      lessonId
      status
      lastPositionSec
      maxPositionSec
      percent
    }
  }
`);

/** "Opened" (VIEW) or "Mark as done" (MANUAL) */
export const COMPLETE_LESSON = graphql(`
  mutation CompleteLesson($lessonId: String!) {
    completeLesson(lessonId: $lessonId) {
      lessonId
      status
    }
  }
`);

/** A presigned PUT for one file of this assignment (the key holds the assignment id) */
export const CREATE_SUBMISSION_UPLOAD = graphql(`
  mutation CreateSubmissionUpload($input: CreateSubmissionUploadInput!) {
    createSubmissionUpload(input: $input) {
      assetId
      uploadUrl
    }
  }
`);

/** One attempt: text and/or READY files (the server checks every file is this student's) */
export const SUBMIT_ASSIGNMENT = graphql(`
  mutation SubmitAssignment($input: SubmitAssignmentInput!) {
    submitAssignment(input: $input) {
      id
      status
    }
  }
`);

export const ADD_SUBMISSION_COMMENT = graphql(`
  mutation AddSubmissionComment($input: AddSubmissionCommentInput!) {
    addSubmissionComment(input: $input) {
      id
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

/** Opening a card marks it read (twice is fine on the server) */
export const MARK_ANNOUNCEMENT_READ = graphql(`
  mutation MarkAnnouncementRead($id: String!) {
    markAnnouncementRead(id: $id) {
      id
      isRead
    }
  }
`);

/** "Mark all as read": everything the viewer may see; returns how many were new */
export const MARK_ALL_ANNOUNCEMENTS_READ = graphql(`
  mutation MarkAllAnnouncementsRead {
    markAllAnnouncementsRead
  }
`);
