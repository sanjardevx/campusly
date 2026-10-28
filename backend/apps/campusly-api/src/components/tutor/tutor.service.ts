import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  QUIZ_GRACE_SEC,
  TUTOR_CONTEXT_CHUNKS,
  TUTOR_HISTORY_MESSAGES,
  TUTOR_MAX_TOKENS,
} from '../../libs/config';
import type {
  TutorConversation,
  TutorMessage,
  TutorSource,
  TutorStatus,
  TutorThread,
} from '../../libs/dto/tutor/tutor';
import type { TutorChatInput } from '../../libs/dto/tutor/tutor.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import { TutorAction } from '../../libs/enums/tutor.enum';
import type { AuthUser } from '../../libs/types/auth';
import { errorReason } from '../../libs/utils/error-reason';
import { AccessPolicy } from '../auth/policies/access.policy';
import { LLM_PROVIDER, type LlmProvider } from './llm/llm.provider';
import { TutorLimitsService } from './tutor-limits.service';
import {
  buildSystemPrompt,
  type PromptMaterial,
  toTurns,
} from './tutor-prompt';
import { toVectorLiteral } from './tutor-text';

/** Server-Sent Events the chat stream sends (see TutorController) */
export type TutorEvent = 'meta' | 'delta' | 'done' | 'error';
export type TutorEmit = (event: TutorEvent, data: object) => void;

/** What the student is asking about, loaded and checked from the DB */
interface Topic {
  lessonId: string | null;
  assignmentId: string | null;
  title: string | null;
  teacherNotes: string | null;
  mode: 'HINTS' | 'CHECK_ONLY';
  finalAnswer: string | null;
}

/** Everything checked before the stream opens; the answer is produced by runChat */
export interface PreparedChat {
  user: AuthUser;
  llm: LlmProvider;
  action: TutorAction;
  text: string;
  course: { id: string; title: string };
  topic: Topic;
  conversation: { id: string; level: number } | null;
}

type MessageRow = Prisma.TutorMessageGetPayload<object>;

/** A conversation with its course and its last question or answer (for the list) */
const CONVERSATION_INCLUDE = {
  course: { select: { title: true } },
  messages: {
    where: { role: { not: 'SYSTEM' } },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { text: true },
  },
} satisfies Prisma.TutorConversationInclude;

const toConversation = (
  row: Prisma.TutorConversationGetPayload<{
    include: typeof CONVERSATION_INCLUDE;
  }>,
): TutorConversation => ({
  id: row.id,
  courseId: row.courseId,
  courseTitle: row.course.title,
  lessonId: row.lessonId,
  assignmentId: row.assignmentId,
  title: row.title,
  preview: row.messages[0]?.text.slice(0, 200) ?? '',
  level: row.level,
  updatedAt: row.updatedAt,
});

const toMessage = (row: MessageRow): TutorMessage => ({
  id: row.id,
  role: row.role,
  text: row.text,
  level: row.level,
  sources: (row.sources as TutorSource[] | null) ?? [],
  createdAt: row.createdAt,
});

/**
 * AI Study Tutor (DECISIONS §14): Socratic hints from the course's own materials.
 * Students only — RolesGuard keeps parents and staff out, and every query is limited to the
 * student's own conversations. A request is checked in full (course, topic, quiz, limits)
 * before the stream starts, so errors are normal HTTP errors, not half-written streams.
 */
