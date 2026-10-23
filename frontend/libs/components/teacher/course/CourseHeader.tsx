import NextLink from 'next/link';
import { Box, Button, Card, Stack, Tab, Tabs, Typography } from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'next-i18next/pages';
import type { CourseData } from './model';

export type CourseTab = 'lessons' | 'assignments';

/**
 * Stitch course header: identity, "28 students · Quarter 1 · Week 6", the edit-mode switch,
 * Student Preview and the tabs (Grades opens the gradebook).
 */
export function CourseHeader({
  course,
  period,
  week,
  assignmentCount,
  tab,
  editMode,
  preview,
  onTab,
  onEditMode,
  onPreview,
}: {
  course: CourseData;
  period: string | null;
  week: number | null;
  assignmentCount: number;
  tab: CourseTab;
  editMode: boolean;
  preview: boolean;
  onTab: (tab: CourseTab) => void;
  onEditMode: (on: boolean) => void;
  onPreview: (on: boolean) => void;
}) {
  const { t } = useTranslation('teacher');
  const canEdit = course.status !== 'ARCHIVED';

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', p: 2.5, pb: 0 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 2, pb: 2, borderBottom: 1, borderColor: 'divider', alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" sx={{ gap: 1.75, alignItems: 'center', minWidth: 0 }}>
          {/* The subject's first letters, like Stitch's "fx" tile */}
          <Box
            aria-hidden
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.light',
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '1.125rem',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
            }}
          >
            {course.subjectName.slice(0, 2).toLowerCase()}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                {course.title}
              </Typography>
              {course.status !== 'ACTIVE' && (
                <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', border: 1, borderColor: 'divider', borderRadius: 1, px: 1 }}>
                  {t(`dashboard.courses.status.${course.status}`)}
                </Typography>
              )}
            </Stack>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
              {[t('dashboard.students', { count: course.studentCount }), period, week != null && t('dashboard.courses.week', { week })].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" sx={{ gap: 1.25, flexShrink: 0, flexWrap: 'wrap' }}>
          {canEdit && !preview && (
            <Button
              variant={editMode ? 'contained' : 'outlined'}
              color={editMode ? 'primary' : 'inherit'}
              disableElevation
              onClick={() => onEditMode(!editMode)}
              aria-pressed={editMode}
              startIcon={
                editMode ? (
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#4ADE80',
                      '@media (prefers-reduced-motion: no-preference)': { animation: 'pulse 1.6s ease-in-out infinite' },
                      '@keyframes pulse': { '50%': { opacity: 0.35 } },
                    }}
                  />
                ) : undefined
              }
              endIcon={editMode ? <ToggleOnIcon /> : <ToggleOffOutlinedIcon />}
              sx={editMode ? undefined : { borderColor: 'divider' }}
            >
              {editMode ? t('course.editOn') : t('course.editOff')}
            </Button>
          )}
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => onPreview(!preview)}
            aria-pressed={preview}
            startIcon={<VisibilityOutlinedIcon sx={{ color: 'text.secondary' }} />}
            sx={{ borderColor: 'divider', bgcolor: preview ? 'primary.light' : undefined }}
          >
            {preview ? t('course.previewExit') : t('course.preview')}
          </Button>
        </Stack>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_e, value: CourseTab | 'grades') => value !== 'grades' && onTab(value)}
        sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' } }}
      >
        <Tab value="lessons" iconPosition="start" icon={<AutoStoriesOutlinedIcon fontSize="small" />} label={t('course.tabs.lessons')} />
        <Tab
          value="assignments"
          iconPosition="start"
          icon={<AssignmentOutlinedIcon fontSize="small" />}
          label={
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              {t('course.tabs.assignments')}
              <Box component="span" sx={{ fontSize: '0.6875rem', bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 999, px: 0.75, fontVariantNumeric: 'tabular-nums' }}>
                {assignmentCount}
              </Box>
            </Stack>
          }
        />
        {/* The gradebook is its own page (day 11, step 4) */}
        <Tab
          value="grades"
          iconPosition="start"
          icon={<GradeOutlinedIcon fontSize="small" />}
          label={t('course.tabs.grades')}
          component={NextLink}
          href={`/teacher/gradebook?course=${course.id}`}
        />
      </Tabs>
    </Card>
  );
}
