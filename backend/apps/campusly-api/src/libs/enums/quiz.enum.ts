import { registerEnumType } from '@nestjs/graphql';
import { QuizQuestionType } from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(QuizQuestionType, { name: 'QuizQuestionType' });

/** Where a student is with a quiz */
export enum QuizState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
}
registerEnumType(QuizState, { name: 'QuizState' });

export { QuizQuestionType };
