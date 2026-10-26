import { registerEnumType } from '@nestjs/graphql';
import { TutorRole } from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(TutorRole, { name: 'TutorRole' });

/** POST /tutor/chat: a new question, or the next help level for the same problem */
export enum TutorAction {
  ASK = 'ASK',
  NEXT_HINT = 'NEXT_HINT',
}

export { TutorRole };
