import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkIcon from '@mui/icons-material/Link';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useTranslation } from 'next-i18next/pages';
import { IMPORT_STUDENTS, PREVIEW_IMPORT } from '@/apollo/admin/mutation';
import { PrintableSlips, type Slip, SlipsTable } from '@/libs/components/admin/LoginSlips';
import { errorCode } from '@/libs/errors';
import { monoFontFamily } from '@/libs/fonts';
import type { ImportIssueCode, PreviewStudentImportMutation } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { formatPhone } from '@/libs/i18n/format';

type Preview = PreviewStudentImportMutation['previewStudentImport'];
type Row = Preview['rows'][number];

/** Same limits as the server (IMPORT_LIMIT): a too-big file is refused before it is sent */
const MAX_CHARS = 100_000;
const COLUMNS = ['first_name', 'last_name', 'class', 'admission_year', 'parent_name', 'parent_phone', 'parent_relation'];

/** Which cell turns red for which problem (Stitch marks the bad cell, e.g. class "9D") */
const CELL_OF: Record<ImportIssueCode, keyof Row> = {
  FIRST_NAME_LENGTH: 'firstName',
  LAST_NAME_LENGTH: 'lastName',
  CLASS_EMPTY: 'className',
  CLASS_NOT_FOUND: 'className',
  ADMISSION_YEAR_INVALID: 'admissionYear',
  PHONE_INVALID: 'parentPhone',
  PARENT_LOGIN_TAKEN: 'parentPhone',
  PARENT_NAME_INVALID: 'parentName',
  RELATION_UNKNOWN: 'parentName',
};

/** The template is made in the browser: no file on the server to keep in sync with the parser */
function downloadTemplate() {
  const csv = [
    COLUMNS.join(','),
    'Aziz,Karimov,9A,2026,Farrukh Karimov,+998 90 111 22 33,FATHER',
    'Madina,Karimova,9B,2026,Farrukh Karimov,+998 90 111 22 33,FATHER',
  ].join('\n');
  // BOM: Excel then opens the Uzbek / Russian names in UTF-8
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campusly-students-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** ✓ Upload file —— ② Check data —— ③ Import & login slips */
function Steps({ step }: { step: 0 | 1 | 2 }) {
  const { t } = useTranslation('admin');
  const labels = [t('import.stepUpload'), t('import.stepCheck'), t('import.stepImport')];
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {labels.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <Stack key={label} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {i > 0 && <Box sx={{ width: 64, height: 2, bgcolor: i <= step ? 'primary.main' : 'divider' }} />}
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.8125rem',
                fontWeight: 700,
                bgcolor: current ? 'primary.main' : done ? 'primary.light' : 'action.hover',
                color: current ? 'primary.contrastText' : done ? 'primary.main' : 'text.secondary',
              }}
            >
              {done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
            </Box>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: current ? 700 : 500, color: current ? 'primary.main' : 'text.primary' }}>
              {label}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

/**
 * Stitch "Import students": 1 upload → 2 check (preview, writes nothing) → 3 import (one transaction)
 * and the login slips. The file is read in the browser and sent as text (no multipart upload).
 */
