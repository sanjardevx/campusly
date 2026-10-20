import { registerEnumType } from '@nestjs/graphql';
import { MediaKind, MediaStatus } from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(MediaKind, { name: 'MediaKind' });
registerEnumType(MediaStatus, { name: 'MediaStatus' });

export { MediaKind, MediaStatus };
