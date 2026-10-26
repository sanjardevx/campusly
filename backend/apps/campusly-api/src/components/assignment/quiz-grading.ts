import type { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../database/prisma.service';

/** A student's shuffled order, stored on the attempt (QuizAttempt.order) */
export interface QuizOrder {
  questions: string[];
  /** questionId → the teacher's option indexes in the order this student sees them */
  options: Record<string, number[]>;
}

interface GradableQuestion {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'NUMBER';
  correctOption: number | null;
  correctNumber: Prisma.Decimal | number | null;
  tolerance: Prisma.Decimal | number | null;
}

interface GivenAnswer {
  choice: number | null;
  number: Prisma.Decimal | number | null;
}

/** Fisher–Yates: every order equally likely */
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Right or wrong; no answer is wrong. NUMBER: within the tolerance (0 = exact) */
export function isAnswerCorrect(
  question: GradableQuestion,
  answer: GivenAnswer | undefined,
): boolean {
  if (!answer) return false;
  if (question.type === 'NUMBER') {
    if (answer.number === null || question.correctNumber === null) return false;
    const diff = Math.abs(
      Number(answer.number) - Number(question.correctNumber),
    );
    // A tiny epsilon: 0.1 + 0.2 must still equal 0.3
    return diff <= Number(question.tolerance ?? 0) + 1e-9;
  }
  return answer.choice !== null && answer.choice === question.correctOption;
}

/**
 * Ends an attempt and grades it: every answer gets right / wrong and points, and the total goes
 * to the student's Submission (GRADED) — the normal way into the gradebook. Students still see
 * nothing until the teacher publishes the grades. Safe to call twice: only an open attempt is
 * closed (conditional update), so "Submit", a late read and the batch job cannot grade it twice.
 * Returns false when there was nothing to do.
 */
export async function finishQuizAttempt(
  prisma: PrismaService,
  attemptId: string,
  now = new Date(),
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    if (!attempt || attempt.submittedAt) return false;
    // Time ran out: the attempt ended at its deadline, not when someone noticed
    const submittedAt = now < attempt.deadlineAt ? now : attempt.deadlineAt;
    const { count } = await tx.quizAttempt.updateMany({
      where: { id: attempt.id, submittedAt: null },
      data: { submittedAt },
    });
    if (count === 0) return false;

    const questions = await tx.quizQuestion.findMany({
      where: { assignmentId: attempt.assignmentId, removedAt: null },
    });
    const byQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
    let score = 0;
    for (const question of questions) {
      const answer = byQuestion.get(question.id);
      const correct = isAnswerCorrect(question, answer);
      const points = correct ? Number(question.points) : 0;
      score += points;
      if (answer) {
        await tx.quizAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: correct, points },
        });
      }
    }

    const submission = await tx.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: attempt.assignmentId,
          studentId: attempt.studentId,
        },
      },
      create: {
        assignmentId: attempt.assignmentId,
        studentId: attempt.studentId,
        status: 'GRADED',
        submittedAt,
        score,
        gradedAt: now,
      },
      update: {
        status: 'GRADED',
        submittedAt,
        score,
        gradedAt: now,
        gradedById: null,
      },
    });
    // The submission page lists attempts: the quiz is attempt 1 (never late: no start after the due date)
    await tx.submissionAttempt.upsert({
      where: {
        submissionId_number: { submissionId: submission.id, number: 1 },
      },
      create: { submissionId: submission.id, number: 1, submittedAt },
      update: {},
    });
    return true;
  });
}
