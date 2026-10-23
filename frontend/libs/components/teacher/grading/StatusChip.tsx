import { Box, Stack } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from 'next-i18next/pages';
import { span, type RowView } from './model';

/** Stitch status colours: submitted sage, late ochre, not submitted red, returned / missing grey */
const TONE: Record<RowView['state'], { color: string; bg: string }> = {
  SUBMITTED: { color: '#174D3F', bg: '#BCEDDA' },
  GRADED: { color: '#174D3F', bg: '#BCEDDA' },
  LATE: { color: '#763300', bg: '#FFDBCA' },
  NOT_SUBMITTED: { color: '#93000A', bg: '#FFDAD6' },
  MISSING: { color: '#93000A', bg: '#FFDAD6' },
  RETURNED: { color: '#404945', bg: '#E4EAE5' },
};

/** "Submitted" · "Late +1h 12m" · "Not submitted" …, and "Changed after grading" under it */
export function StatusChip({ view, exam }: { view: RowView; exam?: boolean }) {
  const { t } = useTranslation('teacher');
  // An exam has no hand-ins: it is graded or not yet
  const state = exam ? (view.score !== null ? 'GRADED' : 'NOT_SUBMITTED') : view.state;
  const label =
    state === 'LATE' && view.lateBy
      ? t('grading.state.lateBy', { time: span(view.lateBy) })
      : exam
        ? t(`grading.state.exam${state === 'GRADED' ? 'Graded' : 'Waiting'}`)
        : t(`grading.state.${state}`);
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1, fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap', color: TONE[state].color, bgcolor: TONE[state].bg }}>
        {label}
      </Box>
      {view.changedAfterGrading && (
        <Box
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, px: 0.5, borderRadius: 0.5, fontSize: '0.625rem', fontWeight: 600, color: 'warning.dark', bgcolor: 'warning.light', border: 1, borderColor: 'warning.main', whiteSpace: 'nowrap' }}
        >
          <HistoryIcon sx={{ fontSize: 12 }} />
          {t('grading.changedAfter')}
        </Box>
      )}
    </Stack>
  );
}
