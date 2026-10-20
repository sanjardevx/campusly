import { Field, Int, ObjectType } from '@nestjs/graphql';
import { CourseStatus, CourseTeacherRole } from '../../enums/course.enum';

@ObjectType()
export class CourseTeacher {
  @Field(() => String)
  id: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => CourseTeacherRole)
  role: CourseTeacherRole;
}

/** Weighted part of the course grade (e.g. Homework 30%) */
@ObjectType()
export class GradeCategory {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  /** Percent; the weights of one course add up to 100 */
  @Field(() => Int)
  weight: number;

  @Field(() => Int)
  order: number;
}

/** Course = subject × class, e.g. "Algebra · 9A" */
@ObjectType()
export class Course {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => CourseStatus)
  status: CourseStatus;

  /** true: students are picked by hand (e.g. Korean group 1), not the whole class */
  @Field(() => Boolean)
  isSplitGroup: boolean;

  @Field(() => String)
  academicYearId: string;

  @Field(() => String, { nullable: true })
  periodId: string | null;

  @Field(() => String)
  groupId: string;

  /** e.g. "9A" */
  @Field(() => String)
  groupName: string;

  @Field(() => String)
  subjectId: string;

  @Field(() => String)
  subjectName: string;

  /** The owner first */
  @Field(() => [CourseTeacher])
  teachers: CourseTeacher[];

  /** Active enrollments */
  @Field(() => Int)
  studentCount: number;
}
