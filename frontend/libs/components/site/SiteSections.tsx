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
import { EASE, HOVER, Reveal, hoverLift, hoverZoom, useScrollDraw } from './motion';
import { SITE, type SiteData, containerSx, eyebrowSx, scrollToId, sectionTitleSx } from './tokens';

/** A lighter green than the brand spruce for the icon tiles and the photo panel (the developer's reference) */
const FRESH = { from: '#4FA383', to: '#2F7A63' } as const;

const iconTile = (size: number, radius: string) => ({
  width: size,
  height: size,
  borderRadius: radius,
  background: `linear-gradient(145deg, ${FRESH.from}, ${FRESH.to})`,
  boxShadow: '0 8px 16px -8px rgba(47,122,99,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

function CenteredHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <Reveal sx={{ textAlign: 'center', maxWidth: 576, mx: 'auto', mb: { xs: 5, md: 7 } }}>
      {eyebrow && <Typography sx={{ ...eyebrowSx, mb: 0.5 }}>{eyebrow}</Typography>}
      <Typography component="h2" sx={{ ...sectionTitleSx, fontSize: { xs: '1.875rem', lg: '2.25rem' } }}>
        {title}
      </Typography>
      {subtitle && <Typography sx={{ color: SITE.stone600, fontSize: '1.125rem', mt: 1.5 }}>{subtitle}</Typography>}
    </Reveal>
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
        {panels.map(({ key, icon: Icon, list }, i) => (
          <Reveal key={key} delay={i * 80} sx={{ bgcolor: SITE.soft, borderRadius: '10px', p: 4 }}>
            <Box sx={{ ...iconTile(56, '12px'), mb: 3 }}>
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
          </Reveal>
        ))}
      </Box>
    </Box>
  );
}

