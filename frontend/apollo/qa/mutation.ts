import { graphql } from '@/libs/gql';

export const ASK_QUESTION = graphql(`
  mutation AskQuestion($input: AskQuestionInput!) {
    askQuestion(input: $input) {
      ...QuestionFields
    }
  }
`);

/** Every thread mutation answers with the whole thread, so the page simply re-renders it */
export const ANSWER_QUESTION = graphql(`
  mutation AnswerQuestion($input: AnswerQuestionInput!) {
    answerQuestion(input: $input) {
      ...ThreadFields
    }
  }
`);

export const SET_QUESTION_RESOLVED = graphql(`
  mutation SetQuestionResolved($id: String!, $resolved: Boolean!) {
    setQuestionResolved(id: $id, resolved: $resolved) {
      ...ThreadFields
    }
  }
`);

export const SET_QUESTION_PINNED = graphql(`
  mutation SetQuestionPinned($id: String!, $pinned: Boolean!) {
    setQuestionPinned(id: $id, pinned: $pinned) {
      ...ThreadFields
    }
  }
`);

export const HIDE_QUESTION = graphql(`
  mutation HideQuestion($id: String!) {
    hideQuestion(id: $id)
  }
`);

export const HIDE_ANSWER = graphql(`
  mutation HideAnswer($id: String!) {
    hideAnswer(id: $id) {
      ...ThreadFields
    }
  }
`);
