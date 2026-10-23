import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Box, Button, Card, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'next-i18next/pages';
import { Pill } from '@/libs/components/teacher/dashboard/parts';
import { formatDate } from '@/libs/i18n/format';
import { visibility, type Assignment, type Week } from './model';

/** Stitch "Assignments" tab: every assignment of the course in one list, oldest deadline first */
export function AssignmentsTab({
  courseId,
  assignments,
  weeks,
  editMode,
  onNew,
}: {
  courseId: string;
  assignments: Assignment[];
  weeks: Week[];
  editMode: boolean;
  onNew: () => void;
}) {
  const { t } = useTranslation('teacher');
  const { locale } = useRouter();
  const weekName = new Map(weeks.map((w) => [w.id, w.title.split(':')[0]]));

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px' }}>
      {editMode && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={onNew}>
            {t('course.add.homework')}
          </Button>
        </Box>
      )}
      {assignments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
          {t('course.assignments.empty')}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('course.assignments.title')}</TableCell>
                <TableCell>{t('course.assignments.week')}</TableCell>
                <TableCell>{t('course.assignments.due')}</TableCell>
                <TableCell align="right">{t('course.assignments.points')}</TableCell>
                <TableCell>{t('course.assignments.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((a) => {
                const state = visibility(a.publishedAt);
                return (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Link component={NextLink} href={`/teacher/courses/${courseId}/assignments/${a.id}`} underline="hover" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {a.title}
                      </Link>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t(`course.item.type.${a.type}`)}</Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{(a.moduleId && weekName.get(a.moduleId)) ?? '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {a.dueAt ? `${formatDate(a.dueAt, locale)}, ${new Date(a.dueAt).toTimeString().slice(0, 5)}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {a.maxScore}
                    </TableCell>
                    <TableCell>
                      <Pill tone={a.gradesPublishedAt ? 'success' : state === 'PUBLISHED' ? 'success' : 'neutral'} square>
                        {a.gradesPublishedAt ? t('course.assignments.gradesPublished') : t(`course.status.${state}`)}
                      </Pill>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}
