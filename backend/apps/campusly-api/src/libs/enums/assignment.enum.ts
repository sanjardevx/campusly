import { registerEnumType } from '@nestjs/graphql';
import {
  AssignmentType,
  SubmissionStatus,
  TutorMode,
} from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(AssignmentType, { name: 'AssignmentType' });
registerEnumType(TutorMode, { name: 'TutorMode' });
registerEnumType(SubmissionStatus, { name: 'SubmissionStatus' });

export { AssignmentType, SubmissionStatus, TutorMode };
