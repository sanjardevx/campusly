import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorRole } from '../../enums/tutor.enum';

/** What the tutor page shows before anything is asked */
@ObjectType()
export class TutorStatus {
  /** false: the tutor is not connected on this server (the page says so and sends nothing) */
  @Field(() => Boolean)
  enabled: boolean;

  /** Requests used today / allowed per day */
  @Field(() => Int)
  used: number;

  @Field(() => Int)
  limit: number;

  /** The student has a quiz open: the tutor is off until it is submitted */
  @Field(() => Boolean)
  quizActive: boolean;
}

/** A piece of course material the tutor was given for an answer */
@ObjectType()
export class TutorSource {
  /** LESSON, ASSIGNMENT or FILE */
  @Field(() => String)
  kind: string;

  @Field(() => String)
  title: string;

  /** PDFs: the page */
  @Field(() => Int, { nullable: true })
  page: number | null;
}

@ObjectType()
export class TutorMessage {
  @Field(() => String)
  id: string;

  @Field(() => TutorRole)
  role: TutorRole;

  /** SYSTEM: a key the UI translates (anotherHint, solved, refused) */
  @Field(() => String)
  text: string;

  /** TUTOR: the help level of this answer */
  @Field(() => Int, { nullable: true })
  level: number | null;

  @Field(() => [TutorSource])
  sources: TutorSource[];

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class TutorConversation {
  @Field(() => String)
  id: string;

  @Field(() => String)
  courseId: string;

  @Field(() => String)
  courseTitle: string;

  @Field(() => String, { nullable: true })
  lessonId: string | null;

  @Field(() => String, { nullable: true })
  assignmentId: string | null;

  @Field(() => String)
  title: string;

  /** The last question or answer, for the list */
  @Field(() => String)
  preview: string;

  /** Help level of the current problem (1–4) */
  @Field(() => Int)
  level: number;

  @Field(() => Date)
  updatedAt: Date;
}

/** One conversation with its messages, oldest first */
@ObjectType()
export class TutorThread {
  @Field(() => TutorConversation)
  conversation: TutorConversation;

  @Field(() => [TutorMessage])
  messages: TutorMessage[];
}
