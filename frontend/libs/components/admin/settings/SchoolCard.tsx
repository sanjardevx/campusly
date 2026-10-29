import { useState } from 'react';
import { Autocomplete, Box, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { FormField } from '@/libs/components/auth/FormField';
import type { SchoolSettingsQuery } from '@/libs/gql/graphql';
import { LANGUAGES } from '@/libs/i18n';
import { SettingsCard } from './SettingsCard';
import { useSettingsSave } from './useSettingsSave';

type Settings = SchoolSettingsQuery['schoolSettings'];

// Every IANA zone the browser knows (Asia/Tashkent, Asia/Seoul …); the server checks it again
const ZONES: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [
  'Asia/Tashkent',
];

// The same checks as the server DTO
// Several numbers may be separated by commas (the site shows each one)
const PHONE = /^[+\d\s(),-]*$/;
const CHANNEL = /^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/;
/** Telegram bot usernames end with "bot" */
const BOT = /^https:\/\/t\.me\/[A-Za-z0-9_]{2,29}[Bb][Oo][Tt]$/;

/** School name, language, timezone; office contact; the Telegram channel and the password-reset bot */
export function SchoolCard({ settings }: { settings: Settings }) {
  const { t } = useTranslation('admin');
  const initial = {
    name: settings.schoolName,
    locale: settings.defaultLocale,
    zone: settings.timezone,
    phone: settings.contactPhone ?? '',
    hours: settings.officeHours ?? '',
    channel: settings.telegramUrl ?? '',
    bot: settings.telegramBotUrl ?? '',
  };
  const [form, setForm] = useState(initial);
  const { editing, busy, saved, error, save, onEdit, onCancel } = useSettingsSave(() => setForm(initial));
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  const phoneOk = PHONE.test(form.phone) && form.phone.length <= 60;
  const channelOk = form.channel === '' || CHANNEL.test(form.channel);
  const botOk = form.bot === '' || BOT.test(form.bot);
  const valid =
    form.name.trim().length >= 2 && form.name.trim().length <= 100 && ZONES.includes(form.zone) && phoneOk && channelOk && botOk;
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k]);

  const half = (node: React.ReactNode) => <Box sx={{ flex: 1 }}>{node}</Box>;

  return (
    <SettingsCard
      title={t('settings.school.title')}
      subtitle={t('settings.school.subtitle')}
      edit={{
        editing,
        onEdit,
        onCancel,
        dirty,
        valid,
        busy,
        saved,
        error,
        // "" is sent on purpose: an emptied field is cleared on the server (stored as null)
        onSave: () =>
          void save({
            schoolName: form.name.trim(),
            defaultLocale: form.locale,
            timezone: form.zone,
            contactPhone: form.phone.trim(),
            officeHours: form.hours.trim(),
            telegramUrl: form.channel.trim(),
            telegramBotUrl: form.bot.trim(),
          }),
      }}
    >
      <Stack spacing={2.5}>
        <FormField id="school-name" label={t('settings.school.name')} value={form.name} disabled={!editing} onChange={(e) => set({ name: e.target.value })} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {half(
            <FormField
              id="school-locale"
              select
              label={t('settings.school.locale')}
              value={form.locale}
              disabled={!editing}
              onChange={(e) => set({ locale: e.target.value })}
              helperText={t('settings.school.localeHint')}
            >
              {LANGUAGES.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {l.label}
                </MenuItem>
              ))}
            </FormField>,
          )}
          {half(
            <>
              <Box
                component="label"
                htmlFor="school-timezone"
                sx={{ display: 'block', mb: 0.75, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}
              >
                {t('settings.school.timezone')}
              </Box>
              <Autocomplete
                id="school-timezone"
                options={ZONES}
                value={form.zone}
                disabled={!editing}
                disableClearable
                onChange={(_, z) => set({ zone: z })}
                renderInput={(params) => <TextField {...params} helperText={t('settings.school.timezoneHint')} />}
              />
            </>,
          )}
        </Stack>

        <Divider />
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{t('settings.school.contactTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.school.contactHint')}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {half(
            <FormField
              id="school-phone"
              label={t('settings.school.phone')}
              placeholder={t('settings.school.phoneHint')}
              value={form.phone}
              disabled={!editing}
              onChange={(e) => set({ phone: e.target.value })}
              error={!phoneOk}
              helperText={!phoneOk ? t('settings.school.phoneBad') : undefined}
            />,
          )}
          {half(
            <FormField
              id="school-hours"
              label={t('settings.school.hours')}
              placeholder={t('settings.school.hoursHint')}
              value={form.hours}
              disabled={!editing}
              onChange={(e) => set({ hours: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />,
          )}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {half(
            <FormField
              id="school-bot"
              label={t('settings.school.bot')}
              placeholder={t('settings.school.botPlaceholder')}
              value={form.bot}
              disabled={!editing}
              onChange={(e) => set({ bot: e.target.value })}
              error={!botOk}
              helperText={botOk ? t('settings.school.botHint') : t('settings.school.botBad')}
            />,
          )}
          {half(
            <FormField
              id="school-telegram"
              label={t('settings.school.telegram')}
              placeholder={t('settings.school.telegramPlaceholder')}
              value={form.channel}
              disabled={!editing}
              onChange={(e) => set({ channel: e.target.value })}
              error={!channelOk}
              helperText={channelOk ? t('settings.school.telegramHint') : t('settings.school.telegramBad')}
            />,
          )}
        </Stack>
      </Stack>
    </SettingsCard>
  );
}
