import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CourseAnswer,
  CourseQuestion,
  CourseQuestions,
  CourseQuestionThread,
} from '../../libs/dto/question/question';
import {
  AnswerQuestionInput,
  AskQuestionInput,
  CourseQuestionsInquiry,
} from '../../libs/dto/question/question.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import { QuestionTab } from '../../libs/enums/question.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { AccessPolicy } from '../auth/policies/access.policy';

const INCLUDE = {
  course: { select: { title: true } },
  author: { select: { firstName: true, lastName: true, loginId: true } },
  lesson: { select: { title: true } },
  assignment: { select: { title: true } },
  // Only for the reply counts on the list
  answers: { where: { status: 'ACTIVE' }, select: { isStaff: true } },
} satisfies Prisma.CourseQuestionInclude;
type Row = Prisma.CourseQuestionGetPayload<{ include: typeof INCLUDE }>;

/** A teacher replied, or someone marked it resolved */
const ANSWERED: Prisma.CourseQuestionWhereInput = {
  OR: [{ answeredAt: { not: null } }, { resolvedAt: { not: null } }],
};
const UNANSWERED: Prisma.CourseQuestionWhereInput = {
  answeredAt: null,
  resolvedAt: null,
};

/**
 * Course Q&A (DECISIONS §14): students ask, the course's teachers and classmates reply,
 * teachers resolve, pin as FAQ and hide. Every ID goes through AccessPolicy.questionScope.
 */
