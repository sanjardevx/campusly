import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { useTranslation } from 'next-i18next/pages';
import { TRANSLATE_SITE_TEXT } from '@/apollo/admin/mutation';
import { SITE_TRANSLATE_AVAILABLE } from '@/apollo/admin/query';
import { MarkdownField } from '@/libs/components/teacher/course/MarkdownField';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { checkFile, acceptFor, uploadSiteImage, type UploadPhase } from '@/libs/upload';

// ───────────────────────── four-language text ─────────────────────────

export const SITE_LANGS = ['en', 'uz', 'ru', 'ko'] as const;
export type SiteLang = (typeof SITE_LANGS)[number];
/** A text in the four site languages; '' = not written yet (the site shows English) */
export type L = Record<SiteLang, string>;

export const emptyL = (): L => ({ en: '', uz: '', ru: '', ko: '' });

/** From the API ({ en, uz?, ru?, ko? } or null) to the form */
export const toL = (value: { en: string; uz?: string | null; ru?: string | null; ko?: string | null } | null | undefined): L => ({
  en: value?.en ?? '',
  uz: value?.uz ?? '',
  ru: value?.ru ?? '',
  ko: value?.ko ?? '',
});

/** From the form to the API input; null for an optional text left empty */
export function fromL(value: L): { en: string; uz?: string; ru?: string; ko?: string } | null {
  if (!SITE_LANGS.some((l) => value[l].trim())) return null;
  return {
    en: value.en.trim(),
    ...(value.uz.trim() ? { uz: value.uz.trim() } : {}),
    ...(value.ru.trim() ? { ru: value.ru.trim() } : {}),
    ...(value.ko.trim() ? { ko: value.ko.trim() } : {}),
  };
}

/**
 * The drawer's language tabs (EN UZ RU KO) and "Translate from English". A dot marks a language
 * that is missing a translation of something written in English. Translating fills only the empty
 * translations, so nothing the admin wrote is replaced; they check it before saving.
 */
