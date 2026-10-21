import { registerEnumType } from '@nestjs/graphql';
import { AttendanceStatus } from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(AttendanceStatus, { name: 'AttendanceStatus' });

export { AttendanceStatus };
