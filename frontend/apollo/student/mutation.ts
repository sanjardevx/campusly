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
