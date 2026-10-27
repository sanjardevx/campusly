import { type ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Link, Stack, Typography } from '@mui/material';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import { useTranslation } from 'next-i18next/pages';
import type { SiteCourseCategory } from '@/libs/gql/graphql';
import { clock, totalText, youtubeThumb, youtubeWatch } from '@/libs/youtube';
import { EASE, Reveal, hoverLift, hoverZoom } from './motion';
import { SITE, type SiteData, containerSx, eyebrowSx, sectionTitleSx } from './tokens';

type MockTest = SiteData['mockTests'][number];
type OpenCourse = SiteData['openCourses'][number];
type Honor = SiteData['honorStudents'][number];

const cardSx = { bgcolor: '#fff', borderRadius: '12px', border: `1px solid ${SITE.cardBorder}`, boxShadow: SITE.cardShadow } as const;

function SectionHeader({ id, eyebrow, title, subtitle, aside }: { id: string; eyebrow: string; title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <Reveal>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 2, mb: 4 }}>
      <Box>
        <Typography sx={{ ...eyebrowSx, fontWeight: 700, letterSpacing: '0.05em', mb: 1 }}>{eyebrow}</Typography>
        <Typography component="h2" id={`${id}-title`} sx={{ ...sectionTitleSx, fontWeight: 800, color: SITE.ink, mb: subtitle ? 1 : 0 }}>
          {title}
        </Typography>
        {subtitle && <Typography sx={{ color: SITE.neutral500, fontSize: '1rem' }}>{subtitle}</Typography>}
      </Box>
      {aside}
      </Stack>
    </Reveal>
  );
}

