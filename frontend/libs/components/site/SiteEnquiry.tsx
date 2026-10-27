import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Button, CircularProgress, InputBase, MenuItem, Select, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SUBMIT_ENQUIRY } from '@/apollo/site/mutation';
import { errorCode } from '@/libs/errors';
import type { SiteLocale } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { Reveal } from './motion';
import { SITE, type SiteData, containerSx, eyebrowSx } from './tokens';

const INTERESTS = ['STANDARD', 'STEM', 'KOREAN', 'IELTS'] as const;
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1);

const labelSx = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: SITE.stone700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 } as const;
const fieldSx = {
  width: '100%',
  borderRadius: '12px',
  border: `1px solid ${SITE.stone200}`,
  bgcolor: 'rgba(250,250,249,0.5)',
  color: '#111827',
  fontSize: '0.875rem',
  px: 1.75,
  py: 1.25,
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  '&.Mui-focused': { borderColor: SITE.spruce, boxShadow: `0 0 0 1px ${SITE.spruce}` },
} as const;
const selectSx = {
  width: '100%',
  borderRadius: '12px',
  bgcolor: 'rgba(250,250,249,0.5)',
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: SITE.stone200 },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: SITE.spruce, borderWidth: 1 },
  '& .MuiSelect-select': { py: 1.25 },
} as const;

/**
 * Stitch Part C "Questions about admission or a program?": the office card on the left (phone,
 * hours), the form on the right (name, +998 phone, grade, program). The server checks the phone,
 * limits sends per IP and drops anything that fills the hidden "website" field (bots).
 */
export function SiteEnquiry({ contact }: { contact: SiteData['contact'] }) {
  const { t } = useTranslation('site');
  const errorText = useErrorText();
  const { locale = 'en' } = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', grade: '', interest: '', website: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submit, { loading }] = useMutation(SUBMIT_ENQUIRY);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await submit({
        variables: {
          input: {
            parentName: form.name.trim(),
            phone: form.phone,
            childGrade: form.grade ? Number(form.grade) : undefined,
            interest: form.interest || undefined,
            locale: locale as SiteLocale,
            website: form.website || undefined,
          },
        },
      });
      setSent(true);
      setForm({ name: '', phone: '', grade: '', interest: '', website: '' });
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const valid = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 9;

  return (
    <Box component="section" id="enquire" sx={{ ...containerSx, scrollMarginTop: 32 }}>
      <Reveal sx={{ bgcolor: '#fff', borderRadius: '16px', p: { xs: 3, lg: 5 }, border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow, mt: { xs: 6, md: 8 }, mb: { xs: 6, md: 8 }, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, gap: { xs: 4, lg: 6 } }}>
        <Stack sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={eyebrowSx}>{t('enquiry.eyebrow')}</Typography>
            <Typography component="h2" sx={{ fontSize: { xs: '1.5rem', lg: '1.875rem' }, fontWeight: 700, color: '#111827', mt: 1, mb: 1.5, lineHeight: 1.25 }}>
              {t('enquiry.title')}
            </Typography>
            <Typography sx={{ color: SITE.stone600, mb: 3, lineHeight: 1.625 }}>{t('enquiry.body')}</Typography>
          </Box>
          {(contact.phone || contact.officeHours) && (
            <Box sx={{ bgcolor: SITE.tint, borderRadius: '12px', p: 2.5, border: '1px solid rgba(31,78,67,0.15)' }}>
              {contact.phone && (
                <Stack component="a" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} direction="row" sx={{ alignItems: 'center', gap: 1, fontSize: '1.25rem', fontWeight: 700, color: SITE.spruce, textDecoration: 'none' }}>
                  <PhoneOutlinedIcon />
                  {contact.phone}
                </Stack>
              )}
              {contact.officeHours && (
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 1, fontSize: '0.875rem', color: SITE.stone700 }}>
                  <ScheduleOutlinedIcon sx={{ fontSize: 18, color: SITE.spruce }} />
                  {contact.officeHours}
                </Stack>
              )}
            </Box>
          )}
        </Stack>

        {sent ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2, py: 4 }} role="status">
            <CheckCircleRoundedIcon sx={{ fontSize: 48, color: SITE.spruce }} />
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', maxWidth: 420 }}>{t('enquiry.sent')}</Typography>
            <Button onClick={() => setSent(false)} sx={{ color: SITE.spruce, fontWeight: 600, textTransform: 'none' }}>
              {t('enquiry.sendAnother')}
            </Button>
          </Stack>
        ) : (
          <Stack component="form" onSubmit={send} noValidate sx={{ gap: 2 }}>
            <Box>
              <Box component="label" htmlFor="enquiry-name" sx={labelSx}>
                {t('enquiry.name')}
              </Box>
              <InputBase id="enquiry-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('enquiry.namePlaceholder')} autoComplete="name" inputProps={{ maxLength: 100 }} sx={fieldSx} />
            </Box>
            <Box>
              <Box component="label" htmlFor="enquiry-phone" sx={labelSx}>
                {t('enquiry.phone')}
              </Box>
              <InputBase
                id="enquiry-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('enquiry.phonePlaceholder')}
                autoComplete="tel-national"
                inputProps={{ maxLength: 20, inputMode: 'tel' }}
                startAdornment={<Box component="span" sx={{ color: SITE.stone500, fontWeight: 500, mr: 1.5 }}>+998</Box>}
                sx={fieldSx}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Box component="label" id="enquiry-grade-label" sx={labelSx}>
                  {t('enquiry.grade')}
                </Box>
                <Select labelId="enquiry-grade-label" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} displayEmpty size="small" sx={selectSx} renderValue={(v) => (v ? t('enquiry.gradeOption', { n: v }) : <Box component="span" sx={{ color: SITE.stone500 }}>{t('enquiry.gradePlaceholder')}</Box>)}>
                  {GRADES.map((g) => (
                    <MenuItem key={g} value={String(g)}>
                      {t('enquiry.gradeOption', { n: g })}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <Box>
                <Box component="label" id="enquiry-interest-label" sx={labelSx}>
                  {t('enquiry.interest')}
                </Box>
                <Select labelId="enquiry-interest-label" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} displayEmpty size="small" sx={selectSx} renderValue={(v) => t(`enquiry.interests.${v || 'STANDARD'}`)}>
                  {INTERESTS.map((k) => (
                    <MenuItem key={k} value={k}>
                      {t(`enquiry.interests.${k}`)}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>
            {/* Honeypot: off screen for people, bots fill it in */}
            <Box aria-hidden sx={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="enquiry-website">{t('enquiry.honeypot')}</label>
              <input id="enquiry-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <Box sx={{ pt: 1 }}>
              <Button
                type="submit"
                fullWidth
                disabled={!valid || loading}
                endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}
                sx={{ bgcolor: SITE.spruce, color: '#fff', py: 1.75, borderRadius: '12px', fontWeight: 600, fontSize: '1rem', textTransform: 'none', boxShadow: SITE.cardShadow, '&:hover': { bgcolor: SITE.spruceHover }, '&.Mui-disabled': { bgcolor: 'rgba(31,78,67,0.45)', color: '#fff' } }}
              >
                {t('enquiry.submit')}
              </Button>
              <Typography sx={{ fontSize: '0.75rem', color: SITE.stone500, textAlign: 'center', mt: 1.25 }}>{t('enquiry.note')}</Typography>
            </Box>
          </Stack>
        )}
      </Reveal>
    </Box>
  );
}
