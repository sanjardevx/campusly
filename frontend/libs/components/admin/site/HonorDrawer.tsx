import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Autocomplete, Avatar, Box, Button, ButtonBase, CircularProgress, Stack, Switch, TextField, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_HONOR_STUDENT, SAVE_SITE_HONOR_STUDENT } from '@/apollo/admin/mutation';
import { USERS } from '@/apollo/admin/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { errorCode } from '@/libs/errors';
import type { AdminSiteHonorStudentsQuery, SiteHonorResult } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { ImagePicker, type ImageValue, LangTabs, LocalizedField, type SiteLang, emptyL, fromL, imageInput, toL } from './shared';

export type AdminHonor = AdminSiteHonorStudentsQuery['adminSiteHonorStudents'][number];

/** Gold, silver, bronze: the place chip, the list's result pill and the site card */
export const MEDAL: Record<number, { key: string; dot: string; bg: string; fg: string }> = {
  1: { key: 'gold', dot: '#D4A017', bg: '#FDF6E3', fg: '#8A6100' },
  2: { key: 'silver', dot: '#9AA3AE', bg: '#F1F3F5', fg: '#4B5563' },
  3: { key: 'bronze', dot: '#C2703D', bg: '#FBEEE6', fg: '#8A4A1F' },
};

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  loginId: string;
  className: string | null;
}