export function ImportStudentsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const input = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [skip, setSkip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number; slips: Slip[] } | null>(null);

  const restart = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setError(null);
    setDone(null);
  };
  const close = () => {
    restart();
    onClose();
  };

  const check = async (picked: File) => {
    setError(null);
    const csv = await picked.text();
    if (csv.length > MAX_CHARS) return setError('IMPORT_FILE_TOO_BIG');
    setBusy(true);
    try {
      const { data } = await client.mutate({ mutation: PREVIEW_IMPORT, variables: { csv }, fetchPolicy: 'no-cache' });
      setFile({ name: picked.name, csv });
      setPreview(data!.previewStudentImport);
      setStep(1);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      // no-cache: hundreds of plain passwords must not stay in Apollo's cache
      const { data } = await client.mutate({
        mutation: IMPORT_STUDENTS,
        variables: { csv: file.csv, skipErrors: skip },
        fetchPolicy: 'no-cache',
      });
      const result = data!.importStudents;
      // Students, then the parents who got a NEW account (a linked parent keeps their password)
      const slips: Slip[] = [
        ...result.slips.map((s) => s.student),
        ...result.slips.flatMap((s) => (s.parent?.isNew ? [s.parent] : [])),
      ];
      setDone({ created: result.created, skipped: result.skipped, slips });
      setStep(2);
      await client.refetchQueries({ include: ['Users', 'UserCounts', 'Groups'] });
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const picked = e.dataTransfer.files[0];
    if (picked) void check(picked);
  };

  const importable = preview ? preview.summary.ready + preview.summary.linkParent : 0;
  const blocked = !!preview && preview.summary.errors > 0 && !skip;

  const cell = (row: Row, key: keyof Row, shown: ReactNode, mono = false) => {
    const issues = row.errors.filter((i) => CELL_OF[i.code] === key);
    // An invalid phone is not in parentPhone (only valid ones are): show what the file said
    const text = shown ?? issues[0]?.value ?? '';
    const content = (
      <Box
        component="span"
        sx={{
          ...(mono && { fontFamily: monoFontFamily, fontSize: '0.8125rem' }),
          ...(issues.length > 0 && {
            px: 0.75,
            py: 0.25,
            border: '1.5px solid',
            borderColor: 'error.main',
            borderRadius: 1,
            color: 'error.main',
            fontWeight: 600,
            display: 'inline-block',
            minWidth: 24,
            minHeight: 22,
          }),
        }}
      >
        {text}
      </Box>
    );
    return (
      <TableCell>
        {issues.length ? (
          <Tooltip title={issues.map((i) => t(`import.issue.${i.code}`, { value: i.value ?? '' })).join(' · ')}>
            {content}
          </Tooltip>
        ) : (
          content
        )}
      </TableCell>
    );
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="lg" fullWidth>
      <Box sx={{ px: 4, pt: 3.5, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h3" component="h2">
            {t('import.title')}
          </Typography>
          <IconButton onClick={close} disabled={busy} aria-label={t('import.close')}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Steps step={step} />
      </Box>

      <DialogContent sx={{ px: 4, py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText(error)}
          </Alert>
        )}

        {step === 0 && (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragging ? 'primary.main' : 'divider',
              bgcolor: dragging ? 'primary.light' : 'background.default',
              borderRadius: 3,
              py: 7,
              px: 3,
              textAlign: 'center',
              transition: 'background-color 150ms, border-color 150ms',
            }}
          >
            {busy ? (
              <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{t('import.reading')}</Typography>
              </Stack>
            ) : (
              <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                <UploadFileOutlinedIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                <Typography variant="h5">{t('import.drop')}</Typography>
                <Typography color="text.secondary">{t('import.or')}</Typography>
                <Button variant="contained" onClick={() => input.current?.click()}>
                  {t('import.choose')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                  {t('import.limits')}
                </Typography>
                <Link component="button" type="button" onClick={downloadTemplate} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <DownloadOutlinedIcon fontSize="small" />
                  {t('import.template')}
                </Link>
              </Stack>
            )}
          </Box>
        )}
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = ''; // the same file can be picked again after fixing it
            if (picked) void check(picked);
          }}
        />

        {step === 1 && preview && file && (
          <>
            {/* File card: name · rows · Replace file ... Download CSV template */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 3, px: 2.5, py: 2, mb: 2.5 }}
            >
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'grid', placeItems: 'center' }}>
                <DescriptionOutlinedIcon sx={{ color: 'primary.main' }} />
              </Box>
              <Typography sx={{ fontWeight: 700 }}>{file.name}</Typography>
              <Typography color="text.secondary">· {t('import.rows', { count: preview.rows.length })} ·</Typography>
              <Link component="button" type="button" onClick={() => input.current?.click()} sx={{ fontWeight: 600 }}>
                {t('import.replace')}
              </Link>
              <Box sx={{ flexGrow: 1 }} />
              <Link
                component="button"
                type="button"
                onClick={downloadTemplate}
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
              >
                <DownloadOutlinedIcon fontSize="small" />
                {t('import.template')}
              </Link>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
              <Chip
                icon={<CheckCircleOutlineIcon />}
                label={t('import.ready', { count: preview.summary.ready })}
                sx={{ color: 'success.main', bgcolor: 'success.light', '& .MuiChip-icon': { color: 'inherit' } }}
              />
              {preview.summary.linkParent > 0 && (
                <Chip
                  icon={<LinkIcon />}
                  label={t('import.link', { count: preview.summary.linkParent })}
                  sx={{ color: 'warning.dark', bgcolor: 'warning.light', '& .MuiChip-icon': { color: 'inherit' } }}
                />
              )}
              {preview.summary.errors > 0 && (
                <Chip
                  icon={<ErrorOutlineIcon />}
                  label={t('import.errorsChip', { count: preview.summary.errors })}
                  sx={{ color: 'error.main', bgcolor: 'error.light', '& .MuiChip-icon': { color: 'inherit' } }}
                />
              )}
            </Stack>

            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 3, maxHeight: 360 }}>
              <Table size="small" stickyHeader sx={{ '& td, & th': { py: 1.25, whiteSpace: 'nowrap' } }}>
                <TableHead>
                  <TableRow>
                    {(['row', 'firstName', 'lastName', 'class', 'year', 'parentName', 'parentPhone', 'idPreview'] as const).map((c) => (
                      <TableCell
                        key={c}
                        sx={{ bgcolor: 'background.default', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}
                      >
                        {t(`import.col.${c}`)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((r) => (
                    <TableRow key={r.line} sx={r.status === 'ERROR' ? { bgcolor: '#FFF8F6' } : undefined}>
                      <TableCell sx={{ color: 'text.secondary' }}>{r.line}</TableCell>
                      {cell(r, 'firstName', r.firstName)}
                      {cell(r, 'lastName', r.lastName)}
                      {cell(r, 'className', r.className)}
                      {cell(r, 'admissionYear', r.admissionYear)}
                      {cell(
                        r,
                        'parentName',
                        r.parentName && (
                          <>
                            {r.parentName}
                            {r.status === 'LINK_PARENT' && <LinkIcon sx={{ fontSize: 14, ml: 0.5, color: 'warning.main', verticalAlign: 'middle' }} />}
                          </>
                        ),
                      )}
                      {cell(r, 'parentPhone', r.parentPhone ? formatPhone(r.parentPhone) : null, true)}
                      <TableCell sx={{ fontFamily: monoFontFamily, fontSize: '0.8125rem', color: 'text.secondary' }}>
                        {r.loginIdPreview ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack sx={{ mt: 2.5 }}>
              <FormControlLabel
                control={<Checkbox checked disabled size="small" />}
                label={
                  <>
                    {t('import.optIds')}{' '}
                    <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                      {t('import.always')}
                    </Box>
                  </>
                }
              />
              <FormControlLabel
                control={<Checkbox checked disabled size="small" />}
                label={
                  <>
                    {t('import.optParents')}{' '}
                    <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                      {t('import.always')}
                    </Box>
                  </>
                }
              />
              <FormControlLabel
                control={<Checkbox checked={skip} size="small" onChange={(e) => setSkip(e.target.checked)} />}
                label={t('import.optSkip')}
              />
            </Stack>
          </>
        )}

        {step === 2 && done && (
          <Stack spacing={2}>
            <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
              <Typography sx={{ fontWeight: 700 }}>{t('import.doneTitle', { count: done.created })}</Typography>
              {t('import.doneBody', { skipped: done.skipped })}
            </Alert>
            <Alert severity="warning">{t('slips.warning')}</Alert>
            <Box sx={{ maxHeight: 320, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 3 }}>
              <SlipsTable slips={done.slips} />
            </Box>
            <PrintableSlips slips={done.slips} />
          </Stack>
        )}
      </DialogContent>

      {step > 0 && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ px: 4, py: 2.5, borderTop: 1, borderColor: 'divider', alignItems: 'center' }}
        >
          {step === 1 ? (
            <>
              <InfoOutlinedIcon sx={{ color: 'text.secondary' }} fontSize="small" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('import.footnote')}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 400 }}>
                  {t('import.previewNote')}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={restart} disabled={busy}>
                {t('import.back')}
              </Button>
              <Button
                variant="contained"
                size="large"
                endIcon={busy ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                disabled={busy || importable === 0 || blocked}
                onClick={() => void runImport()}
              >
                {busy ? t('import.importing') : t('import.import', { count: importable })}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" onClick={restart}>
                {t('import.another')}
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
                {t('import.print')}
              </Button>
              <Button variant="contained" onClick={close}>
                {t('import.close')}
              </Button>
            </>
          )}
        </Stack>
      )}
    </Dialog>
  );
}
