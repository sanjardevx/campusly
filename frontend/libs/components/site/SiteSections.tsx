import { useState } from 'react';
import Image from 'next/image';
import { Box, ButtonBase, Collapse, Link, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined';
import SubwayOutlinedIcon from '@mui/icons-material/SubwayOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { useTranslation } from 'next-i18next/pages';
import { useReducedMotion } from '@/libs/components/dashboard/motion';
import { SITE, type SiteData, containerSx, eyebrowSx, scrollToId, sectionTitleSx } from './tokens';

/** A lighter green than the brand spruce for the icon tiles and the photo panel (the developer's reference) */
const iconTile = (size: number, radius: string) => ({
  width: size,
  height: size,
  borderRadius: radius,
  bgcolor: SITE.spruce,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

function CenteredHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <Box sx={{ textAlign: 'center', maxWidth: 576, mx: 'auto', mb: { xs: 5, md: 7 } }}>
      {eyebrow && <Typography sx={{ ...eyebrowSx, mb: 0.5 }}>{eyebrow}</Typography>}
      <Typography component="h2" sx={{ ...sectionTitleSx, fontSize: { xs: '1.875rem', lg: '2.25rem' } }}>
        {title}
      </Typography>
      {subtitle && <Typography sx={{ color: SITE.stone600, fontSize: '1.125rem', mt: 1.5 }}>{subtitle}</Typography>}
    </Box>
  );
}

// ───────────────────────── Why choose (Part A) ─────────────────────────

/** Stitch Part A "Why choose Campusly School?": four soft panels, 2 × 2 (one column on phones) */
export function SiteWhy() {
  const { t } = useTranslation('site');
  const panels: { key: string; icon: SvgIconComponent; list?: boolean }[] = [
    { key: 'tech', icon: DevicesOutlinedIcon, list: true },
    { key: 'tracks', icon: SchoolOutlinedIcon },
    { key: 'languages', icon: TranslateOutlinedIcon },
    { key: 'mentors', icon: GroupsOutlinedIcon },
  ];
  return (
    <Box component="section" sx={{ ...containerSx, py: { xs: 8, md: 10 } }}>
      <CenteredHeader title={t('why.title')} subtitle={t('why.subtitle')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {panels.map(({ key, icon: Icon, list }) => (
          <Box key={key} sx={{ bgcolor: SITE.soft, borderRadius: '10px', p: 4 }}>
            <Box sx={{ ...iconTile(56, '12px'), mb: 3, boxShadow: SITE.cardShadow }}>
              <Icon />
            </Box>
            <Typography component="h3" sx={{ fontSize: '1.25rem', fontWeight: 700, color: SITE.heading, mb: list ? 2 : 1.5 }}>
              {t(`why.${key}.title`)}
            </Typography>
            {list ? (
              <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1.5 }}>
                {[1, 2, 3].map((n) => (
                  <Stack component="li" key={n} direction="row" sx={{ gap: 1.5, alignItems: 'flex-start' }}>
                    <CheckRoundedIcon sx={{ color: SITE.spruce, fontSize: 20, mt: '2px', flexShrink: 0 }} />
                    <Typography sx={{ color: '#404040', fontSize: '1rem' }}>{t(`why.tech.item${n}`)}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ color: SITE.neutral600, fontSize: '1rem', lineHeight: 1.625 }}>{t(`why.${key}.body`)}</Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ───────────────────────── Facilities (day 20) ─────────────────────────

/** A lighter green than the brand spruce for the facility tiles and the photo panel (the developer's reference) */
const FRESH = { from: '#4FA383', to: '#2F7A63' } as const;

const FEATURES_LEFT: { key: string; icon: SvgIconComponent }[] = [
  { key: 'tech', icon: ExtensionOutlinedIcon },
  { key: 'sports', icon: SportsSoccerOutlinedIcon },
  { key: 'reading', icon: MenuBookOutlinedIcon },
  { key: 'clubs', icon: TerminalOutlinedIcon },
  { key: 'safe', icon: VerifiedUserOutlinedIcon },
];
const FEATURES_RIGHT: { key: string; icon: SvgIconComponent }[] = [
  { key: 'parking', icon: DirectionsCarOutlinedIcon },
  { key: 'meals', icon: RestaurantOutlinedIcon },
  { key: 'medical', icon: MedicalServicesOutlinedIcon },
  { key: 'metro', icon: SubwayOutlinedIcon },
  { key: 'campus', icon: AccountBalanceOutlinedIcon },
];

/** Soft "play" triangles on the photo panel, like the reference's pattern */
const TRIANGLES = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><path d="M0 0L60 60L0 120Z" fill="#fff" fill-opacity="0.09"/><path d="M60 0L120 60L60 120Z" fill="#fff" fill-opacity="0.05"/></svg>',
)}")`;

/**
 * "Campusly School facilities" (the developer's reference: Jahon School's "imkoniyatlari"): five
 * cards, a green panel with a student whose head rises above it, five cards. The photo is a
 * Stitch-made lookalike of the reference pose (no other school's logo), its background cut out
 * with macOS Vision, so the panel's pattern shows around the student.
 * Phones show the photo first, then one column of cards.
 */
export function SiteFeatures() {
  const { t } = useTranslation('site');
  const card = ({ key, icon: Icon }: { key: string; icon: SvgIconComponent }) => (
    <Stack key={key} direction="row" sx={{ alignItems: 'center', gap: 2.5, p: { xs: 2, md: 2.5 }, borderRadius: '20px', bgcolor: '#F6F7F6', border: '1px solid #EEF0EE', minHeight: { md: 104 } }}>
      <Box sx={{ ...iconTile(56, '16px'), background: `linear-gradient(145deg, ${FRESH.from}, ${FRESH.to})`, boxShadow: '0 8px 16px -8px rgba(47,122,99,0.55), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
        <Icon />
      </Box>
      <Typography sx={{ fontSize: { xs: '1rem', md: '1.0625rem' }, fontWeight: 500, color: SITE.heading, lineHeight: 1.45 }}>{t(`features.${key}`)}</Typography>
    </Stack>
  );
  return (
    <Box component="section" id="facilities" aria-labelledby="facilities-title" sx={{ ...containerSx, py: { xs: 8, md: 10 } }}>
      <Box sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: { xs: 9, md: 8 } }}>
        <Typography component="h2" id="facilities-title" sx={{ ...sectionTitleSx, fontWeight: 800, fontSize: { xs: '1.875rem', md: '2.75rem' }, color: SITE.ink }}>
          {t('features.title')}
        </Typography>
        <Typography sx={{ color: SITE.stone500, fontSize: '1.125rem', mt: 1.5 }}>{t('features.subtitle')}</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 280px 1fr', lg: '1fr 330px 1fr' }, gap: { xs: 2, md: 3 }, alignItems: 'stretch' }}>
        <Box sx={{ order: { xs: 1, md: 0 }, display: 'grid', gap: 2, alignContent: 'space-between' }}>{FEATURES_LEFT.map(card)}</Box>
        <Box sx={{ order: { xs: 0, md: 0 }, position: 'relative', mt: { xs: 6, md: 10 }, minHeight: { xs: 400, md: 0 }, width: { xs: '100%', sm: 360, md: 'auto' }, mx: { xs: 'auto', md: 0 } }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '32px', backgroundColor: FRESH.to, backgroundImage: `${TRIANGLES}, linear-gradient(160deg, #66BC98, ${FRESH.from} 40%, ${FRESH.to})`, backgroundSize: '120px 120px, cover' }} />
          {/* Clips the sides and the rounded bottom, but not the top: the head rises above the panel */}
          <Box sx={{ position: 'absolute', inset: 0, clipPath: 'inset(-140px 0 0 0 round 0 0 32px 32px)' }}>
            <Box sx={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', height: 'calc(100% + 80px)', aspectRatio: '610 / 1121' }}>
              <Image src="/site/features-student.png" alt={t('features.photoAlt')} fill sizes="(max-width: 900px) 300px, 340px" style={{ objectFit: 'contain', objectPosition: 'bottom' }} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ order: { xs: 2, md: 0 }, display: 'grid', gap: 2, alignContent: 'space-between' }}>{FEATURES_RIGHT.map(card)}</Box>
      </Box>
    </Box>
  );
}

// ───────────────────────── Programs & clubs (Part B) ─────────────────────────

/** YouTube link → its thumbnail (the card shows a picture with a play button) */
function youtubeThumb(url: string): string | null {
  const id = /(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/.exec(url)?.[1];
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** ["MON", "THU"] → "Mon & Thu"; three or more → "Mon, Wed, Fri" (Stitch) */
function daysText(days: string[], t: (key: string) => string) {
  const names = days.map((d) => t(`programs.days.${d}`));
  return names.length === 2 ? `${names[0]} ${t('programs.and')} ${names[1]}` : names.join(', ');
}

/**
 * Stitch Part B "Programs & clubs": a 3 × 2 grid of horizontal cards (photo 38 %, text), "Included
 * in tuition" and "Ask about schedule →", which takes the visitor to the enquiry form.
 */
export function SitePrograms({ programs }: { programs: SiteData['programs'] }) {
  const { t } = useTranslation('site');
  if (programs.length === 0) return null;
  return (
    <Box component="section" id="programs" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <Typography sx={{ ...eyebrowSx, fontWeight: 700, letterSpacing: '0.05em', mb: 1 }}>{t('programs.eyebrow')}</Typography>
      <Typography component="h2" sx={{ ...sectionTitleSx, fontWeight: 800, color: SITE.ink, mb: 1 }}>
        {t('programs.title')}
      </Typography>
      <Typography sx={{ color: SITE.neutral500, fontSize: '1rem', mb: 4 }}>{t('programs.subtitle')}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {programs.map((p) => {
          const thumb = p.photoUrl ?? (p.videoUrl ? youtubeThumb(p.videoUrl) : null);
          const time = p.startTime && p.endTime ? ` · ${p.startTime} – ${p.endTime}` : '';
          return (
            <Stack
              key={p.id}
              direction="row"
              sx={{ bgcolor: '#fff', borderRadius: '10px', border: `1px solid ${SITE.cardBorder}`, overflow: 'hidden', height: { xs: 'auto', sm: 208 }, minHeight: { xs: 176 }, boxShadow: SITE.cardShadow, transition: 'box-shadow 200ms ease', '&:hover': { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' } }}
            >
              <Box
                component={p.videoUrl ? 'a' : 'div'}
                {...(p.videoUrl ? { href: p.videoUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${t('programs.video')}: ${p.name}` } : {})}
                sx={{ width: '38%', flexShrink: 0, bgcolor: SITE.stone100, position: 'relative', overflow: 'hidden', display: 'block' }}
              >
                {thumb && <Box component="img" src={thumb} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                {p.videoUrl && <PlayCircleFilledRoundedIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 44, color: 'rgba(255,255,255,0.92)', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />}
              </Box>
              <Stack sx={{ flex: 1, p: 2.5, justifyContent: 'space-between', minWidth: 0 }}>
                <Stack sx={{ gap: 0.5 }}>
                  <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, color: SITE.ink, lineHeight: 1.375 }}>
                    {p.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: SITE.neutral500, fontWeight: 500 }}>
                    {[t('programs.grades', { from: p.gradeFrom, to: p.gradeTo }), p.levelNote].filter(Boolean).join(' · ')}
                  </Typography>
                  {p.days.length > 0 && <Typography sx={{ fontSize: '0.75rem', color: SITE.neutral500 }}>{daysText(p.days, t) + time}</Typography>}
                  <Typography sx={{ fontSize: '0.75rem', color: '#374151', pt: 0.5, display: '-webkit-box', WebkitLineClamp: { xs: 2, sm: 1 }, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</Typography>
                </Stack>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1, mt: 1, borderTop: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
                  <Box sx={{ px: 1, py: 0.25, borderRadius: '4px', fontSize: '11px', fontWeight: 600, bgcolor: SITE.tint, color: SITE.spruce }}>{t('programs.included')}</Box>
                  <Link component="button" type="button" onClick={() => scrollToId('enquire')} underline="none" sx={{ fontSize: '0.75rem', fontWeight: 600, color: SITE.spruce, '&:hover': { color: SITE.spruceHover } }}>
                    {t('programs.ask')} →
                  </Link>
                </Stack>
              </Stack>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}

// ───────────────────────── Our team (Part C) ─────────────────────────

/** Stitch Part C "Our team": the director's card with the quote, then a row of 4 cards */
export function SiteTeam({ director, team }: { director: SiteData['director']; team: SiteData['team'] }) {
  const { t } = useTranslation('site');
  if (!director && team.length === 0) return null;
  const portrait = (url: string | null | undefined, size: number) =>
    url ? (
      <Box component="img" src={url} alt="" sx={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${SITE.stone100}`, flexShrink: 0 }} />
    ) : (
      <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: SITE.tint, flexShrink: 0 }} />
    );
  return (
    <Box component="section" id="team" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <Typography sx={{ ...eyebrowSx, mb: 1 }}>{t('team.eyebrow')}</Typography>
      <Typography component="h2" sx={{ ...sectionTitleSx, color: '#111827', mb: 4 }}>
        {t('team.title')}
      </Typography>
      {director && (
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ bgcolor: '#fff', borderRadius: '16px', p: 4, border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow, mb: 3, alignItems: 'center', gap: 4 }}>
          <Box sx={{ '& img, & > div': { width: 144, height: 144, boxShadow: SITE.cardShadow, borderWidth: 2 } }}>{portrait(director.photoUrl, 144)}</Box>
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography component="h3" sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
              {director.name}
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: SITE.spruce, mt: 0.5, mb: 2 }}>{director.role}</Typography>
            {director.note && (
              <Typography component="blockquote" sx={{ m: 0, borderLeft: `2px solid ${SITE.spruce}`, pl: 2, color: SITE.stone700, fontStyle: 'italic', fontSize: '1.125rem', lineHeight: 1.625, textAlign: 'left' }}>
                “{director.note}”
              </Typography>
            )}
          </Box>
        </Stack>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        {team.map((p) => (
          <Box key={p.id} sx={{ bgcolor: '#fff', borderRadius: '10px', p: 3, border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>{portrait(p.photoUrl, 80)}</Box>
            <Typography component="h4" sx={{ fontWeight: 700, color: '#111827' }}>
              {p.name}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: SITE.spruce, mt: 0.25 }}>{p.role}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ───────────────────────── School stages (Part C) ─────────────────────────

const STAGES = [
  { key: 'primary', image: '/site/stage-primary.jpg' },
  { key: 'middle', image: '/site/stage-middle.jpg' },
  { key: 'high', image: '/site/stage-high.jpg' },
];

/** Stitch Part C "School stages": three photo cards with ages, title and three ticks */
export function SiteStages() {
  const { t } = useTranslation('site');
  return (
    <Box component="section" id="stages" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <CenteredHeader title={t('stages.title')} subtitle={t('stages.subtitle')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {STAGES.map(({ key, image }) => (
          <Box key={key} sx={{ bgcolor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow }}>
            <Box component="img" src={image} alt="" sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: SITE.stone500 }}>{t(`stages.${key}.ages`)}</Typography>
              <Typography component="h3" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', mt: 0.5, mb: 2 }}>
                {t(`stages.${key}.title`)}
              </Typography>
              <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1.25 }}>
                {[1, 2, 3].map((n) => (
                  <Stack component="li" key={n} direction="row" sx={{ alignItems: 'center', gap: 1.25, color: SITE.stone700, fontSize: '0.875rem' }}>
                    <CheckRoundedIcon sx={{ fontSize: 16, color: SITE.spruce, flexShrink: 0 }} />
                    <span>{t(`stages.${key}.item${n}`)}</span>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ───────────────────────── Admission process (Part C) ─────────────────────────

const STEP_ICONS: SvgIconComponent[] = [LocationOnOutlinedIcon, ForumOutlinedIcon, GroupsOutlinedIcon, EditNoteOutlinedIcon, PsychologyOutlinedIcon, VerifiedOutlinedIcon];
const dashed = `2px dashed rgba(31,78,67,0.4)`;

/**
 * Stitch Part C "Admission process": a zig-zag timeline on a dashed centre line (steps left,
 * right, left …); phones get one column on a line at the left.
 */
export function SiteAdmission() {
  const { t } = useTranslation('site');
  return (
    <Box component="section" id="admissions" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <CenteredHeader title={t('admission.title')} subtitle={t('admission.subtitle')} />
      <Box sx={{ position: 'relative', maxWidth: 896, mx: 'auto' }}>
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: { xs: 16, md: '50%' }, borderLeft: dashed, transform: { md: 'translateX(-50%)' } }} />
        <Stack sx={{ gap: { xs: 5, md: 6 } }}>
          {STEP_ICONS.map((Icon, i) => {
            const left = i % 2 === 0;
            const n = i + 1;
            return (
              <Box key={n} sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: { md: left ? 'flex-start' : 'flex-end' } }}>
                <Box sx={{ position: 'absolute', zIndex: 1, width: 16, height: 16, borderRadius: '50%', bgcolor: '#fff', border: `2px solid ${SITE.spruce}`, left: { xs: 16, md: '50%' }, top: { xs: 24, md: '50%' }, transform: { xs: 'translateX(-50%)', md: 'translate(-50%, -50%)' } }} />
                <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { xs: 5, md: left ? 0 : 6 }, pr: { md: left ? 6 : 0 } }}>
                  <Box sx={{ position: 'relative', bgcolor: SITE.soft, borderRadius: '10px', p: 3, boxShadow: SITE.cardShadow, transition: 'box-shadow 200ms ease', '&:hover': { boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' } }}>
                    <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', top: '50%', width: 48, borderTop: dashed, ...(left ? { right: -48 } : { left: -48 }) }} />
                    <Stack direction="row" sx={{ gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={iconTile(40, '8px')}>
                        <Icon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                          {String(n).padStart(2, '0')} {t(`admission.step${n}.title`)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: SITE.stone600, mt: 0.5, lineHeight: 1.625 }}>{t(`admission.step${n}.body`)}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

// ───────────────────────── FAQ (Part C) ─────────────────────────

/** Stitch Part C FAQ: six cards, the first one open; one open at a time */
export function SiteFaq() {
  const { t } = useTranslation('site');
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(1);
  return (
    <Box component="section" id="faq" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <CenteredHeader eyebrow={t('faq.eyebrow')} title={t('faq.title')} />
      <Stack sx={{ maxWidth: 768, mx: 'auto', gap: 1.5 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const isOpen = open === n;
          return (
            <Box key={n} sx={{ bgcolor: '#fff', borderRadius: '12px', border: `1px solid ${SITE.stone200}`, p: 2.5, boxShadow: SITE.cardShadow }}>
              <ButtonBase onClick={() => setOpen(isOpen ? null : n)} aria-expanded={isOpen} sx={{ width: '100%', justifyContent: 'space-between', gap: 2, textAlign: 'left', fontWeight: 700, color: '#111827', fontSize: '1rem', borderRadius: 1 }}>
                <span>{t(`faq.q${n}`)}</span>
                <KeyboardArrowDownRoundedIcon sx={{ color: SITE.stone500, transform: isOpen ? 'rotate(180deg)' : 'none', transition: reduced ? 'none' : 'transform 200ms ease' }} />
              </ButtonBase>
              <Collapse in={isOpen} timeout={reduced ? 0 : 'auto'}>
                <Typography sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${SITE.stone100}`, color: SITE.stone600, fontSize: '0.875rem', lineHeight: 1.625 }}>{t(`faq.a${n}`)}</Typography>
              </Collapse>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
