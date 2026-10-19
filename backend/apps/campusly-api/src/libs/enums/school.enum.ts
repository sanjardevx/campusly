import { registerEnumType } from '@nestjs/graphql';
import { PeriodKind } from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(PeriodKind, { name: 'PeriodKind' });

export { PeriodKind };
