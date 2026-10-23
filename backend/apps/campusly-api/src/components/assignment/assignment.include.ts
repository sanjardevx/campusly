import type { Prisma } from '../../../../../generated/prisma/client';
import { COURSE_FILE_SELECT } from '../media/course-file';

// Its own file (no service imports): AccessPolicy uses it too, and importing assignment.service
// there would be a circular import (AccessPolicy would be undefined when Nest builds the module).
/** Everything toAssignment needs: the category name and the attachments still attached */
export const ASSIGNMENT_INCLUDE = {
  category: { select: { name: true } },
  files: {
    where: { removedAt: null },
    orderBy: { order: 'asc' },
    include: { asset: { select: COURSE_FILE_SELECT } },
  },
} satisfies Prisma.AssignmentInclude;
