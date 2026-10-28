import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { QUIZ_GRACE_SEC } from '../../libs/config';
import type {
  MyQuiz,
  QuizEditor,
  QuizQuestion,
  QuizResult,
  StudentQuizQuestion,
} from '../../libs/dto/quiz/quiz';
import type {
  QuizQuestionInput,
  SaveQuizAnswerInput,
  SetQuizQuestionsInput,
} from '../../libs/dto/quiz/quiz.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import { QuizState } from '../../libs/enums/quiz.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AccessPolicy } from '../auth/policies/access.policy';
import { finishQuizAttempt, type QuizOrder, shuffled } from './quiz-grading';

type QuestionRow = Prisma.QuizQuestionGetPayload<object>;

const num = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));

/**
 * Quizzes (DECISIONS log 2026-10-27): teachers write the questions; a student gets one timed
 * attempt with a shuffled order; answers are saved one by one and refused after the deadline;
 * the attempt is graded into the normal Submission. Right answers reach students only after the
 * teacher publishes the grades.
 */
@Injectable()
export class QuizService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  // ─────────────────────────── teacher ───────────────────────────

  public async getEditor(
    user: AuthUser,
    assignmentId: string,
  ): Promise<QuizEditor> {
    const quiz = await this.findQuiz(assignmentId);
    await this.accessPolicy.assertTeacherOf(user, quiz.courseId);
    const [questions, attempts] = await Promise.all([
      this.activeQuestions(quiz.id),
      this.prismaService.quizAttempt.count({
        where: { assignmentId: quiz.id },
      }),
    ]);
    return {
      questions: questions.map(toQuizQuestion),
      locked: attempts > 0,
      attempts,
    };
  }

  /** The whole list replaces the old one (no hard delete), and the quiz's points become its sum */
  public async setQuestions(
    user: AuthUser,
    input: SetQuizQuestionsInput,
  ): Promise<QuizEditor> {
    const quiz = await this.findQuiz(input.assignmentId);
    await this.accessPolicy.assertCanEditCourse(user, quiz.courseId);
    const started = await this.prismaService.quizAttempt.count({
      where: { assignmentId: quiz.id },
    });
    if (started) {
      throw new BadRequestException({
        code: ErrorCode.QUIZ_LOCKED,
        message: 'A student has started: the questions cannot change',
      });
    }
    const questions = input.questions.map(validQuestion);
    const total = questions.reduce((sum, q) => sum + q.points, 0);

    await this.prismaService.$transaction(async (tx) => {
      await tx.quizQuestion.updateMany({
        where: { assignmentId: quiz.id, removedAt: null },
        data: { removedAt: new Date() },
      });
      await tx.quizQuestion.createMany({
        data: questions.map((q, order) => ({
          ...q,
          assignmentId: quiz.id,
          order,
        })),
      });
      await tx.assignment.update({
        where: { id: quiz.id },
        data: { maxScore: total },
      });
    });
    return this.getEditor(user, quiz.id);
  }

  // ─────────────────────────── student ───────────────────────────

  public async getMyQuiz(
    user: AuthUser,
    assignmentId: string,
  ): Promise<MyQuiz> {
    const quiz = await this.viewQuiz(user, assignmentId);
    const attempt = await this.closeIfExpired(
      await this.prismaService.quizAttempt.findUnique({
        where: {
          assignmentId_studentId: { assignmentId: quiz.id, studentId: user.id },
        },
        include: { answers: true },
      }),
    );
    const questions = await this.activeQuestions(quiz.id);
    const now = new Date();
    const base = {
      assignmentId: quiz.id,
      timeLimitMin: quiz.timeLimitMin,
      questionCount: questions.length,
      totalPoints: questions.reduce((sum, q) => sum + Number(q.points), 0),
      dueAt: quiz.dueAt,
      serverNow: now,
    };
    if (!attempt) {
      return {
        ...base,
        state: QuizState.NOT_STARTED,
        canStart: this.canStart(quiz, questions.length, now),
        startedAt: null,
        deadlineAt: null,
        submittedAt: null,
        questions: [],
      };
    }
    const open = !attempt.submittedAt;
    return {
      ...base,
      state: open ? QuizState.IN_PROGRESS : QuizState.SUBMITTED,
      // Demo students may try a finished quiz again while it is open (DECISIONS §12, demo v2)
      canStart:
        !open && user.isDemo && this.canStart(quiz, questions.length, now),
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      questions: open
        ? toStudentQuestions(
            questions,
            attempt.order as unknown as QuizOrder,
            attempt.answers,
          )
        : [],
    };
  }

  /** One attempt: the order is shuffled once, the deadline is min(now + limit, due date) */
  public async startQuiz(
    user: AuthUser,
    assignmentId: string,
  ): Promise<MyQuiz> {
    const quiz = await this.viewQuiz(user, assignmentId);
    const questions = await this.activeQuestions(quiz.id);
    const now = new Date();
    if (!this.canStart(quiz, questions.length, now)) {
      throw new BadRequestException({
        code: ErrorCode.QUIZ_CLOSED,
        message: 'This quiz cannot be started',
      });
    }
    if (user.isDemo) await this.clearDemoAttempt(quiz.id, user.id);
    const byLimit = new Date(now.getTime() + (quiz.timeLimitMin ?? 0) * 60_000);
    const deadlineAt =
      quiz.dueAt && quiz.dueAt < byLimit ? quiz.dueAt : byLimit;
    const order: QuizOrder = {
      questions: shuffled(questions.map((q) => q.id)),
      options: Object.fromEntries(
        questions
          .filter((q) => q.type === 'MULTIPLE_CHOICE')
          .map((q) => [q.id, shuffled(q.options.map((_, i) => i))]),
      ),
    };
    try {
      await this.prismaService.quizAttempt.create({
        data: {
          assignmentId: quiz.id,
          studentId: user.id,
          startedAt: now,
          deadlineAt,
          order: order as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // A double click: the unique (assignment, student) keeps it to one attempt
      if (!(
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ))
        throw err;
    }
    return this.getMyQuiz(user, quiz.id);
  }

  /** Saved at once; refused after the deadline (+ a few seconds of network delay) */
  public async saveAnswer(
    user: AuthUser,
    input: SaveQuizAnswerInput,
  ): Promise<boolean> {
    const quiz = await this.viewQuiz(user, input.assignmentId);
    const attempt = await this.myAttempt(user, quiz.id);
    const now = new Date();
    if (
      attempt.submittedAt ||
      now.getTime() > attempt.deadlineAt.getTime() + QUIZ_GRACE_SEC * 1000
    ) {
      await finishQuizAttempt(this.prismaService, attempt.id, now);
      throw new BadRequestException({
        code: ErrorCode.QUIZ_TIME_UP,
        message: 'Time is up',
      });
    }
    const order = attempt.order as unknown as QuizOrder;
    // A question of another quiz "does not exist" in this attempt
    if (!order.questions.includes(input.questionId))
      throw notFound('Question not found');
    const question = await this.prismaService.quizQuestion.findUniqueOrThrow({
      where: { id: input.questionId },
    });

    let choice: number | null = null;
    let number: number | null = null;
    if (question.type === 'NUMBER') {
      if (input.number === undefined) throw badRequest('Enter a number');
      number = input.number;
    } else if (question.type === 'TRUE_FALSE') {
      if (input.choice !== 0 && input.choice !== 1)
        throw badRequest('Choose true or false');
      choice = input.choice;
    } else {
      // The position the student saw → the teacher's index (the stored, gradable value)
      const teacherIndex =
        input.choice === undefined
          ? undefined
          : order.options[question.id]?.[input.choice];
      if (teacherIndex === undefined)
        throw badRequest('Choose one of the answers');
      choice = teacherIndex;
    }
    await this.prismaService.quizAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: question.id,
        },
      },
      create: {
        attemptId: attempt.id,
        questionId: question.id,
        choice,
        number,
      },
      update: { choice, number },
    });
    return true;
  }

  public async submitQuiz(
    user: AuthUser,
    assignmentId: string,
  ): Promise<MyQuiz> {
    const quiz = await this.viewQuiz(user, assignmentId);
    const attempt = await this.myAttempt(user, quiz.id);
    await finishQuizAttempt(this.prismaService, attempt.id);
    return this.getMyQuiz(user, quiz.id);
  }

  // ─────────────────────────── results ───────────────────────────

  /**
   * A finished attempt question by question. Students and parents: only after the grades are
   * published (before that the quiz "has no result" for them). Teachers: any enrolled student.
   */
  public async getResult(
    user: AuthUser,
    assignmentId: string,
    studentId?: string,
  ): Promise<QuizResult> {
    const quiz = await this.accessPolicy.assertCanViewAssignment(
      user,
      assignmentId,
    );
    if (quiz.type !== 'QUIZ') throw badRequest('Not a quiz');
    let ofStudent: string;
    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      if (!studentId) throw badRequest('Choose a student');
      await this.accessPolicy.assertCanViewStudentInCourse(
        user,
        quiz.courseId,
        studentId,
      );
      ofStudent = studentId;
    } else {
      ofStudent = await this.accessPolicy.resolveStudentScope(user, studentId);
      if (!quiz.gradesPublishedAt) throw notFound('No result yet');
    }
    const attempt = await this.closeIfExpired(
      await this.prismaService.quizAttempt.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId: quiz.id,
            studentId: ofStudent,
          },
        },
        include: { answers: true },
      }),
    );
    if (!attempt?.submittedAt) throw notFound('No result yet');

    const questions = await this.activeQuestions(quiz.id);
    const byId = new Map(questions.map((q) => [q.id, q]));
    const answers = new Map(attempt.answers.map((a) => [a.questionId, a]));
    const order = attempt.order as unknown as QuizOrder;
    const items = order.questions
      .map((id) => byId.get(id))
      .filter((q): q is QuestionRow => !!q)
      .map((q) => {
        const a = answers.get(q.id);
        return {
          type: q.type,
          text: q.text,
          points: Number(q.points),
          options: q.options,
          myChoice: a?.choice ?? null,
          myNumber: num(a?.number ?? null),
          correctOption: q.correctOption,
          correctNumber: num(q.correctNumber),
          tolerance: num(q.tolerance),
          isCorrect: a?.isCorrect ?? false,
          earned: Number(a?.points ?? 0),
        };
      });
    return {
      score: items.reduce((sum, i) => sum + i.earned, 0),
      maxScore: Number(quiz.maxScore),
      submittedAt: attempt.submittedAt,
      items,
    };
  }

  // ─────────────────────────── helpers ───────────────────────────

  private async findQuiz(assignmentId: string) {
    const quiz = await this.prismaService.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!quiz) throw notFound('Assignment not found');
    if (quiz.type !== 'QUIZ') throw badRequest('Not a quiz');
    return quiz;
  }

  /** The student sees this published quiz (AccessPolicy: enrolled, published, course not a draft) */
  private async viewQuiz(user: AuthUser, assignmentId: string) {
    const quiz = await this.accessPolicy.assertCanViewAssignment(
      user,
      assignmentId,
    );
    if (quiz.type !== 'QUIZ') throw badRequest('Not a quiz');
    return quiz;
  }

  private async myAttempt(user: AuthUser, assignmentId: string) {
    const attempt = await this.prismaService.quizAttempt.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    });
    if (!attempt) throw notFound('Start the quiz first');
    return attempt;
  }

  /**
   * Demo students may retake a quiz (DECISIONS §12, demo v2): a finished attempt, its answers and
   * its score are removed before the new start. Demo data is rebuilt every night, so these rows
   * are not records; an attempt still running is kept (a double click must not restart it).
   */
  private async clearDemoAttempt(assignmentId: string, studentId: string) {
    const done = await this.prismaService.quizAttempt.findFirst({
      where: { assignmentId, studentId, submittedAt: { not: null } },
      select: { id: true },
    });
    if (!done) return;
    const submission = { assignmentId, studentId };
    await this.prismaService.$transaction([
      this.prismaService.quizAnswer.deleteMany({
        where: { attemptId: done.id },
      }),
      this.prismaService.quizAttempt.delete({ where: { id: done.id } }),
      this.prismaService.submissionComment.deleteMany({
        where: { submission },
      }),
      this.prismaService.submissionAttempt.deleteMany({
        where: { submission },
      }),
      this.prismaService.submission.deleteMany({ where: submission }),
    ]);
  }

  private canStart(
    quiz: {
      dueAt: Date | null;
      gradesPublishedAt: Date | null;
      course: { status: string };
    },
    questionCount: number,
    now: Date,
  ): boolean {
    return (
      questionCount > 0 &&
      (!quiz.dueAt || now < quiz.dueAt) &&
      !quiz.gradesPublishedAt &&
      quiz.course.status === 'ACTIVE'
    );
  }

  /** An attempt whose time is over is graded on the next read (the batch job does it too) */
  private async closeIfExpired<
    T extends { id: string; submittedAt: Date | null; deadlineAt: Date } | null,
  >(attempt: T): Promise<T> {
    if (!attempt || attempt.submittedAt) return attempt;
    const now = new Date();
    if (now.getTime() <= attempt.deadlineAt.getTime() + QUIZ_GRACE_SEC * 1000)
      return attempt;
    await finishQuizAttempt(this.prismaService, attempt.id, now);
    return (await this.prismaService.quizAttempt.findUnique({
      where: { id: attempt.id },
      include: { answers: true },
    })) as T;
  }

  private activeQuestions(assignmentId: string) {
    return this.prismaService.quizQuestion.findMany({
      where: { assignmentId, removedAt: null },
      orderBy: { order: 'asc' },
    });
  }
}