export function LangTabs({
  lang,
  onLang,
  fields,
  onTranslated,
}: {
  lang: SiteLang;
  onLang: (lang: SiteLang) => void;
  /** Every four-language text of the form */
  fields: L[];
  /** The same fields with the empty translations filled */
  onTranslated: (filled: L[]) => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const available = useQuery(SITE_TRANSLATE_AVAILABLE).data?.siteTranslateAvailable ?? false;
  const [translate, { loading }] = useMutation(TRANSLATE_SITE_TEXT);
  const [error, setError] = useState<string | null>(null);

  const missing = (l: SiteLang) => l !== 'en' && fields.some((f) => f.en.trim() && !f[l].trim());
  const run = async () => {
    setError(null);
    try {
      const { data } = await translate({ variables: { input: { texts: fields.map((f) => f.en) } } });
      const out = data!.translateSiteText;
      onTranslated(
        fields.map((f, i) => ({
          en: f.en,
          uz: f.uz.trim() || out[i].uz,
          ru: f.ru.trim() || out[i].ru,
          ko: f.ko.trim() || out[i].ko,
        })),
      );
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Stack direction="row" role="tablist" aria-label={t('site.lang.label')} sx={{ p: 0.5, borderRadius: 2, bgcolor: 'action.hover', gap: 0.5 }}>
          {SITE_LANGS.map((l) => (
            <ButtonBase
              key={l}
              role="tab"
              aria-selected={lang === l}
              onClick={() => onLang(l)}
              sx={{ position: 'relative', px: 1.5, py: 0.5, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', color: lang === l ? 'primary.main' : 'text.secondary', bgcolor: lang === l ? 'background.paper' : 'transparent', boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}
            >
              {l.toUpperCase()}
              {missing(l) && <Box component="span" aria-label={t('site.lang.missing')} sx={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />}
            </ButtonBase>
          ))}
        </Stack>
        <Tooltip title={available ? t('site.lang.translateHint') : t('site.lang.translateOff')}>
          <span>
            <Button size="small" onClick={() => void run()} disabled={!available || loading || !fields.some((f) => f.en.trim())} startIcon={loading ? <CircularProgress size={14} /> : <AutoAwesomeOutlinedIcon />}>
              {t('site.lang.translate')}
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        {lang === 'en' ? t('site.lang.enHint') : t('site.lang.otherHint', { lang: lang.toUpperCase() })}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

/**
 * One four-language text field showing the current tab's language, with "n / max". Other tabs
 * show the English text under the field, so the admin translates from it.
 */
export function LocalizedField({
  id,
  label,
  value,
  onChange,
  lang,
  max,
  required,
  rows,
  markdown,
  helper,
}: {
  id: string;
  label: string;
  value: L;
  onChange: (value: L) => void;
  lang: SiteLang;
  max: number;
  required?: boolean;
  rows?: number;
  markdown?: boolean;
  helper?: string;
}) {
  const text = value[lang];
  const set = (v: string) => onChange({ ...value, [lang]: v });
  const english = lang !== 'en' && value.en.trim() ? value.en : null;
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
        <Typography component="label" htmlFor={id} sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
          {label}
          {required && lang === 'en' && ' *'} · {lang.toUpperCase()}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: text.length > max ? 'error.main' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
          {text.length} / {max}
        </Typography>
      </Stack>
      {markdown ? (
        <MarkdownField value={text} onChange={set} label={label} maxLength={max} minRows={rows ?? 4} />
      ) : (
        <TextField id={id} value={text} onChange={(e) => set(e.target.value)} fullWidth size="small" multiline={!!rows} minRows={rows} slotProps={{ htmlInput: { maxLength: max } }} />
      )}
      {(english || helper) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, whiteSpace: 'pre-wrap' }}>
          {english ? `EN: ${english.length > 160 ? `${english.slice(0, 160)}…` : english}` : helper}
        </Typography>
      )}
    </Box>
  );
}

// ───────────────────────── image ─────────────────────────

export interface ImageValue {
  /** What the drawer shows: the current picture, or the new upload's local preview */
  previewUrl: string | null;
  /** A new upload (READY) to save */
  assetId?: string;
  /** "Remove" pressed: save with no picture */
  removed?: boolean;
}

/**
 * Picture of a CMS row: preview, Replace, Remove. A new file goes straight to S3 (createSiteUpload
 * → PUT → confirmUpload) and only its id is saved with the form.
 */
export function ImagePicker({
  value,
  onChange,
  hint,
  shape = 'wide',
  label,
}: {
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  hint: string;
  shape?: 'wide' | 'card' | 'round';
  label: string;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<{ phase: UploadPhase; percent?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const bad = checkFile(file, ['IMAGE']);
    if (bad) return setError(errorText(bad));
    try {
      const assetId = await uploadSiteImage(client, file, (p, percent) => setPhase({ phase: p, percent }));
      onChange({ previewUrl: URL.createObjectURL(file), assetId });
    } catch (err) {
      setError(errorText(err instanceof Error && err.message === 'FILE_TYPE' ? 'FILE_TYPE' : errorCode(err)));
    } finally {
      setPhase(null);
    }
  };

  const busy = !!phase;
  const box = shape === 'round' ? { width: 96, height: 96, borderRadius: '50%' } : { width: '100%', aspectRatio: shape === 'wide' ? '16 / 9' : '4 / 3', borderRadius: 2 };

  return (
    <Box>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>{label}</Typography>
      <Stack direction={shape === 'round' ? 'row' : 'column'} sx={{ gap: 1.5, alignItems: shape === 'round' ? 'center' : 'stretch' }}>
        <ButtonBase onClick={() => input.current?.click()} disabled={busy} aria-label={value.previewUrl ? t('site.image.replace') : t('site.image.upload')} sx={{ ...box, overflow: 'hidden', bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderStyle: value.previewUrl ? 'solid' : 'dashed', position: 'relative', flexShrink: 0 }}>
          {value.previewUrl ? (
            <Box component="img" src={value.previewUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Stack sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
              <PhotoCameraOutlinedIcon />
              {t('site.image.upload')}
            </Stack>
          )}
          {busy && (
            <Stack sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.75)', gap: 0.5, fontSize: '0.75rem' }}>
              <CircularProgress size={22} variant={phase?.phase === 'UPLOADING' ? 'determinate' : 'indeterminate'} value={phase?.percent ?? 0} />
              {t(`site.image.phase.${phase?.phase}`)}
            </Stack>
          )}
        </ButtonBase>
        <Stack direction={shape === 'round' ? 'column' : 'row'} sx={{ gap: 1, justifyContent: 'space-between', alignItems: shape === 'round' ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
          {value.previewUrl && (
            <Stack direction="row" sx={{ gap: 1 }}>
              <Button size="small" variant="outlined" color="inherit" startIcon={<SyncRoundedIcon />} onClick={() => input.current?.click()} disabled={busy}>
                {t('site.image.replace')}
              </Button>
              <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onChange({ previewUrl: null, removed: true })} disabled={busy}>
                {t('site.image.remove')}
              </Button>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Stack>
      </Stack>
      <input ref={input} type="file" hidden accept={acceptFor('IMAGE')} onChange={(e) => void pick(e.target.files?.[0] ?? undefined).then(() => (e.target.value = ''))} />
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

/** The save input's image fields from the picker */
export const imageInput = (value: ImageValue, keys: { asset: string; remove: string }) => ({
  ...(value.assetId ? { [keys.asset]: value.assetId } : {}),
  ...(value.removed && !value.assetId ? { [keys.remove]: true } : {}),
});

// ───────────────────────── status pill, switch, drag ─────────────────────────

const TONES = {
  green: { bg: '#E8EFEA', fg: '#1F4E43', dot: '#2E7D5B' },
  amber: { bg: '#FEF3E2', fg: '#9A4A00', dot: '#D97706' },
  grey: { bg: '#F1F1EF', fg: '#57534E', dot: '#A8A29E' },
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  const c = TONES[tone];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.25, borderRadius: 999, bgcolor: c.bg, color: c.fg, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.dot }} />
      {children}
    </Box>
  );
}

/** "On site" switch with its own saving state */
export function SiteSwitch({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: (next: boolean) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Switch
      checked={checked}
      disabled={busy}
      onChange={(e) => {
        setBusy(true);
        void onToggle(e.target.checked).finally(() => setBusy(false));
      }}
      slotProps={{ input: { 'aria-label': label } }}
    />
  );
}

/**
 * Drag to reorder a list (native drag and drop, like the course editor) — and the keyboard: the
 * handle moves its row with ↑ / ↓. `onMove` gets the new order of ids.
 */
export function useReorder(ids: string[], onMove: (next: string[]) => void) {
  const [dragging, setDragging] = useState<string | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    onMove(next);
  };
  return {
    dragging,
    rowProps: (id: string) => ({
      onDragOver: (e: DragEvent) => {
        if (dragging) e.preventDefault();
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (dragging) move(ids.indexOf(dragging), ids.indexOf(id));
        setDragging(null);
      },
    }),
    handle: (id: string, label: string) => (
      <Box
        component="span"
        role="button"
        tabIndex={0}
        draggable
        aria-label={label}
        onDragStart={(e: DragEvent) => {
          e.dataTransfer.effectAllowed = 'move';
          setDragging(id);
        }}
        onDragEnd={() => setDragging(null)}
        onKeyDown={(e: KeyboardEvent) => {
          const i = ids.indexOf(id);
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            move(i, i - 1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            move(i, i + 1);
          }
        }}
        sx={{ display: 'inline-flex', cursor: 'grab', color: 'text.disabled', borderRadius: 1, '&:hover, &:focus-visible': { color: 'text.secondary' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}
      >
        <DragIndicatorRoundedIcon fontSize="small" />
      </Box>
    ),
  };
}

/** "Oct 12 by Dilnoza R." */
export function editedLine(date: string, by: string | null | undefined, locale: string) {
  const day = new Intl.DateTimeFormat(locale === 'uz' ? 'en' : locale, { month: 'short', day: 'numeric' }).format(new Date(date));
  return by ? `${day} · ${by}` : day;
}
