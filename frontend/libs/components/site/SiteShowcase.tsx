import { useEffect, useRef, useState, type AnimationEvent, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next/pages';
import { EASE, Reveal } from './motion';
import { PORTAL_HEADER, PORTAL_SHOTS, type PhoneShot, type RoleShots, type ShotLocale, shotSrc } from './portalShots';
import { SITE, containerSx, eyebrowSx, sectionTitleSx } from './tokens';

// ───────────────────────── Portal showcase ─────────────────────────

const ROLES = ['student', 'parent'] as const;
type Role = (typeof ROLES)[number];
const POINTS = ['a', 'b', 'c'] as const;
/** One loop of the "screen recording" (about 6 s on the MacBook, then the phones); while the visitor has not picked a role, the next role starts after each loop */
const LOOP = 15000;

/**
 * Stitch "Campusly Public — Portal Showcase" (the developer's reference: Thompson's app block): the
 * portal in one sentence and a Student / Parent switch with three points for that role. On the
 * right a MacBook and iPhones play a short loop like a screen recording of the real portal (see
 * Devices). The roles change by themselves after each loop until the visitor picks one. The loop
 * only plays while the section is on screen; reduced motion shows the first frame still.
 */
export function SitePortalShowcase() {
  const { t } = useTranslation('site');
  const [role, setRole] = useState<Role>('student');
  const [auto, setAuto] = useState(true);
  const panel = useRef<HTMLDivElement>(null);

  // Play only while the section is on screen (paused animations also stop the roles from changing)
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.dataset.playing = 'true';
        else delete el.dataset.playing;
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = (next: Role) => {
    setAuto(false);
    setRole(next);
  };
  const onLoop = () => {
    if (auto) setRole((r) => ROLES[(ROLES.indexOf(r) + 1) % ROLES.length]);
  };

  return (
    <Box component="section" id="portal" aria-labelledby="portal-title" sx={{ ...containerSx, py: { xs: 6, md: 10 } }}>
      <Box
        ref={panel}
        sx={{
          ...DEMO_KEYFRAMES,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '32px',
          bgcolor: SITE.soft,
          border: '1px solid #E7ECE8',
          px: { xs: 2.5, md: 6, lg: 8 },
          py: { xs: 5, md: 8 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1.15fr' },
          gap: { xs: 6, lg: 5 },
          alignItems: 'center',
          // Off screen: everything waits on its current frame
          '&:not([data-playing]) .demo-anim': { animationPlayState: 'paused' },
          '@media (prefers-reduced-motion: reduce)': {
            '& .demo-anim': { animation: 'none' },
            '& .demo-pointer': { display: 'none' },
            '& .demo-points': { transition: 'none' },
          },
        }}
      >
        <Confetti />
        <Reveal sx={{ position: 'relative' }}>
          <Typography sx={{ ...eyebrowSx, fontWeight: 700, letterSpacing: '0.12em', mb: 1.5 }}>{t('showcase.eyebrow')}</Typography>
          <Typography component="h2" id="portal-title" sx={{ ...sectionTitleSx, fontWeight: 800, fontSize: { xs: '2rem', md: '2.75rem', lg: '3rem' }, lineHeight: 1.08, letterSpacing: '-0.035em', color: SITE.ink }}>
            {t('showcase.title')}
          </Typography>
          <Typography sx={{ color: SITE.stone600, fontSize: { xs: '1.0625rem', md: '1.125rem' }, mt: 2, lineHeight: 1.6, maxWidth: 560 }}>{t('showcase.subtitle')}</Typography>

          {/* Student / Parent (Stitch: a white segmented control) */}
          <Box role="group" aria-label={t('showcase.roles.label')} sx={{ display: 'inline-flex', gap: 0.5, p: 0.5, mt: 3.5, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            {ROLES.map((r) => {
              const on = r === role;
              return (
                <ButtonBase
                  key={r}
                  onClick={() => pick(r)}
                  aria-pressed={on}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    px: { xs: 2, sm: 2.75 },
                    py: 1.1,
                    borderRadius: '9px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: on ? '#fff' : SITE.stone600,
                    bgcolor: on ? SITE.spruce : 'transparent',
                    transition: `background-color 250ms ${EASE}, color 250ms ${EASE}`,
                    '&:hover': { color: on ? '#fff' : SITE.ink },
                    '&:focus-visible': { outline: `2px solid ${SITE.spruce}`, outlineOffset: 2 },
                  }}
                >
                  {t(`showcase.roles.${r}`)}
                  {/* While the roles change by themselves: the time left until the next one */}
                  {on && auto && <Box className="demo-anim" aria-hidden sx={{ position: 'absolute', insetInline: 0, bottom: 0, height: 3, bgcolor: 'rgba(255,255,255,0.5)', transformOrigin: 'left', animation: `demoTab ${LOOP}ms linear infinite` }} />}
                </ButtonBase>
              );
            })}
          </Box>

          {/* The lists share one grid cell, so switching roles never moves anything below */}
          <Box sx={{ display: 'grid', mt: 3.5 }}>
            {ROLES.map((r) => {
              const on = r === role;
              return (
                <Stack
                  key={r}
                  component="ul"
                  className="demo-points"
                  sx={{
                    gridArea: '1 / 1',
                    listStyle: 'none',
                    p: 0,
                    m: 0,
                    gap: 2.25,
                    visibility: on ? 'visible' : 'hidden',
                    opacity: on ? 1 : 0,
                    transform: on ? 'none' : 'translateY(8px)',
                    transition: `opacity 400ms ${EASE}, transform 500ms ${EASE}, visibility 0s ${on ? '0s' : '400ms'}`,
                  }}
                >
                  {POINTS.map((k) => (
                    <Box component="li" key={k} sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
                      {/* Ring with a dot (Stitch) */}
                      <Box aria-hidden sx={{ width: 22, height: 22, mt: '2px', borderRadius: '50%', border: `2px solid ${SITE.spruce}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SITE.spruce }} />
                      </Box>
                      <Typography sx={{ color: SITE.stone600, fontSize: { xs: '1rem', md: '1.0625rem' }, lineHeight: 1.55 }}>
                        <Box component="strong" sx={{ color: SITE.ink, fontWeight: 700 }}>
                          {t(`showcase.points.${r}.${k}.lead`)}
                        </Box>{' '}
                        {t(`showcase.points.${r}.${k}.text`)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              );
            })}
          </Box>
        </Reveal>

        <Box sx={{ position: 'relative' }}>
          <Devices role={role} onLoop={onLoop} />
          <Stack direction="row" sx={{ position: 'relative', mx: 'auto', mt: { xs: 2, sm: 3 }, width: 'fit-content', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 99, bgcolor: '#fff', boxShadow: '0 6px 20px -12px rgba(17,24,39,0.35)' }}>
            <Box aria-hidden sx={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', bgcolor: '#2F9E6E' }}>
              <Box className="demo-anim" sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: '#2F9E6E', animation: 'demoLive 1.8s ease-out infinite' }} />
            </Box>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: SITE.spruce }}>{t('showcase.live')}</Typography>
            {/* Which device is playing now: the bars fill with the loop */}
            <Box aria-hidden sx={{ width: '1px', height: 16, bgcolor: SITE.stone200, mx: 0.5, display: { xs: 'none', sm: 'block' } }} />
            {(['web', 'mobile'] as const).map((step) => (
              <Stack key={`${step}-${role}`} aria-hidden direction="row" sx={{ alignItems: 'center', gap: 0.75, display: { xs: 'none', sm: 'flex' } }}>
                <Typography className="demo-anim" sx={{ fontSize: '0.875rem', fontWeight: 600, color: SITE.ink, animation: `${step === 'web' ? 'demoWebLabel' : 'demoMobileLabel'} ${LOOP}ms linear infinite` }}>
                  {t(`showcase.${step}`)}
                </Typography>
                <Box sx={{ width: 28, height: 3, borderRadius: 2, bgcolor: SITE.stone200, overflow: 'hidden' }}>
                  <Box className="demo-anim" sx={{ height: '100%', bgcolor: SITE.spruce, transformOrigin: 'left', animation: `${step === 'web' ? 'demoWebBar' : 'demoMobileBar'} ${LOOP}ms linear infinite` }} />
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

/** Soft dots and rings around the devices (Stitch) */
function Confetti() {
  const bits: { top: string; left: string; size: number; ring?: boolean }[] = [
    { top: '9%', left: '48%', size: 18, ring: true },
    { top: '6%', left: '89%', size: 12 },
    { top: '19%', left: '70%', size: 8 },
    { top: '86%', left: '64%', size: 16, ring: true },
    { top: '91%', left: '86%', size: 10 },
  ];
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: { xs: 'none', lg: 'block' } }}>
      {bits.map((b, i) => (
        <Box key={i} sx={{ position: 'absolute', top: b.top, left: b.left, width: b.size, height: b.size, borderRadius: '50%', ...(b.ring ? { border: `1.5px solid ${SITE.stone400}` } : { bgcolor: '#C9D3CD' }) }} />
      ))}
    </Box>
  );
}

// ── the screen recording ──

/** The stage's poses: the MacBook in front (its turn, turned like the developer's reference photo) and swung back (the phones' turn) */
const MAC_FRONT = { transform: 'rotateY(-16deg)', opacity: 1, filter: 'blur(0px)', zIndex: 3 };
const MAC_BACK = { transform: 'translate3d(-16%, -8%, -560px) rotateY(-64deg)', opacity: 0.35, filter: 'blur(3px)', zIndex: 0 };
/** Waiting: behind the MacBook's far (left) edge, peeking out */
const PHONE_BACK = { transform: 'translate3d(-82%, -4%, -320px)', zIndex: 2 };
const PHONE_FRONT = { transform: 'translate3d(0, 0, 0)', zIndex: 4 };
const SIDE_HIDDEN = { opacity: 0, transform: 'translate3d(0, 4%, -200px)' };
const side = (dir: 1 | -1) => ({ opacity: 1, transform: `translate3d(${dir * 80}%, 8%, -140px) rotateY(${-dir * 26}deg) rotateZ(${dir * 7}deg)` });

/**
 * The parts of the 15-second script that are the same for every role and language, as percentages
 * of the loop: 0–40 % the MacBook plays in front; 40–46 % it swings back like a turning vane and
 * blurs while the phone comes forward; 46–92 % the phone plays; 72–80 % two more phones fan out
 * from behind it; at the end everything goes back. Where the pointer goes is in demoScript.
 */
const DEMO_KEYFRAMES = {
  '@keyframes demoMacStage': { '0%, 40%': MAC_FRONT, '46%, 93%': MAC_BACK, '99%, 100%': MAC_FRONT },
  '@keyframes demoPhoneStage': { '0%, 40%': PHONE_BACK, '46%, 93%': PHONE_FRONT, '99%, 100%': PHONE_BACK },
  '@keyframes demoPhoneVeil': { '0%, 40%': { opacity: 0.45 }, '46%, 93%': { opacity: 0 }, '99%, 100%': { opacity: 0.45 } },
  '@keyframes demoSideL': { '0%, 72%': SIDE_HIDDEN, '80%, 91%': side(-1), '97%, 100%': SIDE_HIDDEN },
  '@keyframes demoSideR': { '0%, 72%': SIDE_HIDDEN, '80%, 91%': side(1), '97%, 100%': SIDE_HIDDEN },
  // Web pages: the dashboard, then the page "a" opened (from 12 %), then the page "b" opened (from 31 %)
  '@keyframes demoWeb1': { '0%, 10.5%': { opacity: 1 }, '12%, 97%': { opacity: 0 }, '99%, 100%': { opacity: 1 } },
  '@keyframes demoWeb2': { '0%, 10.5%': { opacity: 0 }, '12%, 29.5%': { opacity: 1 }, '31%, 100%': { opacity: 0 } },
  '@keyframes demoWeb3': { '0%, 29.5%': { opacity: 0 }, '31%, 96%': { opacity: 1 }, '98%, 100%': { opacity: 0 } },
  // Phone pages: the home, then the page "c" opened (from 68 %)
  '@keyframes demoPhone1': { '0%, 66%': { opacity: 1 }, '68%, 97%': { opacity: 0 }, '99%, 100%': { opacity: 1 } },
  '@keyframes demoPhone2': { '0%, 66%': { opacity: 0 }, '68%, 96%': { opacity: 1 }, '98%, 100%': { opacity: 0 } },
  '@keyframes demoTab': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
  '@keyframes demoLive': { from: { transform: 'scale(1)', opacity: 0.6 }, to: { transform: 'scale(2.8)', opacity: 0 } },
  '@keyframes demoWebBar': { '0%': { transform: 'scaleX(0)' }, '40%, 100%': { transform: 'scaleX(1)' } },
  '@keyframes demoMobileBar': { '0%, 46%': { transform: 'scaleX(0)' }, '96%, 100%': { transform: 'scaleX(1)' } },
  '@keyframes demoWebLabel': { '0%, 40%': { opacity: 1 }, '46%, 100%': { opacity: 0.45 } },
  '@keyframes demoMobileLabel': { '0%, 40%': { opacity: 0.45 }, '46%, 100%': { opacity: 1 } },
};

/** The MacBook's screen is 16 : 10.4 (the shots were taken at 1440 × 936): its height in widths × 100 */
const MAC_H = 65;
/** The phone's screen (9 : 19.5) and its status bar, in widths × 100; the page shows below the status bar */
const PHONE_H = (100 * 19.5) / 9;
const STATUS = 11.5;
const PHONE_AREA = PHONE_H - STATUS;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const n2 = (n: number) => Number(n.toFixed(2));
/** A pointer frame: at (x, y) in container widths (cqw), pressed when scale < 1 */
const pt = (x: number, y: number, scale = 1) => `translate(${n2(x)}cqw, ${n2(y)}cqw) scale(${scale})`;
const scrollTo = (y: number) => ({ transform: `translateY(${n2(-y)}cqw)` });
/** A ring that grows and fades out from a click at (x, y) */
const rippleAt = (x: number, y: number, click: number) => ({
  [`0%, ${click - 0.1}%`]: { opacity: 0, transform: pt(x, y, 0.3) },
  [`${click}%`]: { opacity: 1, transform: pt(x, y, 0.4) },
  [`${click + 5}%, 100%`]: { opacity: 0, transform: pt(x, y, 2.2) },
});

/**
 * The script parts that depend on the role and the language: where the links are on the
 * screenshots (they move with the text) and how long each page is. Keyframe names carry the id, so
 * the scripts of different roles and languages never overwrite each other.
 */
function demoScript(id: string, s: RoleShots) {
  // Web: scroll the dashboard so link "a" sits mid-screen, click it (9 %); look around page 2; click "b" (28 %)
  const webMax = (ratio: number) => Math.max(0, ratio * 100 - MAC_H);
  const aY = s.a.y * s.web[0] * 100;
  const s1 = clamp(aY - 34, 0, webMax(s.web[0]));
  const a = { x: s.a.x * 100, y: aY - s1 };
  const b = { x: s.b.x * 100, y: s.b.y * s.web[1] * 100 };
  const rest = { x: 80, y: 50 };
  // Phone: swipe up and back, then tap "c" (65.5 %) — a link on the page or a tab in the bottom bar
  const phoneMax = (shot: PhoneShot, cap: number) => clamp(shot.ratio * 100 - PHONE_AREA, 0, cap);
  const c = { x: s.c.x * 100, y: s.c.fromBottom !== undefined ? PHONE_H - s.c.fromBottom * 100 : STATUS + (s.c.y ?? 0) * 100 };
  const low = { x: 62, y: 165 };
  const high = { x: 62, y: 85 };
  return {
    [`@keyframes web1Scroll-${id}`]: { '0%, 2%': scrollTo(0), '6%, 97%': scrollTo(s1), '99%, 100%': scrollTo(0) },
    [`@keyframes web2Scroll-${id}`]: { '0%, 13%': scrollTo(0), '18%, 20%': scrollTo(webMax(s.web[1])), '24%, 100%': scrollTo(0) },
    [`@keyframes web3Scroll-${id}`]: { '0%, 31.5%': scrollTo(0), '38%, 92%': scrollTo(Math.min(webMax(s.web[2]), 60)), '97%, 100%': scrollTo(0) },
    [`@keyframes cursor-${id}`]: {
      '0%': { opacity: 0, transform: pt(rest.x, rest.y) },
      '2%': { opacity: 1, transform: pt(rest.x, rest.y) },
      '8%': { opacity: 1, transform: pt(a.x, a.y) },
      '9%': { opacity: 1, transform: pt(a.x, a.y, 0.82) },
      '10%, 12%': { opacity: 1, transform: pt(a.x, a.y) },
      '17%, 23%': { opacity: 1, transform: pt(58, 40) },
      '27%': { opacity: 1, transform: pt(b.x, b.y) },
      '28%': { opacity: 1, transform: pt(b.x, b.y, 0.82) },
      '29%, 31%': { opacity: 1, transform: pt(b.x, b.y) },
      '34%': { opacity: 0, transform: pt(b.x, b.y) },
      '100%': { opacity: 0, transform: pt(rest.x, rest.y) },
    },
    [`@keyframes rippleA-${id}`]: rippleAt(a.x, a.y, 9),
    [`@keyframes rippleB-${id}`]: rippleAt(b.x, b.y, 28),
    [`@keyframes phone1Scroll-${id}`]: { '0%, 47.5%': scrollTo(0), '53.5%, 55.5%': scrollTo(phoneMax(s.phone[0], 130)), '61%, 100%': scrollTo(0) },
    [`@keyframes phone2Scroll-${id}`]: { '0%, 69%': scrollTo(0), '79%, 92%': scrollTo(phoneMax(s.phone[1], 130)), '97%, 100%': scrollTo(0) },
    [`@keyframes side1Scroll-${id}`]: { '0%, 80%': scrollTo(0), '88%, 91%': scrollTo(phoneMax(s.sides[0], 90)), '96%, 100%': scrollTo(0) },
    [`@keyframes side2Scroll-${id}`]: { '0%, 80%': scrollTo(0), '88%, 91%': scrollTo(phoneMax(s.sides[1], 90)), '96%, 100%': scrollTo(0) },
    [`@keyframes touch-${id}`]: {
      '0%, 46.5%': { opacity: 0, transform: pt(low.x, low.y, 0.6) },
      '47.5%': { opacity: 1, transform: pt(low.x, low.y) },
      '53%': { opacity: 1, transform: pt(high.x, high.y) },
      '54%': { opacity: 0, transform: pt(high.x, high.y) },
      '55%': { opacity: 0, transform: pt(high.x, high.y, 0.6) },
      '56%': { opacity: 1, transform: pt(high.x, high.y) },
      '61%': { opacity: 1, transform: pt(low.x, low.y) },
      '62%': { opacity: 0, transform: pt(low.x, low.y) },
      '63%': { opacity: 0, transform: pt(c.x, c.y, 0.6) },
      '64%': { opacity: 1, transform: pt(c.x, c.y) },
      '65.5%': { opacity: 1, transform: pt(c.x, c.y, 0.82) },
      '67%': { opacity: 1, transform: pt(c.x, c.y) },
      '68%, 100%': { opacity: 0, transform: pt(c.x, c.y) },
    },
    [`@keyframes rippleC-${id}`]: rippleAt(c.x, c.y, 65.5),
  };
}

const anim = (name: string, timing = 'ease-in-out') => `${name} ${LOOP}ms ${timing} infinite`;

function Ripple({ name, size }: { name: string; size: number }) {
  return (
    <Box
      className="demo-anim demo-pointer"
      sx={{ position: 'absolute', top: 0, left: 0, width: `${size}cqw`, height: `${size}cqw`, m: `${-size / 2}cqw`, borderRadius: '50%', bgcolor: 'rgba(47,122,99,0.16)', border: '2px solid rgba(47,122,99,0.5)', opacity: 0, zIndex: 4, animation: anim(name, 'ease-out') }}
    />
  );
}

/**
 * The stage (the developer's choice, after the Stitch "Mac & Fanned Phones" screen), playing
 * screenshots of the real portal: the MacBook plays first with the phone waiting behind it (the
 * mouse opens a page, scrolls, opens another); then the MacBook swings back and blurs, the phone
 * comes forward (a finger swipes and taps a link that opens), and two more phones fan out from
 * behind it with other pages of the same role. Everything restarts when the role changes (the key).
 */
function Devices({ role, onLoop }: { role: Role; onLoop: () => void }) {
  const { locale = 'en' } = useRouter();
  const lang: ShotLocale = locale in PORTAL_SHOTS ? (locale as ShotLocale) : 'en';
  const shots = PORTAL_SHOTS[lang][role];
  const id = `${lang}-${role}`;
  const actor = (name: string, base: object) => ({ position: 'absolute', ...base, animation: anim(name, 'cubic-bezier(0.65, 0, 0.35, 1)') });
  const src = (name: string, bar = false) => shotSrc(lang, role, name, bar);
  return (
    <Reveal aria-hidden sx={{ position: 'relative', width: '100%', maxWidth: 680, mx: 'auto', aspectRatio: '100 / 80' }}>
      <Box key={id} sx={{ ...demoScript(id, shots), position: 'absolute', inset: 0, perspective: '1800px' }}>
        <Box className="demo-anim" sx={actor('demoMacStage', { left: '6%', top: '17%', width: '88%', transformOrigin: '50% 50%', ...MAC_FRONT })}>
          <MacBook>
            {[1, 2, 3].map((n) => (
              <WebPage key={n} src={src(`web${n}`)} scroll={`web${n}Scroll-${id}`} fade={`demoWeb${n}`} hidden={n > 1} />
            ))}
            <Ripple name={`rippleA-${id}`} size={6} />
            <Ripple name={`rippleB-${id}`} size={6} />
            {/* The mouse pointer: its tip is the transform origin, so a click shrinks it towards the tip */}
            <Box className="demo-anim demo-pointer" sx={{ position: 'absolute', top: 0, left: 0, width: '2.4cqw', zIndex: 5, transformOrigin: '0 0', opacity: 0, filter: 'drop-shadow(0 0.3cqw 0.5cqw rgba(0,0,0,0.3))', animation: anim(`cursor-${id}`, 'cubic-bezier(0.45, 0, 0.25, 1)') }}>
              <svg viewBox="0 0 16 22" width="100%" style={{ display: 'block' }}>
                <path d="M1 1 L1 17 L5 13.5 L8 20.5 L11 19 L8 12 L13.5 12 Z" fill="#111" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </Box>
          </MacBook>
        </Box>
        {([0, 1] as const).map((i) => (
          <Box key={i} className="demo-anim" sx={actor(i === 0 ? 'demoSideL' : 'demoSideR', { left: '38%', top: '6%', width: '24%', zIndex: 1, ...SIDE_HIDDEN })}>
            <IPhone>
              <PhonePage src={src(`side${i + 1}`)} bar={shots.sides[i].bar ? src(`side${i + 1}`, true) : null} barRatio={shots.sides[i].bar} scroll={`side${i + 1}Scroll-${id}`} />
            </IPhone>
          </Box>
        ))}
        <Box className="demo-anim" sx={actor('demoPhoneStage', { left: '35.5%', top: '2%', width: '29%', ...PHONE_BACK })}>
          <IPhone>
            {/* The phone's home page is the clock of the whole showcase: after each loop the next role may start */}
            <PhonePage src={src('phone1')} bar={shots.phone[0].bar ? src('phone1', true) : null} barRatio={shots.phone[0].bar} scroll={`phone1Scroll-${id}`} fade="demoPhone1" onLoop={onLoop} />
            <PhonePage src={src('phone2')} bar={shots.phone[1].bar ? src('phone2', true) : null} barRatio={shots.phone[1].bar} scroll={`phone2Scroll-${id}`} fade="demoPhone2" hidden />
            {/* Veiled while it waits for its turn */}
            <Box className="demo-anim" sx={{ position: 'absolute', inset: 0, zIndex: 6, bgcolor: '#F4F6F3', opacity: 0, animation: anim('demoPhoneVeil') }} />
            <Ripple name={`rippleC-${id}`} size={18} />
            {/* The finger: a soft round touch mark */}
            <Box
              className="demo-anim demo-pointer"
              sx={{ position: 'absolute', top: 0, left: 0, width: '12cqw', height: '12cqw', m: '-6cqw', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.6)', border: '0.7cqw solid rgba(17,24,39,0.22)', boxShadow: '0 1cqw 3cqw rgba(17,24,39,0.25)', opacity: 0, zIndex: 5, animation: anim(`touch-${id}`) }}
            />
          </IPhone>
        </Box>
      </Box>
    </Reveal>
  );
}

/** The portal's fixed chrome on the 1440 px wide shots: the left menu (256 px) and the top bar (64 px), in % of the screen */
const MENU_W = (256 / 1440) * 100;
const TOP_H = (64 / 1440 / (MAC_H / 100)) * 100;

/**
 * One page on the MacBook: the screenshot scrolls, while a still copy of its top-left corner,
 * clipped to the left menu and the top bar, stays in place like the real portal's fixed chrome.
 * `fade` crossfades it with the other pages.
 */
function WebPage({ src, scroll, fade, hidden }: { src: string; scroll: string; fade: string; hidden?: boolean }) {
  return (
    <Box className="demo-anim" sx={{ position: 'absolute', inset: 0, opacity: hidden ? 0 : 1, animation: anim(fade, 'linear') }}>
      <Box component="img" src={src} alt="" decoding="async" className="demo-anim" sx={{ width: '100%', display: 'block', animation: anim(scroll) }} />
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `polygon(0 0, 100% 0, 100% ${TOP_H}%, ${MENU_W}% ${TOP_H}%, ${MENU_W}% 100%, 0 100%)`, boxShadow: 'none' }}>
        <Box component="img" src={src} alt="" decoding="async" sx={{ width: '100%', display: 'block' }} />
      </Box>
    </Box>
  );
}

/**
 * One page on the phone: the screenshot below the status bar, scrolling, with the bottom bar
 * (cut out of the same page) fixed at the screen's bottom. `fade` crossfades it with the next page.
 */
function PhonePage({ src, bar, barRatio, scroll, fade, hidden, onLoop }: { src: string; bar: string | null; barRatio: number | null; scroll: string; fade?: string; hidden?: boolean; onLoop?: () => void }) {
  const onIteration = (e: AnimationEvent) => {
    if (onLoop && e.target === e.currentTarget && e.animationName === fade) onLoop();
  };
  return (
    <Box className="demo-anim" onAnimationIteration={onIteration} sx={{ position: 'absolute', inset: 0, opacity: hidden ? 0 : 1, animation: fade ? anim(fade, 'linear') : 'none' }}>
      <Box sx={{ position: 'absolute', top: `${STATUS}cqw`, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <Box component="img" src={src} alt="" decoding="async" className="demo-anim" sx={{ width: '100%', display: 'block', animation: anim(scroll) }} />
      </Box>
      {bar && barRatio && <Box component="img" src={bar} alt="" decoding="async" sx={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${barRatio * 100}cqw`, display: 'block', zIndex: 1 }} />}
    </Box>
  );
}

/** A MacBook Pro display (no keyboard deck, the developer's choice): aluminium rim, black glass with the notch, the hinge */
function MacBook({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ containerType: 'inline-size' }}>
      <Box sx={{ position: 'relative', p: '0.45cqw', borderRadius: '3cqw 3cqw 1.4cqw 1.4cqw', background: 'linear-gradient(180deg, #E1E4E7 0%, #AEB3B8 55%, #CDD1D5 100%)', boxShadow: '0 60px 90px -45px rgba(17,24,39,0.55), 0 0 0 0.12cqw rgba(0,0,0,0.2)' }}>
        <Box sx={{ position: 'relative', p: '1.5cqw 1.5cqw 2.2cqw', bgcolor: '#0B0C0E', borderRadius: '2.6cqw 2.6cqw 1cqw 1cqw' }}>
          {/* The notch with the camera */}
          <Box sx={{ position: 'absolute', top: '1.5cqw', left: '50%', width: '9cqw', ml: '-4.5cqw', height: '1.5cqw', bgcolor: '#0B0C0E', borderRadius: '0 0 0.9cqw 0.9cqw', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '0.6cqw', height: '0.6cqw', borderRadius: '50%', bgcolor: '#1B2530', boxShadow: 'inset 0 0 0 0.12cqw #2D3A47' }} />
          </Box>
          {/* The screen is its own container: the pages and the pointer are sized in its widths */}
          <Box sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', containerType: 'inline-size', aspectRatio: `100 / ${MAC_H}`, bgcolor: '#F4F6F3', borderRadius: '1cqw 1cqw 0.3cqw 0.3cqw' }}>{children}</Box>
          {/* A soft reflection on the glass */}
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', background: 'linear-gradient(118deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 32%)' }} />
        </Box>
      </Box>
      {/* The hinge */}
      <Box sx={{ mx: '2cqw', height: '1.3cqw', borderRadius: '0 0 1.2cqw 1.2cqw', background: 'linear-gradient(180deg, #23262A 0%, #555A60 55%, #8C9196 100%)' }} />
    </Box>
  );
}

/** The side buttons of the iPhone 17 Pro: action button and volume on the left, power and Camera Control on the right */
const IPHONE_BUTTONS: { side: 'left' | 'right'; top: number; h: number }[] = [
  { side: 'left', top: 20, h: 7 },
  { side: 'left', top: 32, h: 12 },
  { side: 'left', top: 47, h: 12 },
  { side: 'right', top: 35, h: 19 },
  { side: 'right', top: 68, h: 9 },
];

/**
 * An iPhone 17 Pro (silver): an aluminium frame with its side buttons, thin even black borders, the
 * Dynamic Island and the status bar in the portal's header green. The screen is its own size
 * container, so the pages and the finger are sized in its widths.
 */
function IPhone({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ containerType: 'inline-size', position: 'relative' }}>
      {IPHONE_BUTTONS.map((b) => (
        <Box key={`${b.side}${b.top}`} sx={{ position: 'absolute', [b.side]: '-0.8cqw', top: `${b.top}cqw`, width: '1.6cqw', height: `${b.h}cqw`, borderRadius: '0.8cqw', background: 'linear-gradient(90deg, #9EA3A9, #D7DADE, #9EA3A9)' }} />
      ))}
      <Box sx={{ position: 'relative', p: '1cqw', borderRadius: '16.5cqw', background: 'linear-gradient(140deg, #F1F2F4 0%, #B9BEC4 28%, #E4E6E9 52%, #A3A8AE 78%, #D6D9DD 100%)', boxShadow: '0 50px 80px -36px rgba(17,24,39,0.55), inset 0 0 0 0.25cqw rgba(255,255,255,0.6)' }}>
        <Box sx={{ p: '2.3cqw', bgcolor: '#050506', borderRadius: '15.5cqw' }}>
          <Box sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', containerType: 'inline-size', aspectRatio: '9 / 19.5', borderRadius: '13.2cqw', bgcolor: '#F4F6F3' }}>
            {children}
            {/* Status bar and the Dynamic Island */}
            <Stack direction="row" sx={{ position: 'absolute', top: 0, insetInline: 0, height: `${STATUS}cqw`, px: '8cqw', alignItems: 'center', justifyContent: 'space-between', bgcolor: PORTAL_HEADER, color: '#fff', zIndex: 7 }}>
              <Typography sx={{ fontSize: '4.2cqw', fontWeight: 700, color: 'inherit' }}>9:41</Typography>
              <Box sx={{ width: '6.5cqw', height: '3.2cqw', borderRadius: '1cqw', border: '0.35cqw solid currentColor', p: '0.4cqw' }}>
                <Box sx={{ width: '75%', height: '100%', borderRadius: '0.4cqw', bgcolor: 'currentColor' }} />
              </Box>
            </Stack>
            <Box sx={{ position: 'absolute', top: '2.6cqw', left: '50%', width: '29cqw', ml: '-14.5cqw', height: '8.2cqw', borderRadius: '5cqw', bgcolor: '#050506', zIndex: 8 }} />
            {/* The home indicator */}
            <Box sx={{ position: 'absolute', bottom: '1.6cqw', left: '50%', width: '34cqw', ml: '-17cqw', height: '1.2cqw', borderRadius: '1cqw', bgcolor: '#171D1A', zIndex: 8 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ───────────────────────── Partners ─────────────────────────

/** The developer's choice: the foreign partners Thompson International School shows, with their logos */
const PARTNERS = [
  { name: 'British Council', logo: '/site/partners/british-council.webp' },
  { name: 'IDP IELTS', logo: '/site/partners/idp-ielts.webp' },
  { name: 'College Board', logo: '/site/partners/college-board.webp' },
];

/**
 * "Our partners" (the developer's reference: Thompson's "С кем мы сотрудничаем"): logo cards gliding
 * in one row, faded at the edges, paused under the mouse. Reduced motion: the logos stand still in a
 * centred row.
 */
export function SitePartners() {
  const { t } = useTranslation('site');
  // Enough copies to be wider than any screen; the loop moves by exactly half of them
  const loop = [...PARTNERS, ...PARTNERS, ...PARTNERS, ...PARTNERS];
  return (
    <Box component="section" id="partners" aria-labelledby="partners-title" sx={{ py: { xs: 6, md: 8 }, overflow: 'hidden' }}>
      <Reveal sx={{ ...containerSx, textAlign: 'center', mb: 4 }}>
        <Typography sx={{ ...eyebrowSx, fontWeight: 700, letterSpacing: '0.05em', mb: 1 }}>{t('partners.eyebrow')}</Typography>
        <Typography component="h2" id="partners-title" sx={{ ...sectionTitleSx, fontWeight: 800, color: SITE.ink }}>
          {t('partners.title')}
        </Typography>
      </Reveal>
      <Box sx={{ display: 'flex', maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', '&:hover .track': { animationPlayState: 'paused' } }}>
        <Box
          className="track"
          sx={{
            display: 'flex',
            gap: 2.5,
            pr: 2.5,
            flexShrink: 0,
            '@keyframes partnersMove': { to: { transform: 'translateX(-50%)' } },
            animation: 'partnersMove 32s linear infinite',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', mx: 'auto', '& > :nth-of-type(n+4)': { display: 'none' } },
          }}
        >
          {loop.map((p, i) => (
            <Box key={i} aria-hidden={i >= PARTNERS.length} sx={{ width: { xs: 200, md: 240 }, height: { xs: 88, md: 104 }, px: 3.5, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px', bgcolor: '#fff', border: `1px solid ${SITE.cardBorder}`, flexShrink: 0 }}>
              <Box component="img" src={p.logo} alt={i < PARTNERS.length ? p.name : ''} loading="lazy" sx={{ maxWidth: '100%', maxHeight: '70%', objectFit: 'contain' }} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