const label = { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 } as const;
const initials = (s: { firstName: string; lastName: string }) => `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
/** "Madina Aliyeva" → "Madina A." (what the public site shows) */
export const siteName = (s: { firstName: string; lastName: string }) => [s.firstName, s.lastName ? `${s.lastName[0]}.` : ''].filter(Boolean).join(' ');

/**
 * Stitch "Campusly Admin — Website: Add Honor Student Drawer": pick a student (name and class come
 * from the profile), the result (medal and place, or an exam score), subject or sport, competition,
 * place and month, a 3:4 photo, "Show on website" and a preview of the site card. Campusly adds
 * "Parents agreed": a child goes on the public site only with it, and only as "Madina A."
 */
export function HonorDrawer({ honor, onClose, onSaved }: { honor: AdminHonor | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const [lang, setLang] = useState<SiteLang>('en');
  const [student, setStudent] = useState<StudentOption | null>(honor ? { ...honor.student, className: honor.className } : null);
  const [query, setQuery] = useState('');
  const [resultType, setResultType] = useState<SiteHonorResult>(honor?.resultType ?? 'MEDAL');
  const [place, setPlace] = useState(honor?.place ?? 1);
  const [score, setScore] = useState(honor?.score ?? '');
  const [subject, setSubject] = useState(() => toL(honor?.subject));
  const [competition, setCompetition] = useState(() => toL(honor?.competition));
  const [location, setLocation] = useState(() => (honor?.location ? toL(honor.location) : emptyL()));
  // A month picker ("Jul 2026"): saved as the first day of the month
  const [month, setMonth] = useState(honor?.achievedOn.slice(0, 7) ?? '');
  const [photo, setPhoto] = useState<ImageValue>({ previewUrl: honor?.photoUrl ?? null });
  const [parentConsent, setParentConsent] = useState(honor?.parentConsent ?? false);
  const [showOnSite, setShowOnSite] = useState(honor?.showOnSite ?? false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [save, { loading }] = useMutation(SAVE_SITE_HONOR_STUDENT);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_HONOR_STUDENT);
  const { data: found, loading: searching } = useQuery(USERS, {
    skip: query.trim().length < 2,
    variables: { input: { page: 1, limit: 8, sort: 'lastName', direction: 'ASC', search: { role: 'STUDENT', status: 'ACTIVE', text: query.trim() } } },
  });
  const options: StudentOption[] = (found?.users.list ?? []).map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, loginId: u.loginId, className: u.className ?? null }));

  const medal = resultType === 'MEDAL';
  const valid = !!student && subject.en.trim() && competition.en.trim() && month && (medal || score.trim());
  const submit = async () => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            id: honor?.id,
            studentId: student!.id,
            resultType,
            place: medal ? place : null,
            score: medal ? null : score.trim(),
            subject: fromL(subject)!,
            competition: fromL(competition)!,
            location: fromL(location),
            achievedOn: `${month}-01`,
            parentConsent,
            showOnSite: parentConsent && showOnSite,
            ...imageInput(photo, { asset: 'photoAssetId', remove: 'removePhoto' }),
          },
        },
      });
      onSaved();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const resultLine = medal ? t('site.honor.placeLine', { place: t(`site.honor.place${place}`), competition: competition[lang] || competition.en }) : competition[lang] || competition.en;

  return (
    <>
      <SideDrawer
        open
        title={honor ? t('site.honor.edit') : t('site.honor.add')}
        subtitle={t('site.honor.drawerSubtitle')}
        closeLabel={t('site.close')}
        onClose={onClose}
        footer={
          <>
            {honor && (
              <Button color="error" startIcon={<Inventory2OutlinedIcon />} onClick={() => setConfirmArchive(true)}>
                {t('site.archive')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={onClose}>
              {t('site.cancel')}
            </Button>
            <Button variant="contained" disableElevation onClick={() => void submit()} disabled={!valid || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon />}>
              {t('site.save')}
            </Button>
          </>
        }
      >
        <DrawerSection title={t('site.honor.student')}>
          <Autocomplete
            value={student}
            onChange={(_, v) => setStudent(v)}
            inputValue={query}
            onInputChange={(_, v, reason) => reason !== 'reset' && setQuery(v)}
            options={student && !options.some((o) => o.id === student.id) ? [student, ...options] : options}
            filterOptions={(x) => x}
            loading={searching}
            getOptionLabel={(o) => `${o.firstName} ${o.lastName}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={query.trim().length < 2 ? t('site.honor.typeToSearch') : t('site.honor.noStudents')}
            renderOption={(props, o) => {
              const { key, ...rest } = props as typeof props & { key: string };
              return (
                <Box component="li" key={key} {...rest} sx={{ gap: 1.25 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.6875rem', bgcolor: 'rgba(31,78,67,0.12)', color: 'primary.main' }}>{initials(o)}</Avatar>
                  <span>
                    {o.firstName} {o.lastName}
                  </span>
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                    {[o.className, o.loginId].filter(Boolean).join(' · ')}
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => <TextField {...params} size="small" placeholder={t('site.honor.searchStudent')} />}
          />
          {student && (
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: 'rgba(31,78,67,0.12)', color: 'primary.main' }}>{initials(student)}</Avatar>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {student.firstName} {student.lastName}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{[student.className, student.loginId].filter(Boolean).join(' · ')}</Typography>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {t('site.honor.fromProfile')}
          </Typography>
        </DrawerSection>

        <LangTabs
          lang={lang}
          onLang={setLang}
          fields={[subject, competition, location]}
          onTranslated={([a, b, c]) => {
            setSubject(a);
            setCompetition(b);
            setLocation(c);
          }}
        />

        <DrawerSection title={t('site.honor.result')}>
          <Stack direction="row" sx={{ p: 0.5, borderRadius: 2, bgcolor: 'action.hover', gap: 0.5 }} role="radiogroup" aria-label={t('site.honor.resultType')}>
            {(['MEDAL', 'EXAM_SCORE'] as const).map((r) => (
              <ButtonBase key={r} role="radio" aria-checked={resultType === r} onClick={() => setResultType(r)} sx={{ flex: 1, py: 1, gap: 0.75, borderRadius: 1.5, fontSize: '0.8125rem', fontWeight: 600, bgcolor: resultType === r ? 'primary.main' : 'transparent', color: resultType === r ? '#fff' : 'text.secondary' }}>
                {r === 'MEDAL' ? <MilitaryTechRoundedIcon sx={{ fontSize: 18 }} /> : <SchoolOutlinedIcon sx={{ fontSize: 18 }} />}
                {t(`site.honor.type.${r}`)}
              </ButtonBase>
            ))}
          </Stack>
          {medal ? (
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.75 }}>{t('site.honor.place')}</Typography>
              <Stack direction="row" sx={{ gap: 1 }} role="radiogroup" aria-label={t('site.honor.place')}>
                {[1, 2, 3].map((p) => (
                  <ButtonBase key={p} role="radio" aria-checked={place === p} onClick={() => setPlace(p)} sx={{ flex: 1, py: 1, gap: 0.75, borderRadius: 2, border: 1.5, fontSize: '0.8125rem', fontWeight: 600, borderColor: place === p ? 'primary.main' : 'divider', bgcolor: place === p ? 'rgba(31,78,67,0.06)' : 'transparent', color: place === p ? 'primary.main' : 'text.secondary' }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MEDAL[p].dot }} />
                    {t(`site.honor.placeChip${p}`)}
                  </ButtonBase>
                ))}
              </Stack>
            </Box>
          ) : (
            <TextField size="small" label={t('site.honor.score')} value={score} onChange={(e) => setScore(e.target.value)} placeholder="IELTS 8.0" helperText={t('site.honor.scoreHint')} slotProps={{ htmlInput: { maxLength: 30 } }} />
          )}
          <LocalizedField id="honor-subject" label={t('site.honor.subject')} value={subject} onChange={setSubject} lang={lang} max={60} required />
          <LocalizedField id="honor-competition" label={t('site.honor.competition')} value={competition} onChange={setCompetition} lang={lang} max={120} required />
          <Box>
            <Typography sx={label}>{t('site.honor.placeDate')}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 1.5, alignItems: 'start' }}>
              <LocalizedField id="honor-location" label={t('site.honor.location')} value={location} onChange={setLocation} lang={lang} max={60} />
              <TextField type="month" size="small" label={t('site.honor.month')} value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 3.25 }} />
            </Box>
          </Box>
        </DrawerSection>

        <DrawerSection title={t('site.honor.photo')}>
          <Box sx={{ maxWidth: 220 }}>
            <ImagePicker label="" value={photo} onChange={setPhoto} shape="portrait" hint={t('site.honor.photoHint')} />
          </Box>
        </DrawerSection>

        <DrawerSection title={t('site.honor.visibility')}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('site.honor.consent')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('site.honor.consentHint')}
              </Typography>
            </Box>
            <Switch
              checked={parentConsent}
              onChange={(e) => {
                setParentConsent(e.target.checked);
                if (!e.target.checked) setShowOnSite(false);
              }}
              slotProps={{ input: { 'aria-label': t('site.honor.consent') } }}
            />
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: parentConsent ? 'text.primary' : 'text.disabled' }}>{t('site.showOnSite')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {parentConsent ? t('site.honor.showHint') : t('site.honor.needsConsent')}
              </Typography>
            </Box>
            <Switch checked={parentConsent && showOnSite} disabled={!parentConsent} onChange={(e) => setShowOnSite(e.target.checked)} slotProps={{ input: { 'aria-label': t('site.showOnSite') } }} />
          </Stack>
        </DrawerSection>

        <DrawerSection title={t('site.preview')}>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {t('site.honor.previewHint')}
          </Typography>
          <Box sx={{ width: 220, borderRadius: '12px', overflow: 'hidden', border: '1px solid #E8E5DF', bgcolor: '#fff' }}>
            <Box sx={{ position: 'relative', aspectRatio: '3 / 4', bgcolor: 'action.hover' }}>
              {photo.previewUrl && <Box component="img" src={photo.previewUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              <Box sx={{ position: 'absolute', top: 8, left: 8, px: 1, py: 0.25, borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700, bgcolor: medal ? MEDAL[place].bg : '#E8EFEA', color: medal ? MEDAL[place].fg : '#1F4E43' }}>{medal ? t(`site.honor.medal.${MEDAL[place].key}`) : score || 'IELTS 8.0'}</Box>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>{student ? siteName(student) : t('site.honor.student')}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{[student?.className, subject[lang] || subject.en].filter(Boolean).join(' · ')}</Typography>
              <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>{resultLine}</Typography>
            </Box>
          </Box>
        </DrawerSection>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </SideDrawer>
      <ConfirmDialog
        open={confirmArchive}
        title={t('site.honor.archiveTitle')}
        body={t('site.honor.archiveBody')}
        confirmLabel={t('site.archive')}
        danger
        busy={archiving}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() =>
          void archive({ variables: { id: honor!.id } }).then(() => {
            setConfirmArchive(false);
            onSaved();
          })
        }
      />
    </>
  );
}
