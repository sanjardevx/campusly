import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Button, ButtonBase, CircularProgress, IconButton, InputAdornment, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { useTranslation } from 'next-i18next/pages';
import { ARCHIVE_SITE_MOCK_TEST, SAVE_SITE_MOCK_TEST } from '@/apollo/admin/mutation';
import { ADMIN_SITE_PEOPLE } from '@/apollo/admin/query';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { ConfirmDialog } from '@/libs/components/admin/ConfirmDialog';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { errorCode } from '@/libs/errors';
import type { AdminSiteMockTestsQuery, SiteMockExam } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { LangTabs, LocalizedField, type SiteLang, StatusPill, fromL, toL } from './shared';

export type AdminMockTest = AdminSiteMockTestsQuery['adminSiteMockTests'][number];

export const EXAMS: SiteMockExam[] = ['IELTS', 'TOPIK', 'SAT', 'OTHER'];
/** Stitch's exam badges: IELTS green, TOPIK amber, SAT and Other grey */
export const EXAM_TONE: Record<SiteMockExam, { bg: string; fg: string; border: string }> = {
  IELTS: { bg: '#E8EFEA', fg: '#1F4E43', border: '#C9DCD1' },
  TOPIK: { bg: '#FEF3E2', fg: '#9A4A00', border: '#F7D9A8' },
  SAT: { bg: '#EEF0F4', fg: '#3F4A5C', border: '#D6DBE4' },
  OTHER: { bg: '#F1F1EF', fg: '#57534E', border: '#E2E0DC' },
};
const DURATIONS = [120, 135, 150, 180, 240];

const label = { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 } as const;

