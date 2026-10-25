import { useQuery } from '@apollo/client/react';
import { Chip, ListSubheader, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { AUDIT_LOGS } from '@/apollo/admin/query';
import { ActivityTable, LIMITS } from '@/libs/components/admin/activity/ActivityTable';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { layoutFor } from '@/libs/components/layout';
import { useCrumb } from '@/libs/hooks/useCrumb';
import { useQueryParams } from '@/libs/hooks/useQueryParams';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

/** Every audited action (backend AuditAction), grouped by what it changes */
const ACTION_GROUPS: Record<string, string[]> = {
  people: [
    'user.create',
    'user.update',
    'user.resetPassword',
    'user.block',
    'user.unblock',
    'users.import',
    'parent.link',
    'parent.unlink',
    'student.moveClass',
  ],
  school: [
    'settings.update',
    'academicYear.create',
    'academicYear.update',
    'period.create',
    'period.update',
    'subject.create',
    'subject.update',
    'group.create',
    'group.update',
    'schoolEvent.create',
    'schoolEvent.update',
    'schoolEvent.archive',
  ],
  courses: [
    'course.create',
    'course.update',
    'course.setTeachers',
    'course.setStudents',
    'course.gradeCategories',
    'announcement.archive',
  ],
  grades: [
    'submission.grade',
    'submission.return',
    'assignment.zeroMissing',
    'assignment.publishGrades',
    'periodGrades.publish',
    'periodGrade.override',
  ],
  records: ['records.export'],
};
const ACTIONS = Object.values(ACTION_GROUPS).flat();
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Activity log (read only): who changed what and when, from the AuditLog rows every admin and
 * grading action already writes. The URL keeps the filters (?action=user.block&actor=…).
 */
const ActivityPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const [params, setParams] = useQueryParams();
  useCrumb(t('activity.title'));

  // The URL is typed by hand: anything unknown is ignored instead of reaching the API
  const action = ACTIONS.includes(params.action ?? '') ? params.action : undefined;
  const actorId = UUID.test(params.actor ?? '') ? params.actor : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = LIMITS.includes(Number(params.limit)) ? Number(params.limit) : 25;

  const { data, previousData, loading } = useQuery(AUDIT_LOGS, {
    fetchPolicy: 'cache-and-network',
    variables: { input: { page, limit, action, actorId } },
  });
  const logs = (data ?? previousData)?.auditLogs;

  return (
    <>
      <PageHeader title={t('activity.title')} subtitle={t('activity.subtitle')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
        <TextField
          select
          size="small"
          label={t('activity.filters.action')}
          value={action ?? ''}
          onChange={(e) => setParams({ action: e.target.value || undefined })}
          // Show "All actions" when nothing is chosen, not an empty box
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">{t('activity.filters.allActions')}</MenuItem>
          {Object.entries(ACTION_GROUPS).flatMap(([group, actions]) => [
            <ListSubheader key={group}>{t(`activity.groups.${group}`)}</ListSubheader>,
            ...actions.map((a) => (
              <MenuItem key={a} value={a}>
                {t(`activity.actions.${a}`)}
              </MenuItem>
            )),
          ])}
        </TextField>
        {actorId && (
          <Chip
            label={t('activity.filters.onlyActor', { name: params.actorName || '…' })}
            onDelete={() => setParams({ actor: undefined, actorName: undefined })}
          />
        )}
      </Stack>
      <ActivityTable
        rows={logs?.list ?? []}
        total={logs?.metaCounter.total ?? 0}
        page={page}
        limit={limit}
        loading={loading}
        filtered={!!action || !!actorId}
        onPage={(p) => setParams({ page: String(p) })}
        onLimit={(l) => setParams({ limit: String(l) })}
        onActor={(a) => setParams({ actor: a.id, actorName: `${a.firstName} ${a.lastName}` })}
      />
    </>
  );
};

ActivityPage.getLayout = layoutFor('ADMIN');
export default ActivityPage;
