import { useState } from 'react';

/**
 * The AI Study Tutor's data, in the shapes the tutor API will return (DECISIONS §14: Socratic hints,
 * help levels 1–4, per-assignment tutorMode, daily limits; tables TutorConversation / TutorMessage).
 * The page only talks to this hook. Today it is a local stub — nothing leaves the browser and no
 * answer is made up; when the API lands, the hook's body becomes Apollo queries and mutations and
 * the components stay as they are.
 */

/** 1 Nudge → 2 Concept hint → 3 Step hint → 4 Similar example (never the final answer) */
export type HelpLevel = 1 | 2 | 3 | 4;
export const HELP_LEVELS: HelpLevel[] = [1, 2, 3, 4];

export interface TutorConversation {
  id: string;
  courseId: string;
  courseTitle: string;
  /** "Homework 5 — Factoring" or the first question */
  title: string;
  /** The last message, one line */
  preview: string;
  updatedAt: string;
}

export interface TutorMessage {
  id: string;
  /** SYSTEM: notes from the app (session opened, tutor not connected …), not from the model */
  role: 'STUDENT' | 'TUTOR' | 'SYSTEM';
  /** For SYSTEM: a key under student.json → tutor.system.* (the UI translates it) */
  text: string;
  createdAt: string;
}

/** Course material the tutor quoted (lesson or file of this course only) */
export interface TutorSource {
  kind: 'LESSON' | 'FILE';
  title: string;
  detail: string;
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
  /** false until the tutor API exists: the page says so and sends nothing */
  connected: boolean;
  conversations: TutorConversation[];
  activeId: string | null;
  messages: TutorMessage[];
  sources: TutorSource[];
  quota: TutorQuota;
  level: HelpLevel;
  select: (id: string | null) => void;
  send: (text: string, topic: TutorTopic) => void;
  nextHint: () => void;
  solved: () => void;
}

/** Daily questions per student (DECISIONS §14 "daily limits"); the server will own the real number */
const DAILY_LIMIT = 30;
const now = () => new Date().toISOString();
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()));

export function useTutor(): Tutor {
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, TutorMessage[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [level, setLevel] = useState<HelpLevel>(1);

  const add = (id: string, ...items: Omit<TutorMessage, 'id' | 'createdAt'>[]) =>
    setMessages((all) => ({ ...all, [id]: [...(all[id] ?? []), ...items.map((m) => ({ ...m, id: newId(), createdAt: now() }))] }));

  return {
    connected: false,
    conversations,
    activeId,
    messages: activeId ? (messages[activeId] ?? []) : [],
    sources: [],
    quota: { used: 0, limit: DAILY_LIMIT },
    level,
    select: (id) => {
      setActiveId(id);
      setLevel(1);
    },
    // Stub: keeps the question in this tab only and answers with an honest "not connected" note
    send: (text, topic) => {
      let id = activeId;
      if (!id) {
        id = newId();
        const conversation: TutorConversation = {
          id,
          courseId: topic.courseId,
          courseTitle: topic.courseTitle,
          title: topic.topicTitle ?? text.slice(0, 60),
          preview: text,
          updatedAt: now(),
        };
        setConversations((list) => [conversation, ...list]);
        setActiveId(id);
      } else {
        setConversations((list) => list.map((c) => (c.id === id ? { ...c, preview: text, updatedAt: now() } : c)));
      }
      add(id, { role: 'STUDENT', text }, { role: 'SYSTEM', text: 'notConnected' });
    },
    nextHint: () => setLevel((l) => (l < 4 ? ((l + 1) as HelpLevel) : l)),
    solved: () => setLevel(1),
  };
}
