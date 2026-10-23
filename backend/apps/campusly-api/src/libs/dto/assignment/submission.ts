import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { SubmissionStatus } from '../../enums/assignment.enum';
import { Role } from '../../enums/user.enum';

@ObjectType()
export class SubmissionFile {
  @Field(() => String)
  assetId: string;

  @Field(() => String)
  originalName: string;

  @Field(() => String)
  mimeType: string;

  @Field(() => Float)
  size: number;

  /** CloudFront link valid for 15 minutes (null when media is off) */
  @Field(() => String, { nullable: true })
  url: string | null;
}

@ObjectType()
export class SubmissionAttempt {
  /** 1, 2, 3 ... */
  @Field(() => Int)
  number: number;

  @Field(() => String, { nullable: true })
  text: string | null;

  @Field(() => Boolean)
  isLate: boolean;

  @Field(() => Date)
  submittedAt: Date;

  @Field(() => [SubmissionFile])
  files: SubmissionFile[];
}

@ObjectType()
export class SubmissionComment {
  @Field(() => String)
  id: string;

  @Field(() => String)
  authorName: string;

  @Field(() => Role)
  authorRole: Role;

  @Field(() => String)
  body: string;

  @Field(() => Date)
  createdAt: Date;
}

/**
 * One student's work on one assignment. For students and parents score, feedback and the
 * GRADED / MISSING status stay hidden until the teacher publishes the grades.
 */
@ObjectType()
export class Submission {
  @Field(() => String)
  id: string;

  @Field(() => String)
  assignmentId: string;

  @Field(() => String)
  studentId: string;

  @Field(() => SubmissionStatus)
  status: SubmissionStatus;

  @Field(() => Date, { nullable: true })
  submittedAt: Date | null;

  @Field(() => Float, { nullable: true })
  score: number | null;

  @Field(() => String, { nullable: true })
  feedback: string | null;

  @Field(() => Date, { nullable: true })
  gradedAt: Date | null;

  /** Who gave the current score ("Last modified by …"); hidden like the score until published */
  @Field(() => String, { nullable: true })
  gradedByName: string | null;

  /** How many more times the student may submit */
  @Field(() => Int)
  attemptsLeft: number;

  /** Oldest first */
  @Field(() => [SubmissionAttempt])
  attempts: SubmissionAttempt[];

  /** Oldest first */
  @Field(() => [SubmissionComment])
  comments: SubmissionComment[];
}

/** One line of the teacher's grading page: every active student, with or without work */
@ObjectType()
export class GradebookRow {
  @Field(() => String)
  studentId: string;

  @Field(() => String)
  loginId: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  /** null = nothing submitted and not graded yet */
  @Field(() => Submission, { nullable: true })
  submission: Submission | null;
}