/** "+998 71 200 34 44" → "tel:+998712003444" */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const priceText = (price: number) => `${new Intl.NumberFormat('en-US').format(price)} UZS`;
/** "2026-11-07" → "Sat, Nov 7" in the visitor's language */
function examDay(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'uz' ? 'en' : locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

// ───────────────────────── Mock tests (Part B) ─────────────────────────

/**
 * Stitch Part B "Mock tests": a card per upcoming test — seats left (or "Full"), price, title,
 * what is included, date and place, and "To join, contact" with a call button. People register
 * by phone, so the button is a tel: link.
 */
export function SiteMockTests({ tests }: { tests: MockTest[] }) {
  const { t } = useTranslation('site');
  const { locale = 'en' } = useRouter();
  if (tests.length === 0) return null;
  return (
    <Box component="section" id="mock-tests" aria-labelledby="mock-tests-title" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <SectionHeader id="mock-tests" eyebrow={t('mock.eyebrow')} title={t('mock.title')} subtitle={t('mock.subtitle')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {tests.map((m, i) => {
          const full = m.seatsLeft === 0;
          return (
            <Reveal key={m.id} delay={(i % 2) * 90}>
            <Box sx={{ ...cardSx, height: '100%', p: { xs: 2.5, sm: 3.5 }, ...hoverLift }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box component="span" sx={{ px: 1.25, py: 0.5, borderRadius: 999, fontSize: '0.8125rem', fontWeight: 600, bgcolor: full ? '#FDECEC' : '#FEF3C7', color: full ? '#B42318' : '#92400E' }}>
                  {full ? t('mock.full') : t('mock.seatsLeft', { count: m.seatsLeft })}
                </Box>
                <Typography sx={{ fontSize: { xs: '1.375rem', sm: '1.75rem' }, fontWeight: 800, color: SITE.spruce, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{priceText(m.price)}</Typography>
              </Stack>
              <Typography component="h3" sx={{ fontSize: '1.375rem', fontWeight: 700, color: SITE.ink, lineHeight: 1.3 }}>
                {m.title}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: SITE.neutral500, mt: 0.5 }}>{m.included}</Typography>
              <Stack sx={{ gap: 1, mt: 2.5, fontSize: '0.9375rem', color: SITE.stone700 }}>
                <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                  <CalendarTodayRoundedIcon sx={{ fontSize: 20, color: SITE.spruce }} />
                  {examDay(m.date, locale)} · {m.startTime}
                </Stack>
                <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                  <LocationOnRoundedIcon sx={{ fontSize: 20, color: SITE.spruce }} />
                  {m.location}
                </Stack>
              </Stack>
              {(m.contactName || m.contactPhone) && (
                <Box sx={{ mt: 2.5, pt: 2.5, borderTop: `1px solid ${SITE.stone200}` }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: SITE.stone500, mb: 1 }}>{t('mock.toJoin')}</Typography>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      {m.contactName && <Typography sx={{ fontWeight: 700, color: SITE.ink }}>{m.contactName}</Typography>}
                      {m.contactRole && <Typography sx={{ fontSize: '0.875rem', color: SITE.stone500 }}>{m.contactRole}</Typography>}
                    </Box>
                    {m.contactPhone && (
                      <Button href={telHref(m.contactPhone)} startIcon={<CallRoundedIcon />} aria-label={t('mock.call', { phone: m.contactPhone })} sx={{ px: 2, py: 0.75, borderRadius: 2, bgcolor: SITE.soft, color: SITE.spruce, fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { bgcolor: SITE.tint } }}>
                        {m.contactPhone}
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
            </Reveal>
          );
        })}
      </Box>
    </Box>
  );
}

// ───────────────────────── Open Courses (Part B) ─────────────────────────

const CATEGORY_ORDER: SiteCourseCategory[] = ['IT', 'MATH', 'AI', 'STUDY_ABROAD'];

/**
 * Stitch Part B "Open Courses": category tabs (only the ones with courses), a row of cards with the
 * first video's picture, "N lessons", the source and "Start learning", which opens the lesson list;
 * every lesson plays on YouTube. Nothing to sign up for.
 */
export function SiteOpenCourses({ courses }: { courses: OpenCourse[] }) {
  const { t } = useTranslation('site');
  const categories = CATEGORY_ORDER.filter((c) => courses.some((x) => x.category === c));
  const [category, setCategory] = useState<SiteCourseCategory | null>(null);
  const [open, setOpen] = useState<OpenCourse | null>(null);
  // After a tab change the new cards rise in (not on the first render: Reveal handles that)
  const [switched, setSwitched] = useState(false);
  if (courses.length === 0) return null;
  const current = category && categories.includes(category) ? category : categories[0];
  const shown = courses.filter((c) => c.category === current);
  return (
    <Box component="section" id="open-courses" aria-labelledby="open-courses-title" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <SectionHeader
        id="open-courses"
        eyebrow={t('courses.eyebrow')}
        title={t('courses.title')}
        subtitle={t('courses.subtitle')}
        aside={
          categories.length > 1 && (
            <Stack direction="row" role="tablist" aria-label={t('courses.title')} sx={{ p: 0.5, borderRadius: 2, border: `1px solid ${SITE.cardBorder}`, bgcolor: '#fff', gap: 0.5, alignSelf: { xs: 'flex-start', md: 'auto' }, overflowX: 'auto', maxWidth: '100%' }}>
              {categories.map((c) => (
                <ButtonBase key={c} role="tab" aria-selected={c === current} onClick={() => {
                    setCategory(c);
                    setSwitched(true);
                  }} sx={{ px: 2, py: 0.75, borderRadius: 1.5, fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', bgcolor: c === current ? SITE.spruce : 'transparent', color: c === current ? '#fff' : SITE.stone600, transition: 'background-color 150ms ease, color 150ms ease' }}>
                  {t(`courses.cat.${c}`)}
                </ButtonBase>
              ))}
            </Stack>
          )
        }
      />
      <Box
        key={current}
        role="tabpanel"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          ...(switched && {
            '@keyframes courseIn': { from: { opacity: 0, transform: 'translateY(14px)' } },
            '& > *': { animation: `courseIn 500ms ${EASE} both` },
            ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`& > *:nth-of-type(${n + 1})`, { animationDelay: `${n * 60}ms` }])),
            '@media (prefers-reduced-motion: reduce)': { '& > *': { animation: 'none' } },
          }),
        }}
      >
        {shown.map((c, i) => (
          <Reveal key={c.id} delay={i * 70}>
          <Stack sx={{ ...cardSx, height: '100%', overflow: 'hidden', ...hoverLift, ...hoverZoom('.thumb') }}>
            {/* 16:9 crops the black bars of YouTube's 4:3 hqdefault picture */}
            <Box sx={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', bgcolor: '#1C1917' }}>
              {c.lessons[0] && <Box component="img" className="thumb" src={youtubeThumb(c.lessons[0].youtubeId, 'hq')} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              <Box sx={{ position: 'absolute', top: 10, right: 10, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(17,24,39,0.8)', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{t('courses.lessons', { count: c.lessons.length })}</Box>
            </Box>
            <Stack sx={{ p: 2.5, flex: 1, gap: 0.5 }}>
              <Typography component="h3" sx={{ fontSize: '1.125rem', fontWeight: 700, color: SITE.ink }}>
                {c.title}
              </Typography>
              {c.source && <Typography sx={{ fontSize: '0.875rem', color: SITE.stone500 }}>{t('courses.source', { source: c.source })}</Typography>}
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" fullWidth onClick={() => setOpen(c)} sx={{ mt: 2, borderRadius: 2, borderColor: SITE.neutral300, color: SITE.ink, fontWeight: 600, textTransform: 'none', '&:hover': { borderColor: SITE.spruce, bgcolor: SITE.soft } }}>
                {t('courses.start')}
              </Button>
            </Stack>
          </Stack>
          </Reveal>
        ))}
      </Box>
      <CourseDialog course={open} onClose={() => setOpen(null)} />
    </Box>
  );
}

/** The lessons of one course; each opens on YouTube in a new tab */
function CourseDialog({ course, onClose }: { course: OpenCourse | null; onClose: () => void }) {
  const { t } = useTranslation('site');
  return (
    <Dialog open={!!course} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="course-dialog-title">
      {course && (
        <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            <Box>
              <Typography sx={{ ...eyebrowSx, mb: 0.5 }}>{[t(`courses.cat.${course.category}`), course.source].filter(Boolean).join(' · ')}</Typography>
              <Typography id="course-dialog-title" component="h2" sx={{ fontSize: '1.5rem', fontWeight: 800, color: SITE.ink }}>
                {course.title}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label={t('courses.close')} sx={{ mt: -0.5, mr: -1 }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
          {course.description && <Typography sx={{ color: SITE.stone600, mt: 1 }}>{course.description}</Typography>}
          <Stack component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, gap: 1.25 }}>
            {course.lessons.map((l, i) => (
              <Box component="li" key={`${l.youtubeId}-${i}`}>
                <Stack component="a" href={youtubeWatch(l.youtubeId)} target="_blank" rel="noopener noreferrer" direction="row" sx={{ alignItems: 'center', gap: 1.5, p: 1, borderRadius: 2, border: `1px solid ${SITE.cardBorder}`, color: 'inherit', textDecoration: 'none', transition: 'background-color 150ms ease, border-color 150ms ease', '&:hover': { bgcolor: SITE.soft, borderColor: SITE.tint } }}>
                  <Box sx={{ position: 'relative', width: 96, aspectRatio: '16 / 9', borderRadius: 1, overflow: 'hidden', flexShrink: 0, bgcolor: '#1C1917' }}>
                    <Box component="img" src={youtubeThumb(l.youtubeId)} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <PlayCircleFilledRoundedIcon sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 28, color: 'rgba(255,255,255,0.92)' }} />
                  </Box>
                  <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.9375rem', color: SITE.ink }}>
                    {i + 1}. {l.title}
                  </Typography>
                  {l.durationSec != null && <Typography sx={{ fontSize: '0.8125rem', color: SITE.stone500, fontVariantNumeric: 'tabular-nums' }}>{clock(l.durationSec)}</Typography>}
                </Stack>
              </Box>
            ))}
          </Stack>
          <Typography sx={{ mt: 2, fontSize: '0.8125rem', color: SITE.stone500 }}>
            {[t('courses.lessons', { count: course.lessons.length }), course.totalDurationSec ? totalText(course.totalDurationSec) : null, t('courses.onYoutube')].filter(Boolean).join(' · ')}
          </Typography>
        </DialogContent>
      )}
    </Dialog>
  );
}

// ───────────────────────── Honor Students (Part B) ─────────────────────────

/** Gold, silver and bronze dots on the photo (Stitch) */
const MEDAL_DOT: Record<number, string> = { 1: '#D4A017', 2: '#9AA3AE', 3: '#C2703D' };
/** Four cards first; "See all honor students →" shows the rest */
const FIRST_HONORS = 4;

/**
 * Stitch Part B "Honor Students": portrait cards with a medal dot (or the exam score), the name
 * — first name and the last name's initial, only with the parents' consent (server) — class and
 * subject, and the place in the competition.
 */
export function SiteHonorStudents({ honors }: { honors: Honor[] }) {
  const { t } = useTranslation('site');
  const [all, setAll] = useState(false);
  if (honors.length === 0) return null;
  const shown = all ? honors : honors.slice(0, FIRST_HONORS);
  return (
    <Box component="section" id="honor-students" aria-labelledby="honor-students-title" sx={{ ...containerSx, py: { xs: 6, md: 8 } }}>
      <SectionHeader id="honor-students" eyebrow={t('honor.eyebrow')} title={t('honor.title')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2.5 } }}>
        {shown.map((h, i) => {
          const medal = h.resultType === 'MEDAL' && h.place ? MEDAL_DOT[h.place] : null;
          return (
            <Reveal key={h.id} delay={(i % 4) * 80}>
            <Box component="article" sx={{ ...cardSx, height: '100%', overflow: 'hidden', ...hoverLift, ...hoverZoom('.photo') }}>
              <Box sx={{ position: 'relative', aspectRatio: '3 / 4', bgcolor: SITE.soft, overflow: 'hidden' }}>
                {h.photoUrl ? (
                  <Box component="img" className="photo" src={h.photoUrl} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <MilitaryTechRoundedIcon sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 64, color: SITE.stone400 }} />
                )}
                {medal ? (
                  <Reveal from="scale" delay={350 + (i % 4) * 80} role="img" aria-label={t(`honor.medal${h.place}`)} sx={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', bgcolor: medal, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
                ) : (
                  h.score && (
                    <Reveal from="scale" delay={350 + (i % 4) * 80} sx={{ position: 'absolute', top: 12, right: 12, px: 1, py: 0.25, borderRadius: 999, bgcolor: SITE.spruce, color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                      {h.score}
                    </Reveal>
                  )
                )}
              </Box>
              <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Typography component="h3" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 700, color: SITE.ink }}>
                  {h.name}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: SITE.spruce, mt: 0.25 }}>{[h.className, h.subject].filter(Boolean).join(' · ')}</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: SITE.stone500, mt: 0.75, lineHeight: 1.4 }}>{medal ? t('honor.placeLine', { place: t(`honor.place${h.place}`), competition: h.competition }) : h.competition}</Typography>
              </Box>
            </Box>
            </Reveal>
          );
        })}
      </Box>
      {honors.length > FIRST_HONORS && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Link component="button" type="button" onClick={() => setAll(!all)} underline="hover" aria-expanded={all} sx={{ fontSize: '1rem', fontWeight: 600, color: SITE.spruce }}>
            {all ? t('honor.showLess') : `${t('honor.seeAll')} →`}
          </Link>
        </Box>
      )}
    </Box>
  );
}
