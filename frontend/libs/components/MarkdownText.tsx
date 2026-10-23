import type { ReactNode } from 'react';
import { Box, Link, Typography, type SxProps, type Theme } from '@mui/material';

// **bold**, *italic* / _italic_, [text](https://…) — the marks MarkdownField's toolbar writes
const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

/** One line's inline marks → React elements (never HTML strings, so nothing can be injected) */
function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('[')) {
      const m = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
      if (m) {
        return (
          <Link key={i} href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </Link>
        );
      }
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      if (part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * Shows teacher-written Markdown (lessons, homework): paragraphs, "- " / "1. " lists, bold, italic
 * and http(s) links. A small renderer instead of a library: only what the editor can produce.
 */
export function MarkdownText({ text, sx }: { text: string; sx?: SxProps<Theme> }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const lines = paragraph;
    blocks.push(
      <Typography key={blocks.length} component="p" sx={{ fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit', m: 0 }}>
        {lines.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {inline(line)}
          </span>
        ))}
      </Typography>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    blocks.push(
      <Box key={blocks.length} component={ordered ? 'ol' : 'ul'} sx={{ m: 0, pl: 3 }}>
        {items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Box>,
    );
    list = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return <Box sx={[{ display: 'flex', flexDirection: 'column', gap: 1.25, overflowWrap: 'anywhere' }, ...(Array.isArray(sx) ? sx : [sx])]}>{blocks}</Box>;
}