@Injectable()
export class QuestionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditService: AuditService,
  ) {}

  /** Student course page and teacher inbox: pinned (FAQ) first, newest first */
  public async getQuestions(
    user: AuthUser,
    input: CourseQuestionsInquiry = {},
  ): Promise<CourseQuestions> {
    if (input.courseId) {
      await this.accessPolicy.assertCanViewCourse(user, input.courseId);
    }
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const search = input.search?.trim();
    // The scope is one AND item: a filter from the client can never widen it
    const base: Prisma.CourseQuestionWhereInput = {
      AND: [
        this.accessPolicy.questionScope(user),
        input.courseId ? { courseId: input.courseId } : {},
        search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { body: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    const mine = { authorId: user.id };
    const tab = {
      [QuestionTab.ALL]: {},
      [QuestionTab.MINE]: mine,
      [QuestionTab.ANSWERED]: ANSWERED,
      [QuestionTab.UNANSWERED]: UNANSWERED,
    }[input.tab ?? QuestionTab.ALL];
    const where = { AND: [base, tab] };

    const [total, all, mineCount, answered, unanswered, rows] =
      await this.prismaService.$transaction([
        this.prismaService.courseQuestion.count({ where }),
        this.prismaService.courseQuestion.count({ where: base }),
        this.prismaService.courseQuestion.count({
          where: { AND: [base, mine] },
        }),
        this.prismaService.courseQuestion.count({
          where: { AND: [base, ANSWERED] },
        }),
        this.prismaService.courseQuestion.count({
          where: { AND: [base, UNANSWERED] },
        }),
        this.prismaService.courseQuestion.findMany({
          where,
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: INCLUDE,
        }),
      ]);
    return {
      total,
      all,
      mine: mineCount,
      answered,
      unanswered,
      list: rows.map((row) => toQuestion(row, user)),
    };
  }

  /** One question and its replies, oldest first */
  public async getThread(
    user: AuthUser,
    questionId: string,
  ): Promise<CourseQuestionThread> {
    const question = await this.accessPolicy.assertCanViewQuestion(
      user,
      questionId,
    );
    const [row, answers] = await this.prismaService.$transaction([
      this.prismaService.courseQuestion.findUniqueOrThrow({
        where: { id: question.id },
        include: INCLUDE,
      }),
      this.prismaService.courseAnswer.findMany({
        where: { questionId: question.id, status: 'ACTIVE' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: {
          author: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
    ]);
    return {
      question: toQuestion(row, user),
      answers: answers.map((a): CourseAnswer => ({
        id: a.id,
        authorName: `${a.author.firstName} ${a.author.lastName}`,
        authorRole: a.author.role,
        isStaff: a.isStaff,
        isMine: a.authorId === user.id,
        body: a.body,
        createdAt: a.createdAt,
      })),
      // questionScope already limited staff to their own courses
      canModerate: isStaff(user),
      canReply: question.course.status !== 'ARCHIVED',
    };
  }

  /**
   * A student asks in one of their courses. "About" must be a lesson or assignment of THIS
   * course that the student may see — an ID from another course is "not found" (IDOR).
   */
  public async ask(
    user: AuthUser,
    input: AskQuestionInput,
  ): Promise<CourseQuestion> {
    if (input.lessonId && input.assignmentId) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'A question is about one lesson or one assignment',
      });
    }
    await this.accessPolicy.assertCanViewCourse(user, input.courseId);
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: input.courseId },
      select: { status: true },
    });
    // Students do not see draft courses
    if (course.status === 'DRAFT') throw notFound('Course not found');
    assertWritable(course.status);

    if (input.lessonId) {
      const lesson = await this.accessPolicy.assertCanViewLesson(
        user,
        input.lessonId,
      );
      if (lesson.module.courseId !== input.courseId) {
        throw notFound('Lesson not found');
      }
    }
    if (input.assignmentId) {
      const assignment = await this.accessPolicy.assertCanViewAssignment(
        user,
        input.assignmentId,
      );
      if (assignment.courseId !== input.courseId) {
        throw notFound('Assignment not found');
      }
    }

    const row = await this.prismaService.courseQuestion.create({
      data: {
        courseId: input.courseId,
        authorId: user.id,
        lessonId: input.lessonId,
        assignmentId: input.assignmentId,
        title: input.title.trim(),
        body: input.body?.trim() ?? '',
        isPrivate: input.isPrivate ?? false,
      },
      include: INCLUDE,
    });
    return toQuestion(row, user);
  }

  /**
   * A reply. Classmates may reply to a question they can see (never a classmate's private one);
   * the first staff reply moves it to "Answered", and staff may resolve it in the same step.
   */
  public async answer(
    user: AuthUser,
    input: AnswerQuestionInput,
  ): Promise<CourseQuestionThread> {
    const question = await this.accessPolicy.assertCanViewQuestion(
      user,
      input.questionId,
    );
    assertWritable(question.course.status);
    const staff = isStaff(user);
    const now = new Date();

    await this.prismaService.$transaction(async (tx) => {
      await tx.courseAnswer.create({
        data: {
          questionId: question.id,
          authorId: user.id,
          body: input.body.trim(),
          isStaff: staff,
        },
      });
      if (staff) {
        await tx.courseQuestion.update({
          where: { id: question.id },
          data: {
            answeredAt: question.answeredAt ?? now,
            resolvedAt: input.resolve ? now : undefined,
          },
        });
      }
    });
    return this.getThread(user, question.id);
  }

  /** Staff: "Mark as resolved" / reopen */
  public async setResolved(
    user: AuthUser,
    questionId: string,
    resolved: boolean,
  ): Promise<CourseQuestionThread> {
    const question = await this.assertCanModerate(user, questionId);
    await this.prismaService.courseQuestion.update({
      where: { id: question.id },
      data: {
        resolvedAt: resolved ? (question.resolvedAt ?? new Date()) : null,
      },
    });
    return this.getThread(user, question.id);
  }

  /** Staff: "Pin as FAQ" — never a private question, the whole class would see it */
  public async setPinned(
    user: AuthUser,
    questionId: string,
    pinned: boolean,
  ): Promise<CourseQuestionThread> {
    const question = await this.assertCanModerate(user, questionId);
    if (pinned && question.isPrivate) {
      throw new BadRequestException({
        code: ErrorCode.QUESTION_PRIVATE,
        message: 'A private question cannot be pinned',
      });
    }
    await this.prismaService.courseQuestion.update({
      where: { id: question.id },
      data: { isPinned: pinned },
    });
    return this.getThread(user, question.id);
  }

  /** Staff: hidden for everyone; the row stays and the change is audited (no hard deletes) */
  public async hideQuestion(
    user: AuthUser,
    questionId: string,
  ): Promise<boolean> {
    const question = await this.assertCanModerate(user, questionId);
    await this.prismaService.$transaction(async (tx) => {
      await tx.courseQuestion.update({
        where: { id: question.id },
        data: { status: 'ARCHIVED', isPinned: false },
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.QUESTION_HIDE,
        entityType: 'CourseQuestion',
        entityId: question.id,
        before: { status: question.status, title: question.title },
        after: { status: 'ARCHIVED' },
      });
    });
    return true;
  }

  /** Staff: one reply hidden; "Answered" is worked out again from the staff replies left */
  public async hideAnswer(
    user: AuthUser,
    answerId: string,
  ): Promise<CourseQuestionThread> {
    const answer = await this.prismaService.courseAnswer.findUnique({
      where: { id: answerId },
    });
    if (!answer || answer.status !== 'ACTIVE') {
      throw notFound('Answer not found');
    }
    // A reply in someone else's course (or a hidden question) → 404 from the question check
    const question = await this.assertCanModerate(user, answer.questionId);

    await this.prismaService.$transaction(async (tx) => {
      await tx.courseAnswer.update({
        where: { id: answer.id },
        data: { status: 'ARCHIVED' },
      });
      if (answer.isStaff) {
        const first = await tx.courseAnswer.findFirst({
          where: { questionId: question.id, isStaff: true, status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        await tx.courseQuestion.update({
          where: { id: question.id },
          data: { answeredAt: first?.createdAt ?? null },
        });
      }
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.ANSWER_HIDE,
        entityType: 'CourseAnswer',
        entityId: answer.id,
        before: { status: answer.status, body: answer.body.slice(0, 200) },
        after: { status: 'ARCHIVED' },
      });
    });
    return this.getThread(user, question.id);
  }

  // ───────────────────────── helpers ─────────────────────────

  /**
   * The resolver lets only TEACHER / ADMIN in; questionScope limits a teacher to their own
   * courses (another teacher's question → 404). An archived course is read-only.
   */
  private async assertCanModerate(user: AuthUser, questionId: string) {
    const question = await this.accessPolicy.assertCanViewQuestion(
      user,
      questionId,
    );
    assertWritable(question.course.status);
    return question;
  }
}

function isStaff(user: AuthUser): boolean {
  return user.role === 'TEACHER' || user.role === 'ADMIN';
}

/** An archived course (past year) is read-only */
function assertWritable(status: string): void {
  if (status === 'ARCHIVED') {
    throw new BadRequestException({
      code: ErrorCode.BAD_REQUEST,
      message: 'The course is archived',
    });
  }
}

function toQuestion(row: Row, user: AuthUser): CourseQuestion {
  return {
    id: row.id,
    courseId: row.courseId,
    courseTitle: row.course.title,
    title: row.title,
    body: row.body,
    authorName: `${row.author.firstName} ${row.author.lastName}`,
    authorLoginId: isStaff(user) ? row.author.loginId : null,
    isMine: row.authorId === user.id,
    isPrivate: row.isPrivate,
    isPinned: row.isPinned,
    isAnswered: !!row.answeredAt || !!row.resolvedAt,
    isResolved: !!row.resolvedAt,
    lessonId: row.lessonId,
    lessonTitle: row.lesson?.title ?? null,
    assignmentId: row.assignmentId,
    assignmentTitle: row.assignment?.title ?? null,
    replies: row.answers.length,
    staffReplies: row.answers.filter((a) => a.isStaff).length,
    createdAt: row.createdAt,
  };
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
