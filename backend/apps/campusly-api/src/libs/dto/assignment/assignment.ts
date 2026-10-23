import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { AssignmentType, TutorMode } from '../../enums/assignment.enum';
import { CourseFile } from '../media/media';

@ObjectType()
export class Assignment {
  @Field(() => String)
  id: string;

  @Field(() => String)
  courseId: string;

  /** The lesson (week) it belongs to, if any */
  /** The week it sits in on the course page */
  @Field(() => String, { nullable: true })
  moduleId: string | null;

  @Field(() => String, { nullable: true })
  lessonId: string | null;

  @Field(() => String)
  categoryId: string;

  /** e.g. "Homework" */
  @Field(() => String)
  categoryName: string;

  @Field(() => AssignmentType)
  type: AssignmentType;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  instructions: string | null;

  /** Raw points, e.g. 20 */
  @Field(() => Float)
  maxScore: number;

  /** Also decides the quarter the grade belongs to */
  @Field(() => Date, { nullable: true })
  dueAt: Date | null;

  @Field(() => Boolean)
  allowLate: boolean;

  /** 0 for an EXAM (offline: graded, never submitted) */
  @Field(() => Int)
  maxAttempts: number;

  /** e.g. ["pdf", "jpg"] */
  @Field(() => [String])
  acceptedFileTypes: string[];

  @Field(() => TutorMode)
  tutorMode: TutorMode;

  /** Teachers only: always null for students and parents */
  @Field(() => String, { nullable: true })
  finalAnswer: string | null;

  /** null = draft; in the future = scheduled */
  @Field(() => Date, { nullable: true })
  publishedAt: Date | null;

  /** null = students and parents do not see scores yet */
  @Field(() => Date, { nullable: true })
  gradesPublishedAt: Date | null;

  /** The teacher's attachments, in order; the link comes from `courseFileUrl` */
  @Field(() => [CourseFile])
  files: CourseFile[];
}