// ───────────────────────── Facilities (day 20) ─────────────────────────

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
  // Cards slide in from their side and lean towards the photo under the mouse
  const card =
    (side: 'left' | 'right') =>
    function FeatureCard({ key, icon: Icon }: { key: string; icon: SvgIconComponent }, i: number) {
      return (
      <Reveal key={key} from={side} delay={i * 70}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 2.5,
            p: { xs: 2, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#F6F7F6',
            border: '1px solid #EEF0EE',
            minHeight: { md: 104 },
            transition: `transform 300ms ${EASE}, background-color 200ms ease`,
            '& .tile': { transition: `transform 300ms ${EASE}` },
            [HOVER]: { '&:hover': { transform: `translateX(${side === 'left' ? 6 : -6}px)`, bgcolor: '#F1F4F2' }, '&:hover .tile': { transform: 'scale(1.08)' } },
          }}
        >
          <Box className="tile" sx={iconTile(56, '16px')}>
            <Icon />
          </Box>
          <Typography sx={{ fontSize: { xs: '1rem', md: '1.0625rem' }, fontWeight: 500, color: SITE.heading, lineHeight: 1.45 }}>{t(`features.${key}`)}</Typography>
        </Stack>
      </Reveal>
      );
    };
  return (
    <Box component="section" id="facilities" aria-labelledby="facilities-title" sx={{ ...containerSx, py: { xs: 8, md: 10 } }}>
      <Reveal sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: { xs: 9, md: 8 } }}>
        <Typography component="h2" id="facilities-title" sx={{ ...sectionTitleSx, fontWeight: 800, fontSize: { xs: '1.875rem', md: '2.75rem' }, color: SITE.ink }}>
          {t('features.title')}
        </Typography>
        <Typography sx={{ color: SITE.stone500, fontSize: '1.125rem', mt: 1.5 }}>{t('features.subtitle')}</Typography>
      </Reveal>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 280px 1fr', lg: '1fr 330px 1fr' }, gap: { xs: 2, md: 3 }, alignItems: 'stretch' }}>
        <Box sx={{ order: { xs: 1, md: 0 }, display: 'grid', gap: 2, alignContent: 'space-between' }}>{FEATURES_LEFT.map(card('left'))}</Box>
        <Reveal delay={120} sx={{ order: { xs: 0, md: 0 }, position: 'relative', mt: { xs: 6, md: 10 }, minHeight: { xs: 400, md: 0 }, width: { xs: '100%', sm: 360, md: 'auto' }, mx: { xs: 'auto', md: 0 } }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '32px', backgroundColor: FRESH.to, backgroundImage: `${TRIANGLES}, linear-gradient(160deg, #66BC98, ${FRESH.from} 40%, ${FRESH.to})`, backgroundSize: '120px 120px, cover' }} />
          {/* Clips the sides and the rounded bottom, but not the top: the head rises above the panel */}
          <Box sx={{ position: 'absolute', inset: 0, clipPath: 'inset(-140px 0 0 0 round 0 0 32px 32px)' }}>
            <Box sx={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', height: 'calc(100% + 80px)', aspectRatio: '610 / 1121' }}>
              <Image src="/site/features-student.png" alt={t('features.photoAlt')} fill sizes="(max-width: 900px) 300px, 340px" style={{ objectFit: 'contain', objectPosition: 'bottom' }} />
            </Box>
          </Box>
        </Reveal>
        <Box sx={{ order: { xs: 2, md: 0 }, display: 'grid', gap: 2, alignContent: 'space-between' }}>{FEATURES_RIGHT.map(card('right'))}</Box>
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
      <Reveal>
        <Typography sx={{ ...eyebrowSx, fontWeight: 700, letterSpacing: '0.05em', mb: 1 }}>{t('programs.eyebrow')}</Typography>
        <Typography component="h2" sx={{ ...sectionTitleSx, fontWeight: 800, color: SITE.ink, mb: 1 }}>
          {t('programs.title')}
        </Typography>
        <Typography sx={{ color: SITE.neutral500, fontSize: '1rem', mb: 4 }}>{t('programs.subtitle')}</Typography>
      </Reveal>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {programs.map((p, i) => {
          const thumb = p.photoUrl ?? (p.videoUrl ? youtubeThumb(p.videoUrl) : null);
          const time = p.startTime && p.endTime ? ` · ${p.startTime} – ${p.endTime}` : '';
          return (
            <Reveal key={p.id} delay={(i % 2) * 90}>
            <Stack
              direction="row"
              sx={{ bgcolor: '#fff', borderRadius: '10px', border: `1px solid ${SITE.cardBorder}`, overflow: 'hidden', height: { xs: 'auto', sm: 208 }, minHeight: { xs: 176 }, boxShadow: SITE.cardShadow, ...hoverLift, ...hoverZoom('.thumb') }}
            >
              <Box
                component={p.videoUrl ? 'a' : 'div'}
                {...(p.videoUrl ? { href: p.videoUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${t('programs.video')}: ${p.name}` } : {})}
                sx={{ width: '38%', flexShrink: 0, bgcolor: SITE.stone100, position: 'relative', overflow: 'hidden', display: 'block' }}
              >
                {thumb && <Box component="img" className="thumb" src={thumb} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
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
            </Reveal>
          );
        })}
      </Box>
    </Box>
  );
}

// ───────────────────────── Our team (Part C) ─────────────────────────

/** MUI spacing units between team cards (2.5 × 8 px) */
const GAP = 2.5;

/**
 * Stitch Part C "Our team": the director's card with the quote, then the team in rows of four
 * with large photos; a shorter last row is centred (the developer's 4 + 3 layout).
 */
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
      <Reveal>
        <Typography sx={{ ...eyebrowSx, mb: 1 }}>{t('team.eyebrow')}</Typography>
        <Typography component="h2" sx={{ ...sectionTitleSx, color: '#111827', mb: 4 }}>
          {t('team.title')}
        </Typography>
      </Reveal>
      {director && (
        <Reveal sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ bgcolor: '#fff', borderRadius: '16px', p: 4, border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow, alignItems: 'center', gap: 4 }}>
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
        </Reveal>
      )}
      {/* Rows of four; a shorter last row is centred (7 people: 4 + 3) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: GAP }}>
        {team.map((p, i) => (
          <Reveal key={p.id} delay={(i % 4) * 70} sx={{ width: { xs: '100%', sm: `calc((100% - ${GAP * 8}px) / 2)`, lg: `calc((100% - ${GAP * 3 * 8}px) / 4)` } }}>
          <Box component="article" sx={{ height: '100%', bgcolor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow, ...hoverLift, ...hoverZoom() }}>
            <Box sx={{ aspectRatio: '1 / 1', bgcolor: SITE.tint, overflow: 'hidden' }}>{p.photoUrl && <Box component="img" src={p.photoUrl} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</Box>
            <Box sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography component="h4" sx={{ fontWeight: 700, fontSize: '1.0625rem', color: '#111827' }}>
                {p.name}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: SITE.spruce, mt: 0.25 }}>{p.role}</Typography>
            </Box>
          </Box>
          </Reveal>
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
        {STAGES.map(({ key, image }, i) => (
          <Reveal key={key} delay={i * 90}>
          <Box sx={{ height: '100%', bgcolor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(231,229,228,0.8)', boxShadow: SITE.cardShadow, ...hoverLift, ...hoverZoom() }}>
            <Box sx={{ overflow: 'hidden' }}>
              <Box component="img" src={image} alt="" sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
            </Box>
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
          </Reveal>
        ))}
      </Box>
    </Box>
  );
}

// ───────────────────────── Admission process (Part C) ─────────────────────────

const STEP_ICONS: SvgIconComponent[] = [LocationOnOutlinedIcon, ForumOutlinedIcon, GroupsOutlinedIcon, EditNoteOutlinedIcon, PsychologyOutlinedIcon, VerifiedOutlinedIcon];
const dashed = '2px dashed #CBD2DC';
/** The lane for the centre line: a short dashed arm on each side (the developer's reference) */
const LANE = 140;
/** Card width on wide screens; the list is centred, so the arms stay short */
const CARD_W = 420;
/** Each card starts this far above the end of the previous one (~20 % of a card: an 80 % step) */
const OVERLAP = 56;

/**
 * "Admission process" laid out like the developer's reference (Jahon School), sizes measured on
 * it: cards with the icon on top and "01. Title", alternating left and right with a wide lane for
 * the dashed centre line. Each card starts a little above the end of the previous one, so the
 * steps read as a zig-zag; a dashed arm joins the card to its dot on the line. Phones get one
 * column on a line at the left.
 */
export function SiteAdmission() {
  const { t } = useTranslation('site');
  const drawn = useScrollDraw<HTMLDivElement>();
  return (
    <Box component="section" id="admissions" sx={{ ...containerSx, py: { xs: 6, md: 10 } }}>
      <CenteredHeader title={t('admission.title')} subtitle={t('admission.subtitle')} />
      <Box component="ol" sx={{ position: 'relative', listStyle: 'none', m: 0, p: 0, mx: 'auto', maxWidth: { md: CARD_W * 2 + LANE }, display: 'flex', flexDirection: 'column' }}>
        <Box aria-hidden sx={{ position: 'absolute', top: 0, bottom: 0, left: { xs: 15, md: '50%' }, borderLeft: dashed }} />
        {/* The same line in green, growing as the visitor scrolls through the steps */}
        <Box ref={drawn} aria-hidden sx={{ position: 'absolute', top: 0, bottom: 0, left: { xs: 15, md: '50%' }, width: 2, bgcolor: '#4FA383', borderRadius: 1, transformOrigin: 'top' }} />
        {STEP_ICONS.map((Icon, i) => {
          const left = i % 2 === 0;
          const n = i + 1;
          return (
            <Box
              component="li"
              key={n}
              sx={{
                position: 'relative',
                width: { xs: '100%', md: `calc(50% - ${LANE / 2}px)` },
                alignSelf: { md: left ? 'flex-start' : 'flex-end' },
                mt: { xs: i ? 3 : 0, md: i ? `-${OVERLAP}px` : 0 },
                pl: { xs: 5, md: 0 },
              }}
            >
              {/* The dot on the centre line and the dashed arm to the card */}
              {/* Centred with margins, not a transform: the reveal scales it in */}
              <Reveal from="scale" delay={250} aria-hidden sx={{ position: 'absolute', zIndex: 1, top: { xs: 30, md: '48%' }, width: 18, height: 18, mt: '-9px', ml: '-9px', borderRadius: '50%', bgcolor: '#D5DBE3', border: '3px solid #fff', boxShadow: '0 0 0 1px #D5DBE3', left: { xs: 16, md: left ? `calc(100% + ${LANE / 2 + 1}px)` : `-${LANE / 2 - 1}px` } }} />
              <Box aria-hidden sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', top: '48%', width: LANE / 2 - 10, borderTop: dashed, ...(left ? { right: -(LANE / 2 - 10) } : { left: -(LANE / 2 - 10) }) }} />
              <Reveal from={left ? 'left' : 'right'}>
              <Box sx={{ minHeight: { md: 232 }, bgcolor: '#F8F9FA', border: '1px solid #EEF0EE', borderRadius: '24px', p: { xs: 2.5, md: 2.75 }, ...hoverLift }}>
                <Box sx={{ ...iconTile(52, '14px'), mb: 1.5 }}>
                  <Icon sx={{ fontSize: 26 }} />
                </Box>
                <Typography component="h3" sx={{ fontSize: { xs: '1.25rem', md: '1.375rem' }, fontWeight: 600, color: SITE.ink, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {String(n).padStart(2, '0')}. {t(`admission.step${n}.title`)}
                </Typography>
                <Typography sx={{ fontSize: '1rem', color: SITE.stone500, mt: 0.75, lineHeight: 1.5 }}>{t(`admission.step${n}.body`)}</Typography>
              </Box>
              </Reveal>
            </Box>
          );
        })}
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
            <Reveal key={n} delay={(n - 1) * 60} sx={{ bgcolor: '#fff', borderRadius: '12px', border: `1px solid ${SITE.stone200}`, p: 2.5, boxShadow: SITE.cardShadow }}>
              <ButtonBase onClick={() => setOpen(isOpen ? null : n)} aria-expanded={isOpen} sx={{ width: '100%', justifyContent: 'space-between', gap: 2, textAlign: 'left', fontWeight: 700, color: '#111827', fontSize: '1rem', borderRadius: 1 }}>
                <span>{t(`faq.q${n}`)}</span>
                <KeyboardArrowDownRoundedIcon sx={{ color: SITE.stone500, transform: isOpen ? 'rotate(180deg)' : 'none', transition: reduced ? 'none' : 'transform 200ms ease' }} />
              </ButtonBase>
              <Collapse in={isOpen} timeout={reduced ? 0 : 'auto'}>
                <Typography sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${SITE.stone100}`, color: SITE.stone600, fontSize: '0.875rem', lineHeight: 1.625 }}>{t(`faq.a${n}`)}</Typography>
              </Collapse>
            </Reveal>
          );
        })}
      </Stack>
    </Box>
  );
}
