import { refreshAccessToken } from '@/libs/auth';
import { expiresSoon, getAccessToken } from '@/libs/auth/token';
import { API_URL } from '@/libs/config';

/** A refused request: `code` is the backend's error code (TUTOR_LIMIT, TUTOR_QUIZ_ACTIVE …) */
export class TutorError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

async function accessToken(forceRefresh: boolean): Promise<string | null> {
  const token = getAccessToken();
  if (!forceRefresh && token && !expiresSoon(token)) return token;
  return refreshAccessToken();
}

/**
 * POST /tutor/chat and read its Server-Sent Events as they arrive. EventSource cannot send the
 * Authorization header, so this is fetch + a stream reader. The token comes from memory like
 * every other request; a 401 refreshes it once and tries again.
 */
export async function streamTutor(
  body: object,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const post = async (forceRefresh: boolean) =>
    fetch(`${API_URL}/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken(forceRefresh)}` },
      body: JSON.stringify(body),
      signal,
    });

  let res: Response;
  try {
    res = await post(false);
    if (res.status === 401) res = await post(true);
  } catch {
    throw new TutorError('NETWORK_ERROR');
  }
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => ({}))) as { code?: string };
    throw new TutorError(json.code ?? 'UNKNOWN');
  }

  // Events are separated by a blank line: "event: delta\ndata: {...}\n\n"
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (event && data) onEvent(event, JSON.parse(data) as Record<string, unknown>);
    }
  }
}
