import { registerEnumType } from '@nestjs/graphql';

/** The tabs of the Q&A lists (student course page, teacher inbox) */
export enum QuestionTab {
  ALL = 'ALL',
  /** The viewer's own questions (students) */
  MINE = 'MINE',
  /** A teacher replied, or it was marked resolved */
  ANSWERED = 'ANSWERED',
  UNANSWERED = 'UNANSWERED',
}
registerEnumType(QuestionTab, { name: 'QuestionTab' });
