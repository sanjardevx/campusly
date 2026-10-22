import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { monoFontFamily } from '@/libs/fonts';
import type { Role } from '@/libs/gql/graphql';
import { formatDate } from '@/libs/i18n/format';

export interface Slip {
  userId: string;
  loginId: string;
  fullName: string;
  role: Role;
  tempPassword?: string | null;
}

const mono = { fontFamily: monoFontFamily, fontWeight: 600, letterSpacing: '0.04em' };

export function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation('admin');
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title={copied ? t('slips.copied') : t('slips.copy')}>
      <IconButton
        size="small"
        aria-label={t('slips.copy')}
        onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
      >
        {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

/** Name · login ID · temporary password, with copy buttons (dialog, import result) */
export function SlipsTable({ slips }: { slips: Slip[] }) {
  const { t } = useTranslation('admin');
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{t('slips.name')}</TableCell>
          <TableCell>{t('slips.loginId')}</TableCell>
          <TableCell>{t('slips.password')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {slips.map((s) => (
          <TableRow key={s.userId}>
            <TableCell sx={{ fontWeight: 600 }}>{s.fullName}</TableCell>
            <TableCell>
              <Box component="span" sx={mono}>
                {s.loginId}
              </Box>
              <CopyButton text={s.loginId} />
            </TableCell>
            <TableCell>
              <Box component="span" sx={mono}>
                {s.tempPassword ?? '—'}
              </Box>
              {s.tempPassword && <CopyButton text={s.tempPassword} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The paper version: one card per person, cut along the dashed lines and handed out.
 * Rendered into <body> next to the app, so the print CSS (globals.css) can hide everything else.
 */
export function PrintableSlips({ slips }: { slips: Slip[] }) {
  const { t } = useTranslation(['admin', 'common']);
  const { locale } = useRouter();
  const school = useQuery(SCHOOL_SETTINGS).data?.schoolSettings.schoolName;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const today = formatDate(new Date(), locale);

  return createPortal(
    // Hidden on screen, the only thing printed: see .print-slips in globals.css
    <Box className="print-slips" sx={{ color: '#242A27' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm' }}>
        {slips.map((s) => (
          <Box
            key={s.userId}
            sx={{ border: '1px dashed #9AA19C', borderRadius: '3mm', p: '5mm', breakInside: 'avoid' }}
          >
            <Typography sx={{ fontSize: '9pt', color: '#5C625E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('slips.heading')}
              {school ? ` · ${school}` : ''}
            </Typography>
            <Typography sx={{ fontSize: '14pt', fontWeight: 700, mt: '2mm' }}>{s.fullName}</Typography>
            <Typography sx={{ fontSize: '9pt', color: '#5C625E', mb: '3mm' }}>{t(`common:roles.${s.role}`)}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '4mm', rowGap: '1.5mm', fontSize: '10pt' }}>
              <span>{t('slips.loginId')}</span>
              <Box component="span" sx={mono}>
                {s.loginId}
              </Box>
              <span>{t('slips.password')}</span>
              <Box component="span" sx={mono}>
                {s.tempPassword ?? '—'}
              </Box>
              <span>{t('slips.signInAt')}</span>
              <span>{`${origin}${s.role === 'TEACHER' || s.role === 'ADMIN' ? '/login/teacher' : '/login'}`}</span>
            </Box>
            <Typography sx={{ fontSize: '8.5pt', color: '#5C625E', mt: '3mm' }}>{t('slips.rule')}</Typography>
            <Typography sx={{ fontSize: '8pt', color: '#9AA19C', mt: '1mm' }}>{t('slips.issued', { date: today })}</Typography>
          </Box>
        ))}
      </Box>
    </Box>,
    document.body,
  );
}

/**
 * New passwords after "Reset password", "Print login slips", Add student or CSV import.
 * They exist only in this component's props: closing the dialog forgets them.
 */
export function SlipsDialog({
  slips,
  autoPrint,
  onClose,
}: {
  slips: Slip[] | null;
  /** "Print login slips": open the browser's print window right away */
  autoPrint?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const open = !!slips?.length;

  useEffect(() => {
    if (!open || !autoPrint) return;
    // After the slips are in the DOM
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [open, autoPrint]);

  if (!slips) return null;
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('slips.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('slips.warning')}
          </Alert>
          <SlipsTable slips={slips} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
            {t('slips.print')}
          </Button>
          <Button variant="contained" onClick={onClose}>
            {t('slips.close')}
          </Button>
        </DialogActions>
      </Dialog>
      {open && <PrintableSlips slips={slips} />}
    </>
  );
}
