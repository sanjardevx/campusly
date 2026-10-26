import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Button, ButtonBase, Card, Collapse, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'next-i18next/pages';
import { SET_ENQUIRY_STATUS } from '@/apollo/admin/mutation';
import { ADMIN_ENQUIRIES } from '@/apollo/admin/query';
import { PageHeader } from '@/libs/components/admin/PageHeader';
import { StatusPill } from '@/libs/components/admin/site/shared';
import { layoutFor } from '@/libs/components/layout';
import { downloadCsv } from '@/libs/csv';
import type { EnquiryStatus } from '@/libs/gql/graphql';
import { formatDateTime, formatLastSeen, formatPhone } from '@/libs/i18n/format';
import { withTranslations } from '@/libs/i18n/server';
import type { NextPageWithLayout } from '@/libs/types/page';

export const getStaticProps = withTranslations(['admin']);

const STATUSES: EnquiryStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED'];
const TONE = { NEW: 'amber', IN_PROGRESS: 'green', RESOLVED: 'grey' } as const;
const LANGUAGE: Record<string, string> = { en: 'English', uz: 'O‘zbekcha', ru: 'Русский', ko: '한국어' };
const GRID = 'minmax(0, 1.4fr) minmax(0, 1fr) 140px 130px 40px';

/**
 * Stitch "Campusly Admin — Enquiries": Support / Admissions, status chips, search, rows that open
 * to the details and the status buttons, Export CSV. Admissions are the public site's form; the
 * Support tab (help requests from the portal) waits for its feature, so it shows "coming soon".
 */
const EnquiriesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('admin');
  const { locale = 'en' } = useRouter();
  const [area, setArea] = useState<'SUPPORT' | 'ADMISSIONS'>('ADMISSIONS');
  const [status, setStatus] = useState<EnquiryStatus | 'ALL'>('NEW');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { data, refetch } = useQuery(ADMIN_ENQUIRIES, {
    variables: { input: { status: status === 'ALL' ? undefined : status, search: search.trim() || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const [setEnquiryStatus] = useMutation(SET_ENQUIRY_STATUS);

  const list = data?.adminEnquiries;
  const items = list?.items ?? [];
  const total = list ? list.new + list.inProgress + list.resolved : 0;
  const count = (s: EnquiryStatus | 'ALL') => (!list ? 0 : s === 'ALL' ? total : s === 'NEW' ? list.new : s === 'IN_PROGRESS' ? list.inProgress : list.resolved);

  const exportCsv = () =>
    downloadCsv(
      `enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
      [t('site.enquiries.csv.date'), t('site.enquiries.csv.name'), t('site.enquiries.csv.phone'), t('site.enquiries.csv.grade'), t('site.enquiries.csv.program'), t('site.enquiries.csv.language'), t('site.enquiries.csv.status')],
      items.map((e) => [formatDateTime(e.createdAt, locale), e.parentName, formatPhone(e.phone), e.childGrade ?? '', e.interest ? t(`site.enquiries.interest.${e.interest}`) : '', LANGUAGE[e.locale] ?? e.locale, t(`site.enquiries.status.${e.status}`)]),
    );

  return (
    <>
      <PageHeader
        title={t('site.enquiries.pageTitle')}
        subtitle={t('site.enquiries.pageSubtitle')}
        actions={
          <Button variant="outlined" color="inherit" startIcon={<DownloadRoundedIcon />} onClick={exportCsv} disabled={area !== 'ADMISSIONS' || items.length === 0}>
            {t('site.enquiries.export')}
          </Button>
        }
      />

      <Stack direction="row" sx={{ gap: 0.5, p: 0.5, borderRadius: 2, bgcolor: 'action.hover', mb: 2, alignSelf: 'flex-start', width: 'fit-content' }} role="tablist">
        {(['SUPPORT', 'ADMISSIONS'] as const).map((k) => (
          <ButtonBase key={k} role="tab" aria-selected={area === k} onClick={() => setArea(k)} sx={{ px: 2, py: 0.75, borderRadius: 1.5, gap: 1, fontSize: '0.875rem', fontWeight: 600, color: area === k ? 'text.primary' : 'text.secondary', bgcolor: area === k ? 'background.paper' : 'transparent', boxShadow: area === k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
            {t(`site.enquiries.area.${k}`)}
            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {k === 'SUPPORT' ? 0 : list?.new ?? 0}
            </Box>
          </ButtonBase>
        ))}
      </Stack>

      {area === 'SUPPORT' ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 600 }}>{t('site.enquiries.supportSoon')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('site.enquiries.supportSoonHint')}
          </Typography>
        </Card>
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {([...STATUSES, 'ALL'] as const).map((s) => (
                <ButtonBase key={s} onClick={() => setStatus(s)} aria-pressed={status === s} sx={{ px: 1.5, py: 0.5, borderRadius: 999, border: 1, gap: 0.75, fontSize: '0.8125rem', fontWeight: 600, borderColor: status === s ? 'primary.main' : 'divider', bgcolor: status === s ? 'primary.main' : 'transparent', color: status === s ? '#fff' : 'text.secondary' }}>
                  {s === 'ALL' ? t('site.enquiries.all') : t(`site.enquiries.status.${s}`)}
                  <Box component="span" sx={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>
                    {count(s)}
                  </Box>
                </ButtonBase>
              ))}
            </Stack>
            <TextField size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('site.enquiries.search')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', md: 260 } }} />
          </Stack>

          <Card>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              <span>{t('site.enquiries.col.parent')}</span>
              <span>{t('site.enquiries.col.program')}</span>
              <span>{t('site.enquiries.col.received')}</span>
              <span>{t('site.enquiries.col.status')}</span>
              <span />
            </Box>
            {items.length === 0 && <Typography sx={{ p: 3, color: 'text.secondary' }}>{t('site.enquiries.empty')}</Typography>}
            {items.map((e) => {
              const expanded = open === e.id;
              return (
                <Box key={e.id} sx={{ borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) auto 40px', md: GRID }, gap: 2, px: 2.5, py: 1.5, alignItems: 'center' }}>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {e.parentName}
                      </Typography>
                      <Box sx={{ flexShrink: 0, px: 1, py: 0.125, borderRadius: 1, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }}>{t('site.enquiries.parent')}</Box>
                    </Stack>
                    <Typography noWrap sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.875rem' }}>
                      {e.interest ? t(`site.enquiries.interest.${e.interest}`) : '—'}
                    </Typography>
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.8125rem', color: 'text.secondary' }}>{formatLastSeen(e.createdAt, locale, t)}</Typography>
                    <Box>
                      <StatusPill tone={TONE[e.status]}>{t(`site.enquiries.status.${e.status}`)}</StatusPill>
                    </Box>
                    <IconButton size="small" onClick={() => setOpen(expanded ? null : e.id)} aria-expanded={expanded} aria-label={expanded ? t('site.collapse') : t('site.expand')}>
                      {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expanded} unmountOnExit>
                    <Box sx={{ mx: 2.5, mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                        <Detail label={t('site.enquiries.phone')} value={formatPhone(e.phone)} />
                        <Detail label={t('site.enquiries.grade')} value={e.childGrade ? t('site.enquiries.gradeN', { n: e.childGrade }) : '—'} />
                        <Detail label={t('site.enquiries.program')} value={e.interest ? t(`site.enquiries.interest.${e.interest}`) : '—'} />
                        <Detail label={t('site.enquiries.language')} value={LANGUAGE[e.locale] ?? e.locale} />
                        <Detail label={t('site.enquiries.sentFrom')} value={[t('site.enquiries.website'), e.userAgent].filter(Boolean).join(' · ')} />
                        <Detail label={t('site.enquiries.received')} value={formatDateTime(e.createdAt, locale)} />
                        {e.handledBy && <Detail label={t('site.enquiries.handledBy')} value={`${e.handledBy}${e.handledAt ? ` · ${formatDateTime(e.handledAt, locale)}` : ''}`} />}
                      </Box>
                      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mt: 2 }}>
                        <ToggleButtonGroup exclusive size="small" value={e.status} onChange={(_, s: EnquiryStatus | null) => s && void setEnquiryStatus({ variables: { id: e.id, status: s } }).then(() => refetch())} aria-label={t('site.enquiries.col.status')}>
                          {STATUSES.map((s) => (
                            <ToggleButton key={s} value={s} sx={{ px: 1.5, textTransform: 'none' }}>
                              {t(`site.enquiries.status.${s}`)}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                        <Button size="small" variant="contained" disableElevation startIcon={<CallOutlinedIcon />} href={`tel:${e.phone}`}>
                          {t('site.enquiries.call')}
                        </Button>
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Card>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.5, color: 'text.secondary' }}>
            <Typography variant="caption">{t('site.enquiries.showing', { shown: items.length, total })}</Typography>
          </Stack>
        </>
      )}
    </>
  );
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Typography sx={{ fontSize: '0.875rem' }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {label}:{' '}
      </Box>
      {value}
    </Typography>
  );
}

EnquiriesPage.getLayout = layoutFor('ADMIN');
export default EnquiriesPage;
