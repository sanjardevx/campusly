import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { MARK_TUTOR_SOLVED } from '@/apollo/student/mutation';
import { TUTOR_CONVERSATION, TUTOR_CONVERSATIONS, TUTOR_STATUS } from '@/apollo/student/query';
import { streamTutor, TutorError } from './stream';

/**
 * The AI Study Tutor's data (DECISIONS §14: Socratic hints, help levels 1–4, per-assignment
 * tutorMode, daily limits). The page only talks to this hook: conversations and messages come
 * from GraphQL, a question goes to POST /tutor/chat and its answer streams in piece by piece.
 */

/** 1 Nudge → 2 Concept hint → 3 Step hint → 4 Similar example (never the final answer) */
export type HelpLevel = 1 | 2 | 3 | 4;
export const HELP_LEVELS: HelpLevel[] = [1, 2, 3, 4];

export interface TutorConversation {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  assignmentId: string | null;
  /** "Homework 5 — Factoring" or the first question */
  title: string;
  /** The last message, one line */
  preview: string;
  updatedAt: string;
}

export interface TutorMessage {
  id: string;
  /** SYSTEM: notes from the app (another hint asked, solved, refused), not from the model */
  role: 'STUDENT' | 'TUTOR' | 'SYSTEM';
  /** For SYSTEM: a key under student.json → tutor.system.* (the UI translates it) */
  text: string;
  createdAt: string;
}

/** Course material the tutor was given (lesson, assignment or file of this course only) */
export interface TutorSource {
  kind: 'LESSON' | 'ASSIGNMENT' | 'FILE';
  title: string;
  /** PDFs: the page */
  page: number | null;
}

export interface TutorQuota {
  used: number;
  limit: number;
}

/** What the student picked above the chat: a course and, optionally, one lesson or assignment */
export interface TutorTopic {
  courseId: string;
  courseTitle: string;
  /** "lesson:<id>" / "assignment:<id>" / "" (a general question about the course) */
  topicKey: string;
  topicTitle: string | null;
}

export interface Tutor {
  /** false when the tutor is not connected on this server: the page says so */
  connected: boolean;
  /** A quiz is open: the tutor is off until it is submitted */
  quizActive: boolean;
  conversations: TutorConversation[];
  activeId: string | null;
  messages: TutorMessage[];
  sources: TutorSource[];
  quota: TutorQuota;
  level: HelpLevel;
  /** An answer is being written */
  streaming: boolean;
  /** The last refused request's error code (errors.json), until the next action */
  error: string | null;
  select: (id: string | null) => void;
  send: (text: string, topic: TutorTopic) => void;
  nextHint: () => void;
  solved: () => void;
}

/** The request in flight: what the stream has sent so far */
interface Live {
  messages: (TutorMessage & { sources?: TutorSource[] })[];
  draft: string;
  level: number | null;
  used: number | null;
}

const asMessage = (m: Record<string, unknown>) => m as unknown as TutorMessage & { sources?: TutorSource[] };

export function useTutor(): Tutor {
  const client = useApolloClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const { data: status } = useQuery(TUTOR_STATUS, { fetchPolicy: 'cache-and-network' });
  const { data: list } = useQuery(TUTOR_CONVERSATIONS, { fetchPolicy: 'cache-and-network' });
  const { data: thread } = useQuery(TUTOR_CONVERSATION, {
    variables: { conversationId: activeId ?? '' },
    skip: !activeId,
    fetchPolicy: 'cache-and-network',
  });
  const [markSolved] = useMutation(MARK_TUTOR_SOLVED);

  const saved = activeId ? (thread?.tutorConversation.messages ?? []) : [];
  const savedIds = new Set(saved.map((m) => m.id));
  // Saved messages, then what the stream added that the refetch has not brought yet
  const messages: (TutorMessage & { sources?: TutorSource[] })[] = [
    ...saved.map((m) => ({ ...m, sources: m.sources as TutorSource[] })),
    ...(live?.messages.filter((m) => !savedIds.has(m.id)) ?? []),
  ];
  if (live?.draft) messages.push({ id: 'draft', role: 'TUTOR', text: live.draft, createdAt: new Date().toISOString() });

  const lastAnswer = [...messages].reverse().find((m) => m.role === 'TUTOR' && m.sources?.length);
  const level = (live?.level ?? thread?.tutorConversation.conversation.level ?? 1) as HelpLevel;

  const refresh = () => client.refetchQueries({ include: ['TutorStatus', 'TutorConversations', 'TutorConversation'] });

  const run = async (body: object) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setLive({ messages: [], draft: '', level: null, used: null });
    try {
      await streamTutor(
        body,
        (event, data) => {
          if (event === 'meta') {
            setActiveId(data.conversationId as string);
            setLive((l) => l && { ...l, level: data.level as number, messages: [...l.messages, asMessage(data.message as Record<string, unknown>)] });
          } else if (event === 'delta') {
            setLive((l) => l && { ...l, draft: l.draft + (data.text as string) });
          } else if (event === 'done') {
            setLive((l) => l && { ...l, draft: '', used: data.used as number, messages: [...l.messages, asMessage(data.message as Record<string, unknown>)] });
          } else if (event === 'error') {
            setError(data.code as string);
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof TutorError ? err.code : 'UNKNOWN');
    }
    if (controller.signal.aborted) return;
    await refresh();
    setLive(null);
  };

  return {
    connected: status?.tutorStatus.enabled ?? true,
    quizActive: status?.tutorStatus.quizActive ?? false,
    conversations: list?.tutorConversations ?? [],
    activeId,
    messages,
    sources: lastAnswer?.sources ?? [],
    quota: { used: live?.used ?? status?.tutorStatus.used ?? 0, limit: status?.tutorStatus.limit ?? 30 },
    level,
    streaming: live !== null,
    error,
    select: (id) => {
      abort.current?.abort();
      setLive(null);
      setError(null);
      setActiveId(id);
    },
    send: (text, topic) => {
      const [kind, topicId] = topic.topicKey.split(':');
      void run(
        activeId
          ? { action: 'ASK', conversationId: activeId, text }
          : {
              action: 'ASK',
              courseId: topic.courseId,
              text,
              ...(kind === 'lesson' ? { lessonId: topicId } : kind === 'assignment' ? { assignmentId: topicId } : {}),
            },
      );
    },
    nextHint: () => {
      if (activeId) void run({ action: 'NEXT_HINT', conversationId: activeId });
    },
    solved: () => {
      if (!activeId) return;
      setError(null);
      void markSolved({ variables: { conversationId: activeId } }).then(refresh);
    },
  };
}