@Injectable()
export class TutorService {
  private readonly logger = new Logger('Tutor');

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly limits: TutorLimitsService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider | null,
  ) {}

  public async getStatus(user: AuthUser): Promise<TutorStatus> {
    return {
      enabled: this.llm !== null,
      used: await this.limits.used(user.id),
      limit: this.limits.limitFor(user),
      quizActive: await this.hasOpenQuiz(user.id),
    };
  }

  public async getConversations(user: AuthUser): Promise<TutorConversation[]> {
    const rows = await this.prismaService.tutorConversation.findMany({
      where: { studentId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: CONVERSATION_INCLUDE,
    });
    return rows.map(toConversation);
  }

  public async getThread(
    user: AuthUser,
    conversationId: string,
  ): Promise<TutorThread> {
    const row = await this.prismaService.tutorConversation.findFirst({
      where: { id: conversationId, studentId: user.id },
      include: CONVERSATION_INCLUDE,
    });
    if (!row) throw notFound('Conversation');
    const messages = await this.prismaService.tutorMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      conversation: toConversation(row),
      messages: messages.map(toMessage),
    };
  }

  /** "I solved it": the next question starts again at level 1 (no model call, not counted) */
  public async markSolved(
    user: AuthUser,
    conversationId: string,
  ): Promise<TutorMessage> {
    await this.findOwn(user, conversationId);
    const [, message] = await this.prismaService.$transaction([
      this.prismaService.tutorConversation.update({
        where: { id: conversationId },
        data: { level: 1 },
      }),
      this.prismaService.tutorMessage.create({
        data: { conversationId, role: 'SYSTEM', text: 'solved' },
      }),
    ]);
    return toMessage(message);
  }

  // ─────────────────────────── chat ───────────────────────────

  /**
   * Checks, in order: the tutor is on → the conversation is the student's own (or the course is
   * theirs) → the topic is visible and the teacher allows the tutor on it → no quiz is open →
   * today's budget and the student's daily limit. Only then is one request counted.
   */
  public async prepareChat(
    user: AuthUser,
    input: TutorChatInput,
  ): Promise<PreparedChat> {
    if (!this.llm) {
      throw new ServiceUnavailableException({
        code: ErrorCode.TUTOR_DISABLED,
        message: 'The tutor is not connected on this server',
      });
    }
    const text = input.text?.trim() ?? '';
    if (input.action === TutorAction.ASK && !text) {
      throw badRequest('Write a question');
    }

    let conversation: PreparedChat['conversation'] = null;
    let courseId: string;
    let lessonId: string | null;
    let assignmentId: string | null;
    if (input.conversationId) {
      const own = await this.findOwn(user, input.conversationId);
      conversation = { id: own.id, level: own.level };
      ({ courseId, lessonId, assignmentId } = own);
    } else {
      if (input.action === TutorAction.NEXT_HINT || !input.courseId) {
        throw badRequest('Start a conversation with a question and a course');
      }
      if (input.lessonId && input.assignmentId) {
        throw badRequest('Pick one lesson or one assignment');
      }
      courseId = input.courseId;
      lessonId = input.lessonId ?? null;
      assignmentId = input.assignmentId ?? null;
    }
    if (input.action === TutorAction.NEXT_HINT && conversation!.level >= 4) {
      throw badRequest('This was the last help level');
    }

    // Checked every time: an enrollment can end, a teacher can switch the tutor off later
    await this.accessPolicy.assertCanViewCourse(user, courseId);
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    const topic = await this.loadTopic(user, courseId, lessonId, assignmentId);
    if (await this.hasOpenQuiz(user.id)) {
      throw new ForbiddenException({
        code: ErrorCode.TUTOR_QUIZ_ACTIVE,
        message: 'The tutor is off while a quiz is open',
      });
    }
    await this.limits.assertBudget();
    await this.limits.reserve(user);
    return {
      user,
      llm: this.llm,
      action: input.action,
      text,
      course,
      topic,
      conversation,
    };
  }

  /**
   * Saves the question, finds the course material closest to it (pgvector), streams the model's
   * answer as `delta` events and saves it. If the model fails before answering, the request is
   * given back. If the student leaves mid-answer, what was written is kept (it was paid for).
   */
  public async runChat(
    chat: PreparedChat,
    emit: TutorEmit,
    signal: AbortSignal,
  ): Promise<void> {
    const { user, llm, course, topic } = chat;
    const asking = chat.action === TutorAction.ASK;
    const level = asking ? 1 : chat.conversation!.level + 1;
    let answered = false;
    let streamed = '';
    let conversationId = chat.conversation?.id;

    try {
      if (conversationId) {
        await this.prismaService.tutorConversation.update({
          where: { id: conversationId },
          data: { level },
        });
      } else {
        conversationId = (
          await this.prismaService.tutorConversation.create({
            data: {
              studentId: user.id,
              courseId: course.id,
              lessonId: topic.lessonId,
              assignmentId: topic.assignmentId,
              title: topic.title ?? chat.text.slice(0, 80),
              level,
            },
          })
        ).id;
      }
      const asked = await this.prismaService.tutorMessage.create({
        data: asking
          ? { conversationId, role: 'STUDENT', text: chat.text }
          : { conversationId, role: 'SYSTEM', text: 'anotherHint' },
      });
      emit('meta', { conversationId, level, message: toMessage(asked) });

      const history = (
        await this.prismaService.tutorMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: TUTOR_HISTORY_MESSAGES,
        })
      ).reverse();
      // "Another hint" searches with the problem the student asked about last
      const question = asking
        ? chat.text
        : ([...history].reverse().find((m) => m.role === 'STUDENT')?.text ??
          '');
      const materials = await this.searchMaterials(
        llm,
        course.id,
        [topic.title, question].filter(Boolean).join('\n'),
      );

      const result = await llm.streamChat(
        {
          system: buildSystemPrompt({
            courseTitle: course.title,
            topicTitle: topic.title,
            teacherNotes: topic.teacherNotes,
            mode: topic.mode,
            finalAnswer: topic.finalAnswer,
            level,
            materials,
          }),
          messages: toTurns(history),
          maxTokens: TUTOR_MAX_TOKENS,
          signal,
        },
        (delta) => {
          answered = true;
          streamed += delta;
          emit('delta', { text: delta });
        },
      );
      answered = true;
      await this.limits.addCost(llm.name, result);
      const reply = await this.prismaService.tutorMessage.create({
        data: result.refused
          ? { conversationId, role: 'SYSTEM', text: 'refused' }
          : {
              conversationId,
              role: 'TUTOR',
              text: result.text,
              level,
              sources: uniqueSources(
                materials,
              ) as unknown as Prisma.InputJsonArray,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
            },
      });
      emit('done', {
        message: toMessage(reply),
        level,
        used: await this.limits.used(user.id),
      });
    } catch (err) {
      if (signal.aborted) {
        // The student closed the page: keep the part they already saw
        if (streamed && conversationId) {
          await this.prismaService.tutorMessage.create({
            data: { conversationId, role: 'TUTOR', text: streamed, level },
          });
        }
        return;
      }
      this.logger.error(`Tutor answer failed: ${errorReason(err)}`);
      if (!answered) await this.limits.refund(user.id);
      emit('error', { code: ErrorCode.TUTOR_FAILED });
    }
  }

  /**
   * The closest pieces of THIS course's material that the student may see right now: a lesson in
   * a published, visible week; an assignment that is published, not a quiz, tutor not OFF.
   * Exact search (no vector index): a course has a few thousand pieces at most.
   */
  private async searchMaterials(
    llm: LlmProvider,
    courseId: string,
    query: string,
  ): Promise<PromptMaterial[]> {
    const embedding = await llm.embed(query);
    await this.limits.addCost(llm.name, { embedTokens: embedding.tokens });
    return this.prismaService.$queryRaw<PromptMaterial[]>`
      SELECT c."title", c."kind", c."locator", c."text"
      FROM document_chunks c
      LEFT JOIN lessons l ON l."id" = c."lessonId"
      LEFT JOIN modules m ON m."id" = l."moduleId"
      LEFT JOIN assignments a ON a."id" = c."assignmentId"
      WHERE c."courseId" = ${courseId}::uuid
        AND (c."lessonId" IS NULL OR (l."publishedAt" <= now()
          AND m."publishedAt" <= now() AND NOT m."isHidden"))
        AND (c."assignmentId" IS NULL OR (a."publishedAt" <= now()
          AND a."type" <> 'QUIZ' AND a."tutorMode" <> 'OFF'))
      ORDER BY c."embedding" <=> ${toVectorLiteral(embedding.vector)}::vector
      LIMIT ${TUTOR_CONTEXT_CHUNKS}`;
  }

  /** The picked lesson / assignment must be visible to the student and belong to the course */
  private async loadTopic(
    user: AuthUser,
    courseId: string,
    lessonId: string | null,
    assignmentId: string | null,
  ): Promise<Topic> {
    const none: Topic = {
      lessonId: null,
      assignmentId: null,
      title: null,
      teacherNotes: null,
      mode: 'HINTS',
      finalAnswer: null,
    };
    if (lessonId) {
      const lesson = await this.accessPolicy.assertCanViewLesson(
        user,
        lessonId,
      );
      if (lesson.module.courseId !== courseId) throw notFound('Lesson');
      return {
        ...none,
        lessonId,
        title: lesson.title,
        teacherNotes: lesson.tutorNotes,
      };
    }
    if (assignmentId) {
      const assignment = await this.accessPolicy.assertCanViewAssignment(
        user,
        assignmentId,
      );
      if (assignment.courseId !== courseId) throw notFound('Assignment');
      if (assignment.type === 'QUIZ' || assignment.tutorMode === 'OFF') {
        throw new ForbiddenException({
          code: ErrorCode.TUTOR_OFF,
          message: 'The teacher turned the tutor off for this assignment',
        });
      }
      return {
        ...none,
        assignmentId,
        title: assignment.title,
        mode: assignment.tutorMode,
        finalAnswer: assignment.finalAnswer,
      };
    }
    return none;
  }

  /** A quiz attempt still running (not submitted, time not over): the tutor stays off */
  private async hasOpenQuiz(studentId: string): Promise<boolean> {
    const since = new Date(Date.now() - QUIZ_GRACE_SEC * 1000);
    const open = await this.prismaService.quizAttempt.count({
      where: { studentId, submittedAt: null, deadlineAt: { gt: since } },
    });
    return open > 0;
  }

  /** Only the student's own conversations exist for them: anyone else's is "not found" */
  private async findOwn(user: AuthUser, conversationId: string) {
    const row = await this.prismaService.tutorConversation.findFirst({
      where: { id: conversationId, studentId: user.id },
    });
    if (!row) throw notFound('Conversation');
    return row;
  }
}

/** One card per lesson / file page under "Course materials" */
function uniqueSources(materials: PromptMaterial[]): TutorSource[] {
  const seen = new Map<string, TutorSource>();
  for (const m of materials) {
    const page = m.locator ? Number(m.locator) : null;
    seen.set(`${m.kind}|${m.title}|${page}`, {
      kind: m.kind,
      title: m.title,
      page,
    });
  }
  return [...seen.values()];
}

const badRequest = (message: string) =>
  new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });

const notFound = (what: string) =>
  new NotFoundException({
    code: ErrorCode.NOT_FOUND,
    message: `${what} not found`,
  });
