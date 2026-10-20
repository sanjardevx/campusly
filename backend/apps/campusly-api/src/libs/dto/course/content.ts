import { Field, Int, ObjectType } from '@nestjs/graphql';
import { CompletionType, LessonType } from '../../enums/course.enum';

/**
 * publishedAt: null = draft, in the past = visible to students, in the future = scheduled.
 */
@ObjectType()
export class Lesson {
  @Field(() => String)
  id: string;

  @Field(() => String)
  moduleId: string;

  @Field(() => String)
  title: string;

  @Field(() => LessonType)
  type: LessonType;

  /** READING: the text; LINK: the URL */
  @Field(() => String, { nullable: true })
  body: string | null;

  /** A READY video (VIDEO lessons); the link comes from `lessonVideo` */
  @Field(() => String, { nullable: true })
  videoAssetId: string | null;

  @Field(() => Date, { nullable: true })
  dueAt: Date | null;

  @Field(() => CompletionType)
  completionType: CompletionType;

  /** Teachers only (context for the AI tutor); always null for students and parents */
  @Field(() => String, { nullable: true })
  tutorNotes: string | null;

  @Field(() => Int)
  order: number;

  @Field(() => Date, { nullable: true })
  publishedAt: Date | null;
}

/** A week of the course */
@ObjectType()
export class Module {
  @Field(() => String)
  id: string;

  @Field(() => String)
  courseId: string;

  @Field(() => String)
  title: string;

  @Field(() => Int)
  order: number;

  /** "YYYY-MM-DD" */
  @Field(() => String, { nullable: true })
  startsAt: string | null;

  @Field(() => String, { nullable: true })
  endsAt: string | null;

  /** Hidden from students even when published (the publish date is kept) */
  @Field(() => Boolean)
  isHidden: boolean;

  @Field(() => Date, { nullable: true })
  publishedAt: Date | null;

  /** In order; for students only the published ones */
  @Field(() => [Lesson])
  lessons: Lesson[];
}
