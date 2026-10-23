import { useRef } from 'react';
import { Box, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from 'next-i18next/pages';

/**
 * Stitch's minimal formatting toolbar (B, I, list, link) over a textarea. The text is stored as
 * Markdown: the buttons only insert their marks around the selection (homework, announcements).
 */
export function MarkdownField({
  value,
  onChange,
  label,
  placeholder,
  maxLength,
  minRows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name of the textarea */
  label: string;
  placeholder?: string;
  maxLength: number;
  minRows?: number;
}) {
  const { t } = useTranslation('teacher');
  const text = useRef<HTMLTextAreaElement>(null);

  /** Wrap the selection in the marks (or put them at the cursor with a placeholder) */
  const mark = (before: string, after = '', sample = '') => {
    const el = text.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const chosen = value.slice(s, e) || sample;
    onChange(value.slice(0, s) + before + chosen + after + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + chosen.length);
    });
  };

  const tools = [
    { key: 'bold', icon: FormatBoldIcon, before: '**', after: '**', sample: 'boldText' },
    { key: 'italic', icon: FormatItalicIcon, before: '_', after: '_', sample: 'italicText' },
    { key: 'list', icon: FormatListBulletedIcon, before: '\n- ', after: '', sample: 'listText' },
    { key: 'link', icon: LinkIcon, before: '[', after: '](https://)', sample: 'linkText' },
  ] as const;

  return (
    <Box>
      <Stack direction="row" sx={{ gap: 0.25, p: 0.5, border: 1, borderBottom: 0, borderColor: 'divider', borderRadius: '8px 8px 0 0', bgcolor: 'background.default' }}>
        {tools.map(({ key, icon: Icon, before, after, sample }, i) => (
          <Stack key={key} direction="row">
            {i === 2 && <Box sx={{ width: '1px', bgcolor: 'divider', mx: 0.5, my: 0.75 }} />}
            <Tooltip title={t(`course.homework.${key}`)}>
              <IconButton size="small" onClick={() => mark(before, after, t(`course.homework.${sample}`))} aria-label={t(`course.homework.${key}`)}>
                <Icon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
      </Stack>
      <TextField
        inputRef={text}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        multiline
        minRows={minRows}
        fullWidth
        size="small"
        placeholder={placeholder}
        slotProps={{ htmlInput: { maxLength, 'aria-label': label } }}
        sx={{ '& .MuiOutlinedInput-root': { borderTopLeftRadius: 0, borderTopRightRadius: 0 } }}
      />
    </Box>
  );
}
