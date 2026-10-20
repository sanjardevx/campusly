import { registerEnumType } from '@nestjs/graphql';
import { ProgressStatus } from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(ProgressStatus, { name: 'ProgressStatus' });

export { ProgressStatus };
