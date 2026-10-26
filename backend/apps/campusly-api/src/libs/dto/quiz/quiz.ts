import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { QuizQuestionType, QuizState } from '../../enums/quiz.enum';

/** Teachers only: a question with its right answer */
@ObjectType()
export class QuizQuestion {
  @Field(() => String)
  id: string;

  @Field(() => QuizQuestionType)
  type: QuizQuestionType;

  @Field(() => String)
  text: string;

  @Field(() => Float)
  points: number;

  @Field(() => [String])
  options: string[];

  @Field(() => Int, { nullable: true })
  correctOption: number | null;

  @Field(() => Float, { nullable: true })
  correctNumber: number | null;

  @Field(() => Float, { nullable: true })
  tolerance: number | null;
}

/** The teacher's editor: the questions, and whether they are locked (someone has started) */
@ObjectType()
export class QuizEditor {
  @Field(() => [QuizQuestion])
  questions: QuizQuestion[];

  @Field(() => Boolean)
  locked: boolean;

  /** Students who started (submitted or not) */
  @Field(() => Int)
  attempts: number;
}

/** A question as the student sees it during the attempt: no right answer, shuffled options */
@ObjectType()
export class StudentQuizQuestion {
  @Field(() => String)
  id: string;

  @Field(() => QuizQuestionType)
  type: QuizQuestionType;

  @Field(() => String)
  text: string;

  @Field(() => Float)
  points: number;

  /** MULTIPLE_CHOICE answers in THIS student's order */
  @Field(() => [String])
  options: string[];

  /** The saved answer: a position in `options` (MC) or 1 / 0 (TRUE_FALSE) */
  @Field(() => Int, { nullable: true })
  myChoice: number | null;

  @Field(() => Float, { nullable: true })
  myNumber: number | null;
}

/** The student's quiz page */
@ObjectType()
export class MyQuiz {
  @Field(() => String)
  assignmentId: string;

  @Field(() => QuizState)
  state: QuizState;

  /** NOT_STARTED: the Start button is allowed (published, before the due date, questions exist) */
  @Field(() => Boolean)
  canStart: boolean;

  @Field(() => Int, { nullable: true })
  timeLimitMin: number | null;

  @Field(() => Int)
  questionCount: number;

  @Field(() => Float)
  totalPoints: number;

  @Field(() => Date, { nullable: true })
  dueAt: Date | null;

  @Field(() => Date, { nullable: true })
  startedAt: Date | null;

  @Field(() => Date, { nullable: true })
  deadlineAt: Date | null;

  @Field(() => Date, { nullable: true })
  submittedAt: Date | null;

  /** The server's clock: the timer counts with it, not with the device's clock */
  @Field(() => Date)
  serverNow: Date;

  /** IN_PROGRESS only (empty before the start and after the end) */
  @Field(() => [StudentQuizQuestion])
  questions: StudentQuizQuestion[];
}

/** One question of a finished attempt, after grades are published (or for the teacher) */
@ObjectType()
export class QuizResultItem {
  @Field(() => QuizQuestionType)
  type: QuizQuestionType;

  @Field(() => String)
  text: string;

  @Field(() => Float)
  points: number;

  /** MULTIPLE_CHOICE answers in the teacher's order */
  @Field(() => [String])
  options: string[];

  @Field(() => Int, { nullable: true })
  myChoice: number | null;

  @Field(() => Float, { nullable: true })
  myNumber: number | null;

  @Field(() => Int, { nullable: true })
  correctOption: number | null;

  @Field(() => Float, { nullable: true })
  correctNumber: number | null;

  @Field(() => Float, { nullable: true })
  tolerance: number | null;

  @Field(() => Boolean)
  isCorrect: boolean;

  @Field(() => Float)
  earned: number;
}

@ObjectType()
export class QuizResult {
  @Field(() => Float)
  score: number;

  @Field(() => Float)
  maxScore: number;

  @Field(() => Date, { nullable: true })
  submittedAt: Date | null;

  @Field(() => [QuizResultItem])
  items: QuizResultItem[];
}
