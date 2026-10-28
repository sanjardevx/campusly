import { graphql } from '@/libs/gql';

/** Course Q&A (day 21): students and teachers share the list and the thread */
export const QUESTION_FIELDS = graphql(`
  fragment QuestionFields on CourseQuestion {
    id
    courseId
    courseTitle
    title
    body
    authorName
    authorLoginId
    isMine
    isPrivate
    isPinned
    isAnswered
    isResolved
    lessonId
    lessonTitle
    assignmentId
    assignmentTitle
    replies
    staffReplies
    createdAt
  }
`);

/** The student's course Q&A page and the teacher's inbox: one page of a tab plus the tab counts */
export const COURSE_QUESTIONS = graphql(`
  query CourseQuestions($input: CourseQuestionsInquiry) {
    courseQuestions(input: $input) {
      total
      all
      mine
      answered
      unanswered
      list {
        ...QuestionFields
      }
    }
  }
`);

export const THREAD_FIELDS = graphql(`
  fragment ThreadFields on CourseQuestionThread {
    question {
      ...QuestionFields
    }
    answers {
      id
      authorName
      authorRole
      isStaff
      isMine
      body
      createdAt
    }
    canModerate
    canReply
  }
`);

export const COURSE_QUESTION = graphql(`
  query CourseQuestion($id: String!) {
    courseQuestion(id: $id) {
      ...ThreadFields
    }
  }
`);
