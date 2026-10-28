import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Role } from '../../enums/user.enum';

@ObjectType()
export class CourseQuestion {
  @Field(() => String)
  id: string;

  @Field(() => String)
  courseId: string;

  /** e.g. "Algebra · 9A" */
  @Field(() => String)
  courseTitle: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  body: string;

  @Field(() => String)
  authorName: string;

  /** Staff only (the teacher sees "ID 26100042"); null for students */
  @Field(() => String, { nullable: true })
  authorLoginId: string | null;

  @Field(() => Boolean)
  isMine: boolean;

  @Field(() => Boolean)
  isPrivate: boolean;

  /** Pinned as FAQ */
  @Field(() => Boolean)
  isPinned: boolean;

  /** A teacher replied, or it was marked resolved */
  @Field(() => Boolean)
  isAnswered: boolean;

  @Field(() => Boolean)
  isResolved: boolean;

  /** What it is about; both null = the course in general */
  @Field(() => String, { nullable: true })
  lessonId: string | null;

  @Field(() => String, { nullable: true })
  lessonTitle: string | null;

  @Field(() => String, { nullable: true })
  assignmentId: string | null;

  @Field(() => String, { nullable: true })
  assignmentTitle: string | null;

  /** Visible replies; staffReplies of them by teachers ("1 reply (teacher)") */
  @Field(() => Int)
  replies: number;

  @Field(() => Int)
  staffReplies: number;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class CourseQuestions {
  /** Pinned (FAQ) first, newest first */
  @Field(() => [CourseQuestion])
  list: CourseQuestion[];

  /** Matching the whole input, tab included */
  @Field(() => Int)
  total: number;

  /** Tab counts — course filter and search apply, the tab does not */
  @Field(() => Int)
  all: number;

  @Field(() => Int)
  mine: number;

  @Field(() => Int)
  answered: number;

  @Field(() => Int)
  unanswered: number;
}

@ObjectType()
export class CourseAnswer {
  @Field(() => String)
  id: string;

  @Field(() => String)
  authorName: string;

  @Field(() => Role)
  authorRole: Role;

  /** A teacher or admin ("Instructor"); students' replies are "Classmate" */
  @Field(() => Boolean)
  isStaff: boolean;

  @Field(() => Boolean)
  isMine: boolean;

  @Field(() => String)
  body: string;

  @Field(() => Date)
  createdAt: Date;
}

/** One question with its replies (oldest first) */
@ObjectType()
export class CourseQuestionThread {
  @Field(() => CourseQuestion)
  question: CourseQuestion;

  @Field(() => [CourseAnswer])
  answers: CourseAnswer[];

  /** The viewer is a teacher of the course or an admin: resolve, pin, hide */
  @Field(() => Boolean)
  canModerate: boolean;

  /** false in an archived course (read-only) */
  @Field(() => Boolean)
  canReply: boolean;
}
