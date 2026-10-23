import { Box, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useTranslation } from 'next-i18next/pages';
import { fadeUp } from '@/libs/components/dashboard/motion';
import { ListCard, Pill } from './parts';

/** Stitch "Unanswered questions": Q&A is a later phase (DECISIONS §14), the card says so */
export function QuestionsSoon({ index }: { index: number }) {
  const { t } = useTranslation('teacher');
  return (
    <ListCard title={t('dashboard.questions.title')} action={<Pill tone="neutral">{t('dashboard.questions.soon')}</Pill>} sx={fadeUp(index)}>
      <Box sx={{ px: 2.5, py: 3, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: 'primary.light', color: 'primary.main' }}>
          <ForumOutlinedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.questions.body')}
        </Typography>
      </Box>
    </ListCard>
  );
}
