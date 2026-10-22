import { useState } from 'react';
import { Box, Chip, InputAdornment, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { FormField } from '@/libs/components/auth/FormField';
import type { SchoolSettingsQuery } from '@/libs/gql/graphql';
import { monoFontFamily } from '@/libs/fonts';
import { SettingsCard } from './SettingsCard';
import { useSettingsSave } from './useSettingsSave';

type Settings = SchoolSettingsQuery['schoolSettings'];

const SCALE = [
  { mark: 2, color: '#E7D6D3' },
  { mark: 3, color: '#F3E3C6' },
  { mark: 4, color: '#D6E6DA' },
  { mark: 5, color: '#B9D6C3' },
];

/** Mark thresholds (5 / 4 / 3) with a live 0–100 % scale, and the default category weights */
export function GradingCard({ settings }: { settings: Settings }) {
  const { t } = useTranslation('admin');
  const savedMarks = { m5: settings.mark5MinPercent, m4: settings.mark4MinPercent, m3: settings.mark3MinPercent };
  const savedWeights = { hw: settings.defaultHomeworkWeight, quiz: settings.defaultQuizWeight, exam: settings.defaultExamWeight };
  const [marks, setMarks] = useState(savedMarks);
  const [weights, setWeights] = useState(savedWeights);
  const { editing, busy, saved, error, save, onEdit, onCancel } = useSettingsSave(() => {
    setMarks(savedMarks);
    setWeights(savedWeights);
  });

  // The same rules as the server, so the admin sees the problem before saving
  const inRange = (n: number, min: number) => Number.isInteger(n) && n >= min && n <= 100;
  const marksOk = inRange(marks.m5, 1) && inRange(marks.m4, 1) && inRange(marks.m3, 1) && marks.m5 > marks.m4 && marks.m4 > marks.m3;
  const total = weights.hw + weights.quiz + weights.exam;
  const weightsOk = total === 100 && [weights.hw, weights.quiz, weights.exam].every((w) => inRange(w, 0));
  const dirty =
    marks.m5 !== settings.mark5MinPercent ||
    marks.m4 !== settings.mark4MinPercent ||
    marks.m3 !== settings.mark3MinPercent ||
    weights.hw !== settings.defaultHomeworkWeight ||
    weights.quiz !== settings.defaultQuizWeight ||
    weights.exam !== settings.defaultExamWeight;

  const num = (v: string) => (v === '' ? NaN : Number(v));
  const percent = (id: string, label: string, value: number, onChange: (n: number) => void, error = false) => (
    <FormField
      id={id}
      type="number"
      label={label}
      value={Number.isNaN(value) ? '' : value}
      disabled={!editing}
      error={error}
      onChange={(e) => onChange(num(e.target.value))}
      slotProps={{
        input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
        htmlInput: { min: 0, max: 100, style: { fontFamily: monoFontFamily } },
      }}
    />
  );

  // Scale segments: 0 → m3 is "2", m3 → m4 "3", m4 → m5 "4", m5 → 100 "5"
  const edges = marksOk ? [0, marks.m3, marks.m4, marks.m5, 100] : null;

  return (
    <SettingsCard
      title={t('settings.grading.title')}
      subtitle={t('settings.grading.subtitle')}
      edit={{
        editing,
        onEdit,
        onCancel,
        dirty,
        valid: marksOk && weightsOk,
        busy,
        saved,
        error,
        onSave: () =>
          void save({
            mark5MinPercent: marks.m5,
            mark4MinPercent: marks.m4,
            mark3MinPercent: marks.m3,
            defaultHomeworkWeight: weights.hw,
            defaultQuizWeight: weights.quiz,
            defaultExamWeight: weights.exam,
          }),
      }}
    >
      <Typography sx={{ fontWeight: 600, mb: 1.5 }}>{t('settings.grading.marks')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {percent('mark5', t('settings.grading.mark', { n: 5 }), marks.m5, (n) => setMarks({ ...marks, m5: n }), !marksOk)}
        {percent('mark4', t('settings.grading.mark', { n: 4 }), marks.m4, (n) => setMarks({ ...marks, m4: n }), !marksOk)}
        {percent('mark3', t('settings.grading.mark', { n: 3 }), marks.m3, (n) => setMarks({ ...marks, m3: n }), !marksOk)}
      </Stack>
      {edges ? (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', height: 28, borderRadius: 1.5, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            {SCALE.map((s, i) => (
              <Box
                key={s.mark}
                sx={{
                  width: `${edges[i + 1] - edges[i]}%`,
                  bgcolor: s.color,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  borderLeft: i ? '1px solid rgba(255,255,255,0.8)' : 0,
                }}
              >
                {edges[i + 1] - edges[i] >= 4 ? s.mark : ''}
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontWeight: 400, fontFamily: monoFontFamily }}>
            5 ≥ {marks.m5}% · 4 ≥ {marks.m4}% · 3 ≥ {marks.m3}% · {t('settings.grading.below', { n: marks.m3 })}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
          {t('settings.grading.orderBad')}
        </Typography>
      )}

      <Typography sx={{ fontWeight: 600, mt: 3.5, mb: 1.5 }}>{t('settings.grading.weights')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' } }}>
        {percent('w-hw', t('classes.category.Homework'), weights.hw, (n) => setWeights({ ...weights, hw: n }), !weightsOk)}
        {percent('w-quiz', t('classes.category.Quizzes'), weights.quiz, (n) => setWeights({ ...weights, quiz: n }), !weightsOk)}
        {percent('w-exam', t('classes.category.Exams'), weights.exam, (n) => setWeights({ ...weights, exam: n }), !weightsOk)}
        <Chip
          label={weightsOk ? t('settings.grading.total', { n: total || 0 }) : t('settings.grading.totalBad', { n: Number.isNaN(total) ? '—' : total })}
          sx={{
            flexShrink: 0,
            mb: { sm: 0.75 },
            color: weightsOk ? 'success.main' : 'error.main',
            bgcolor: weightsOk ? 'success.light' : 'error.light',
          }}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 400 }}>
        {t('settings.grading.weightsHint')}
      </Typography>
    </SettingsCard>
  );
}
