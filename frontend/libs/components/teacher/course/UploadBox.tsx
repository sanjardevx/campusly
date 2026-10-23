import { useRef, useState, type DragEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Box, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VideoFileOutlinedIcon from '@mui/icons-material/VideoFileOutlined';
import { useTranslation } from 'next-i18next/pages';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { UPLOAD_LIMITS, acceptFor, checkFile, kindOf, uploadCourseFile, type UploadPhase } from '@/libs/upload';
import { fileType, formatSize } from './model';

/** A file that is attached (uploaded and READY) */
export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

interface Pending {
  key: number;
  name: string;
  size: number;
  phase: UploadPhase;
  percent: number;
  error?: string;
}

type Kind = keyof typeof UPLOAD_LIMITS;

/**
 * Stitch drop zone ("Drop files here or browse") with the upload states DECISIONS §11 asks for:
 * preparing → uploading n % → checking → ready (or failed, with the reason). Several files at once
 * when `max` > 1; a single-file box replaces its file.
 */
export function UploadBox({
  courseId,
  kinds,
  max,
  files,
  onAdd,
  onRemove,
  onBusy,
}: {
  courseId: string;
  kinds: Kind[];
  max: number;
  files: AttachedFile[];
  onAdd: (file: AttachedFile) => void;
  onRemove: (id: string) => void;
  /** true while an upload runs (the drawer's Save waits for it) */
  onBusy?: (busy: boolean) => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const client = useApolloClient();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const counter = useRef(0);

  const busy = pending.some((p) => !p.error && p.phase !== 'READY');
  const room = max - files.length - pending.filter((p) => !p.error).length;

  const start = async (list: File[]) => {
    const take = max === 1 ? list.slice(0, 1) : list.slice(0, Math.max(0, room));
    onBusy?.(true);
    await Promise.all(
      take.map(async (file) => {
        const key = ++counter.current;
        const update = (patch: Partial<Pending>) => setPending((all) => all.map((p) => (p.key === key ? { ...p, ...patch } : p)));
        setPending((all) => [...all, { key, name: file.name, size: file.size, phase: 'PREPARING', percent: 0 }]);
        const problem = checkFile(file, kinds);
        if (problem) {
          update({ phase: 'FAILED', error: t(`course.upload.${problem}`, { size: formatSize(UPLOAD_LIMITS[kindOf(file) ?? kinds[0]].maxBytes) }) });
          return;
        }
        try {
          const id = await uploadCourseFile(client, courseId, file, (phase, percent) => update({ phase, percent: percent ?? 0 }));
          // A single-file box: the new file replaces the old one
          if (max === 1) files.forEach((f) => onRemove(f.id));
          onAdd({ id, name: file.name, size: file.size, mimeType: file.type });
          setPending((all) => all.filter((p) => p.key !== key));
        } catch (err) {
          const message = err instanceof Error && err.message.startsWith('S3') ? t('course.upload.s3') : errorText(errorCode(err));
          update({ phase: 'FAILED', error: message });
        }
      }),
    );
    onBusy?.(false);
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void start(Array.from(e.dataTransfer.files));
  };

  const video = kinds.includes('VIDEO');
  const limits = kinds.map((k) => `${UPLOAD_LIMITS[k].types.map((m) => fileType(m)).join(', ')} · ${formatSize(UPLOAD_LIMITS[k].maxBytes)}`).join(' / ');

  return (
    <Stack spacing={1}>
      {(room > 0 || max === 1) && (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          aria-disabled={busy && max === 1}
          sx={{
            border: '1px dashed',
            borderColor: over ? 'primary.main' : 'divider',
            bgcolor: over ? 'primary.light' : 'transparent',
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'background-color 150ms, border-color 150ms',
            '&:hover': { bgcolor: 'background.default' },
            '&:focus-visible': { outline: 2, outlineColor: 'secondary.main' },
          }}
        >
          {video ? <VideoFileOutlinedIcon sx={{ color: 'text.disabled' }} /> : <UploadFileOutlinedIcon sx={{ color: 'text.disabled' }} />}
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{max === 1 && files.length ? t('course.upload.replace') : t('course.upload.drop')}</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 0.25 }}>{limits}</Typography>
          <input
            ref={input}
            type="file"
            hidden
            multiple={max > 1}
            accept={acceptFor(...kinds)}
            onChange={(e) => {
              void start(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </Box>
      )}

      {files.map((f) => (
        <Stack key={f.id} direction="row" sx={{ alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          {kindOf({ type: f.mimeType } as File) === 'VIDEO' ? <VideoFileOutlinedIcon fontSize="small" color="primary" /> : <DescriptionOutlinedIcon fontSize="small" color="primary" />}
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, flex: 1, minWidth: 0 }} noWrap title={f.name}>
            {f.name} · {formatSize(f.size)}
          </Typography>
          <IconButton size="small" onClick={() => onRemove(f.id)} aria-label={t('course.upload.remove', { name: f.name })} sx={{ '&:hover': { color: 'error.main' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      {pending.map((p) => (
        <Box key={p.key} sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: p.error ? 'error.light' : 'divider' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            {p.error && <ErrorOutlineIcon fontSize="small" color="error" />}
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
              {p.name}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: p.error ? 'error.main' : 'text.secondary', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {p.error ? t('course.upload.failed') : t(`course.upload.phase.${p.phase}`, { percent: p.percent })}
            </Typography>
            {p.error && (
              <IconButton size="small" onClick={() => setPending((all) => all.filter((x) => x.key !== p.key))} aria-label={t('course.upload.dismiss')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
          {p.error ? (
            <Alert severity="error" variant="outlined" icon={false} sx={{ mt: 0.75, py: 0, border: 0, px: 0, fontSize: '0.75rem' }}>
              {p.error}
            </Alert>
          ) : (
            <LinearProgress
              variant={p.phase === 'UPLOADING' ? 'determinate' : 'indeterminate'}
              value={p.percent}
              sx={{ mt: 1, height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' } }}
            />
          )}
        </Box>
      ))}
    </Stack>
  );
}
