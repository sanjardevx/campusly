import { useCallback, useEffect, useRef, useState } from 'react';

/** A file already uploaded (READY) and waiting in the draft */
export interface DraftFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

interface Draft {
  text: string;
  files: DraftFile[];
  savedAt: string | null;
}

const EMPTY: Draft = { text: '', files: [], savedAt: null };

/**
 * The homework draft lives in this browser only (DECISIONS §10): the text and the uploaded files,
 * per student and assignment, cleared after submitting. Storage can be missing (private mode):
 * then the draft simply is not kept.
 */
/** The stored draft, or an empty one (no storage in private mode, broken JSON) */
function load(key: string | null): Draft {
  if (!key || typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Draft) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Read once on mount: give the component `key={draftKey}` so another student / assignment remounts it */
export function useDraft(key: string | null) {
  const [draft, setDraft] = useState<Draft>(() => load(key));
  const timer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    (next: Draft) => {
      if (!key) return next;
      const saved = { ...next, savedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(key, JSON.stringify(saved));
        return saved;
      } catch {
        return next;
      }
    },
    [key],
  );

  /** Typing saves 800 ms after the last key; files save at once. A function patch sees the latest draft. */
  const update = useCallback(
    (patch: Partial<Draft> | ((current: Draft) => Partial<Draft>), now = false) => {
      setDraft((current) => {
        const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
        window.clearTimeout(timer.current);
        if (now) return persist(next);
        timer.current = window.setTimeout(() => setDraft((d) => persist(d)), 800);
        return next;
      });
    },
    [persist],
  );

  const save = useCallback(() => setDraft((d) => persist(d)), [persist]);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    if (key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // nothing kept, nothing to remove
      }
    }
    setDraft(EMPTY);
  }, [key]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { draft, update, save, clear };
}