/** 180 → "3 h", 135 → "2 h 15 m" */
export const durationText = (min: number) => [Math.floor(min / 60) ? `${Math.floor(min / 60)} h` : '', min % 60 ? `${min % 60} m` : ''].filter(Boolean).join(' ');
/** 120000 → "120,000 UZS" */
export const priceText = (price: number) => `${new Intl.NumberFormat('en-US').format(price)} UZS`;
/** "2026-11-07" → "Sat, Nov 7" in the admin's language */
export const examDay = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === 'uz' ? 'en' : locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export function ExamBadge({ exam }: { exam: SiteMockExam }) {
  const { t } = useTranslation('admin');
  const c = EXAM_TONE[exam];
  return (
    <Box component="span" sx={{ display: 'inline-block', minWidth: 52, textAlign: 'center', px: 1, py: 0.25, borderRadius: 1, border: 1, borderColor: c.border, bgcolor: c.bg, color: c.fg, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em' }}>
      {t(`site.mock.exam.${exam}`)}
    </Box>
  );
}

/** − n + for the taken seats (the list's "Seat registration" and the drawer) */
export function SeatStepper({ value, max, onChange, disabled, label: aria }: { value: number; max: number; onChange: (next: number) => void; disabled?: boolean; label: string }) {
  const { t } = useTranslation('admin');
  return (
    <Stack direction="row" role="group" aria-label={aria} sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <IconButton size="small" onClick={() => onChange(value - 1)} disabled={disabled || value <= 0} aria-label={t('site.mock.seatMinus')}>
        <RemoveRoundedIcon fontSize="small" />
      </IconButton>
      <Typography sx={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
        {value}
      </Typography>
      <IconButton size="small" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={t('site.mock.seatPlus')}>
        <AddRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

/** "18 left" (green) or "0 left" (red) */
export function SeatsLeftChip({ left }: { left: number }) {
  const { t } = useTranslation('admin');
  return (
    <Box component="span" sx={{ px: 1, py: 0.125, borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', bgcolor: left ? '#E8EFEA' : '#FDECEC', color: left ? '#1F4E43' : '#B42318' }}>
      {t('site.mock.left', { count: left })}
    </Box>
  );
}

/** The thin seats bar: green, red when full, grey for a past test */
export function SeatsBar({ taken, total, past }: { taken: number; total: number; past?: boolean }) {
  const full = taken >= total;
  return (
    <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${Math.min(100, (taken / Math.max(total, 1)) * 100)}%`, bgcolor: past ? '#A8A29E' : full ? '#D92D20' : 'primary.main', borderRadius: 2 }} />
    </Box>
  );
}

/**
 * Stitch "Campusly Admin — Website: Edit Mock Test Drawer": exam, title, what's included, date /
 * start / duration, location, price, total and taken seats (people register by phone), the contact
 * from "Our team" with the school phone or a different one, "Show on the website" and a preview of
 * the home page card. "Delete" archives (no hard deletes). `copyOf` opens a duplicate as a new test.
 */
export function MockTestDrawer({ test, copyOf, onClose, onSaved }: { test: AdminMockTest | null; copyOf?: AdminMockTest | null; onClose: () => void; onSaved: () => void }) {
  const { t, i18n } = useTranslation('admin');
  const errorText = useErrorText();
  const people = useQuery(ADMIN_SITE_PEOPLE).data?.adminSitePeople ?? [];
  const schoolPhone = useQuery(SCHOOL_SETTINGS).data?.schoolSettings.contactPhone ?? '';
  const from = test ?? copyOf ?? null;
  const [lang, setLang] = useState<SiteLang>('en');
  const [exam, setExam] = useState<SiteMockExam>(from?.exam ?? 'IELTS');
  const [title, setTitle] = useState(() => toL(from?.title));
  const [included, setIncluded] = useState(() => toL(from?.included));
  const [examDate, setExamDate] = useState(from?.examDate ?? '');
  const [startTime, setStartTime] = useState(from?.startTime ?? '09:00');
  const [durationMin, setDurationMin] = useState(from?.durationMin ?? 180);
  const [location, setLocation] = useState(() => toL(from?.location));
  const [price, setPrice] = useState(from ? String(from.price) : '');
  const [totalSeats, setTotalSeats] = useState(from ? String(from.totalSeats) : '30');
  const [takenSeats, setTakenSeats] = useState(test?.takenSeats ?? 0);
  const [contactPersonId, setContactPersonId] = useState(from?.contactPerson?.id ?? '');
  const [ownPhone, setOwnPhone] = useState(!!from?.contactPhone);
  const [contactPhone, setContactPhone] = useState(from?.contactPhone ?? '');
  const [showOnSite, setShowOnSite] = useState(from?.showOnSite ?? true);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [save, { loading }] = useMutation(SAVE_SITE_MOCK_TEST);
  const [archive, { loading: archiving }] = useMutation(ARCHIVE_SITE_MOCK_TEST);

  const total = Number(totalSeats) || 0;
  const left = Math.max(0, total - takenSeats);
  const valid = title.en.trim() && included.en.trim() && location.en.trim() && examDate && startTime && price !== '' && Number(price) >= 0 && total >= 1 && takenSeats <= total && (!ownPhone || contactPhone.trim());
  const contact = people.find((p) => p.id === contactPersonId);
  const phone = ownPhone ? contactPhone.trim() : schoolPhone;
  const durations = DURATIONS.includes(durationMin) ? DURATIONS : [...DURATIONS, durationMin].sort((a, b) => a - b);

  const submit = async () => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            id: test?.id,
            exam,
            title: fromL(title)!,
            included: fromL(included)!,
            examDate,
            startTime,
            durationMin,
            location: fromL(location)!,
            price: Number(price),
            totalSeats: total,
            takenSeats,
            contactPersonId: contactPersonId || null,
            contactPhone: ownPhone ? contactPhone.trim() : '',
            showOnSite,
          },
        },
      });
      onSaved();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const status = test?.isPast ? 'past' : left === 0 ? 'full' : 'upcoming';

  return (
    <>
      <SideDrawer
        open
        title={test ? t('site.mock.edit') : t('site.mock.new')}
        closeLabel={t('site.close')}
        onClose={onClose}
        footer={
          <>
            {test && (
              <Button color="error" startIcon={<Inventory2OutlinedIcon />} onClick={() => setConfirmArchive(true)}>
                {t('site.archive')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={onClose}>
              {t('site.cancel')}
            </Button>
            <Button variant="contained" disableElevation onClick={() => void submit()} disabled={!valid || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon />}>
              {test ? t('site.saveChanges') : t('site.create')}
            </Button>
          </>
        }
      >
        {test && (
          <Box sx={{ mt: -1, mb: 2 }}>
            <StatusPill tone={status === 'past' ? 'grey' : status === 'full' ? 'red' : 'green'}>{t(`site.mock.status.${status}`)}</StatusPill>
          </Box>
        )}
        <LangTabs
          lang={lang}
          onLang={setLang}
          fields={[title, included, location]}
          onTranslated={([a, b, c]) => {
            setTitle(a);
            setIncluded(b);
            setLocation(c);
          }}
        />

        <DrawerSection title={t('site.mock.basics')}>
          <Box>
            <Typography sx={label}>{t('site.mock.examLabel')}</Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {EXAMS.map((e) => (
                <ButtonBase key={e} onClick={() => setExam(e)} aria-pressed={exam === e} sx={{ px: 2, py: 0.75, borderRadius: 2, fontSize: '0.8125rem', fontWeight: 700, bgcolor: exam === e ? 'primary.main' : 'action.hover', color: exam === e ? '#fff' : 'text.secondary' }}>
                  {t(`site.mock.exam.${e}`)}
                </ButtonBase>
              ))}
            </Stack>
          </Box>
          <LocalizedField id="mock-title" label={t('site.mock.title')} value={title} onChange={setTitle} lang={lang} max={120} required />
          <LocalizedField id="mock-included" label={t('site.mock.included')} value={included} onChange={setIncluded} lang={lang} max={100} required />
        </DrawerSection>

        <DrawerSection title={t('site.mock.when')}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
            <TextField type="date" size="small" label={t('site.mock.date')} value={examDate} onChange={(e) => setExamDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="time" size="small" label={t('site.mock.start')} value={startTime} onChange={(e) => setStartTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size="small" label={t('site.mock.duration')} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {durations.map((d) => (
                <MenuItem key={d} value={d}>
                  {durationText(d)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <LocalizedField id="mock-location" label={t('site.mock.location')} value={location} onChange={setLocation} lang={lang} max={100} required />
          <TextField
            size="small"
            label={t('site.mock.price')}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 9))}
            slotProps={{ htmlInput: { inputMode: 'numeric' }, input: { endAdornment: <InputAdornment position="end">UZS</InputAdornment> } }}
          />
        </DrawerSection>

        <DrawerSection title={t('site.mock.seats')}>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Stack direction="row" sx={{ gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <TextField size="small" label={t('site.mock.totalSeats')} value={totalSeats} onChange={(e) => setTotalSeats(e.target.value.replace(/\D/g, '').slice(0, 4))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} sx={{ flex: 1, minWidth: 140, bgcolor: 'background.paper' }} />
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>{t('site.mock.taken')}</Typography>
                <SeatStepper value={takenSeats} max={total} onChange={setTakenSeats} label={t('site.mock.taken')} />
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('site.mock.byPhone')}
            </Typography>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.5, mb: 0.75, fontSize: '0.8125rem' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{t('site.mock.seatsLeft', { count: left })}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                {takenSeats}/{total} ({total ? Math.round((takenSeats / total) * 100) : 0}%)
              </Typography>
            </Stack>
            <SeatsBar taken={takenSeats} total={total} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('site.mock.fullHint')}
            </Typography>
          </Box>
        </DrawerSection>

        <DrawerSection title={t('site.mock.contact')}>
          <TextField select size="small" fullWidth label={t('site.mock.contactPerson')} value={contactPersonId} onChange={(e) => setContactPersonId(e.target.value)}>
            <MenuItem value="">{t('site.mock.noContact')}</MenuItem>
            {people.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName} — {p.role.en}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            fullWidth
            value={ownPhone ? contactPhone : schoolPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            disabled={!ownPhone}
            placeholder="+998 71 200 34 44"
            aria-label={t('site.mock.phone')}
            slotProps={{ htmlInput: { maxLength: 20 }, input: { startAdornment: <InputAdornment position="start"><CallOutlinedIcon fontSize="small" /></InputAdornment> } }}
          />
          <Button size="small" onClick={() => setOwnPhone(!ownPhone)} sx={{ alignSelf: 'flex-end', mt: -1 }}>
            {ownPhone ? t('site.mock.useSchoolPhone') : t('site.mock.useOtherPhone')}
          </Button>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('site.showOnSite')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('site.mock.showHint')}
              </Typography>
            </Box>
            <Switch checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} slotProps={{ input: { 'aria-label': t('site.showOnSite') } }} />
          </Stack>
        </DrawerSection>

        <DrawerSection title={t('site.preview')}>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {t('site.mock.previewHint')}
          </Typography>
          <Box sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E8E5DF', bgcolor: '#fff' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <SeatsLeftChip left={left} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{priceText(Number(price) || 0)}</Typography>
            </Stack>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title[lang] || title.en || t('site.mock.title')}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>{included[lang] || included.en}</Typography>
            <Stack sx={{ gap: 0.5, mt: 1.5, fontSize: '0.8125rem', color: 'text.secondary' }}>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
                {examDate ? `${examDay(examDate, i18n.language)} · ${startTime}` : '—'}
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
                {location[lang] || location.en || '—'}
              </Stack>
            </Stack>
            {(contact || phone) && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #F1EFEA' }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{t('site.mock.toJoin')}</Typography>
                {contact && (
                  <Typography sx={{ fontSize: '0.8125rem', mt: 0.5 }}>
                    {contact.firstName} {contact.lastName} · {contact.role[lang] || contact.role.en}
                  </Typography>
                )}
                {phone && (
                  <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', mt: 0.5, color: 'primary.main', fontWeight: 600, fontSize: '0.8125rem' }}>
                    <CallOutlinedIcon sx={{ fontSize: 16 }} />
                    {t('site.mock.call', { phone })}
                  </Stack>
                )}
              </Box>
            )}
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
        title={t('site.mock.archiveTitle')}
        body={t('site.mock.archiveBody')}
        confirmLabel={t('site.archive')}
        danger
        busy={archiving}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() =>
          void archive({ variables: { id: test!.id } }).then(() => {
            setConfirmArchive(false);
            onSaved();
          })
        }
      />
    </>
  );
}
