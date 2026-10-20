import { registerEnumType } from '@nestjs/graphql';
import {
  CompletionType,
  CourseStatus,
  CourseTeacherRole,
  EnrollmentStatus,
  LessonType,
  RecordStatus,
} from '../../../../../generated/prisma/enums';

// Defined in prisma/schema.prisma; registered here for GraphQL
registerEnumType(RecordStatus, { name: 'RecordStatus' });
registerEnumType(CourseStatus, { name: 'CourseStatus' });
registerEnumType(CourseTeacherRole, { name: 'CourseTeacherRole' });
registerEnumType(EnrollmentStatus, { name: 'EnrollmentStatus' });
registerEnumType(LessonType, { name: 'LessonType' });
registerEnumType(CompletionType, { name: 'CompletionType' });

export {
  CompletionType,
  CourseStatus,
  CourseTeacherRole,
  EnrollmentStatus,
  LessonType,
  RecordStatus,
};
