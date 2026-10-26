import { createHash } from 'node:crypto';
import { TUTOR_CHUNK } from '../../libs/config';

export const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

/** pgvector's text form, e.g. "[0.12,-0.5,...]" (sent as a parameter and cast with ::vector) */
export const toVectorLiteral = (vector: number[]) => `[${vector.join(',')}]`;

/** Markdown images and links carry URLs, not knowledge: keep only their words */
function plainText(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Cuts a text into pieces of about `size` characters for the search index. It breaks between
 * paragraphs, then sentences, then words, and repeats the last `overlap` characters at the start
 * of the next piece, so an idea split across two pieces is still found.
 */
export function chunkText(
  text: string,
  size = TUTOR_CHUNK.size,
  overlap = TUTOR_CHUNK.overlap,
): string[] {
  const clean = plainText(text);
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      // The latest good break in the second half of the window
      const breakAt = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf('\n'),
      );
      const spaceAt = window.lastIndexOf(' ');
      if (breakAt > size / 2) end = start + breakAt + 1;
      else if (spaceAt > size / 2) end = start + spaceAt;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
    // Start the overlap at a word, not in the middle of one
    const space = clean.indexOf(' ', start);
    if (space !== -1 && space < end) start = space + 1;
  }
  return chunks;
}