/** Per-type rules: what class-validator cannot say about one question */
function validQuestion(q: QuizQuestionInput) {
  const base = { type: q.type, text: q.text.trim(), points: q.points };
  if (!base.text) throw badRequest('A question has no text');
  switch (q.type) {
    case 'MULTIPLE_CHOICE': {
      const options = (q.options ?? []).map((o) => o.trim());
      if (options.length < 2 || options.some((o) => !o)) {
        throw badRequest('A multiple-choice question needs 2–6 answers');
      }
      if (q.correctOption === undefined || q.correctOption >= options.length) {
        throw badRequest('Mark the right answer');
      }
      return {
        ...base,
        options,
        correctOption: q.correctOption,
        correctNumber: null,
        tolerance: null,
      };
    }
    case 'TRUE_FALSE':
      if (q.correctOption !== 0 && q.correctOption !== 1)
        throw badRequest('Mark true or false');
      return {
        ...base,
        options: [],
        correctOption: q.correctOption,
        correctNumber: null,
        tolerance: null,
      };
    case 'NUMBER':
      if (q.correctNumber === undefined)
        throw badRequest('Enter the right number');
      return {
        ...base,
        options: [],
        correctOption: null,
        correctNumber: q.correctNumber,
        tolerance: q.tolerance ?? 0,
      };
  }
}

