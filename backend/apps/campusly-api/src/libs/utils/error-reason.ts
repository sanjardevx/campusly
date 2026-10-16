// Short, readable reason for a connection error.
// A refused connection is an AggregateError with an EMPTY message; the reason is in `code`.
export function errorReason(err: unknown): string {
  const { message, code } = (err ?? {}) as { message?: string; code?: string };
  return [code, message?.trim()].filter(Boolean).join(' ') || 'unknown error';
}
