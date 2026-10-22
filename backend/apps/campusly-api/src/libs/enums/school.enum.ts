import { registerEnumType } from '@nestjs/graphql';
import {
  PeriodKind,
  SchoolEventKind,
} from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(PeriodKind, { name: 'PeriodKind' });
registerEnumType(SchoolEventKind, { name: 'SchoolEventKind' });

export { PeriodKind, SchoolEventKind };