function toQuizQuestion(q: QuestionRow): QuizQuestion {
  return {
    id: q.id,
    type: q.type,
    text: q.text,
    points: Number(q.points),
    options: q.options,
    correctOption: q.correctOption,
    correctNumber: num(q.correctNumber),
    tolerance: num(q.tolerance),
  };
}

/** The attempt's view: this student's order, options shuffled, saved answers, no right answers */
function toStudentQuestions(
  questions: QuestionRow[],
  order: QuizOrder,
  answers: {
    questionId: string;
    choice: number | null;
    number: Prisma.Decimal | null;
  }[],
): StudentQuizQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const saved = new Map(answers.map((a) => [a.questionId, a]));
  return order.questions
    .map((id) => byId.get(id))
    .filter((q): q is QuestionRow => !!q)
    .map((q) => {
      const a = saved.get(q.id);
      const perm = order.options[q.id] ?? [];
      return {
        id: q.id,
        type: q.type,
        text: q.text,
        points: Number(q.points),
        options:
          q.type === 'MULTIPLE_CHOICE' ? perm.map((i) => q.options[i]) : [],
        // The teacher's index back to the position this student sees
        myChoice:
          a?.choice == null
            ? null
            : q.type === 'MULTIPLE_CHOICE'
              ? perm.indexOf(a.choice)
              : a.choice,
        myNumber: num(a?.number ?? null),
      };
    });
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
