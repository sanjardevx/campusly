import { useEffect, useRef, type ReactNode } from 'react';
import { Box, type BoxProps, GlobalStyles } from '@mui/material';
import Lenis from 'lenis';

/**
 * Motion of the public website (day 20; references: thompsoninternationalschool.uz, jahonschool.uz).
 * Rules (emil-design-eng): only transform and opacity, a strong ease-out, longer for marketing
 * reveals, short for hovers; hover only with a real pointer; nothing moves when the OS asks for
 * reduced motion. Everything starts after hydration, so a page without JS shows all content.
 */

/** Strong ease-out: fast start, long gentle landing */
export const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const REDUCED = '(prefers-reduced-motion: reduce)';
/** Hover only with a mouse, and only when motion is welcome */
export const HOVER = '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia(REDUCED).matches;

// ───────────────────────── smooth scroll ─────────────────────────

let lenis: Lenis | null = null;
/** Room for the fixed top bar (SiteNavbar) above a section we scroll to */
const BAR_OFFSET = -88;

/** Scroll to a section: through Lenis when it runs (one smooth motion), natively otherwise */
export function scrollToElement(el: HTMLElement) {
  if (lenis) lenis.scrollTo(el, { offset: BAR_OFFSET });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + BAR_OFFSET, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/** Back to the top of the page (the logo in the top bar) */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/**
 * Lenis smooth scroll for the home page (the Thompson feel: the wheel glides instead of jumping).
 * Dialogs and menus keep their own native scroll. Off with reduced motion; removed on leaving.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return;
    lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: BAR_OFFSET },
      lerp: 0.1,
      prevent: (node) => !!node.closest('.MuiModal-root, .MuiPopover-root, .MuiMenu-root'),
    });
    return () => {
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  // The rules of lenis/dist/lenis.css (Pages Router imports global CSS only in _app)
  return (
    <GlobalStyles
      styles={{
        'html.lenis, html.lenis body': { height: 'auto' },
        '.lenis:not(.lenis-autoToggle).lenis-stopped': { overflow: 'clip' },
        '.lenis [data-lenis-prevent]': { overscrollBehavior: 'contain' },
        '.lenis.lenis-smooth iframe': { pointerEvents: 'none' },
        '.motion-ok [data-tw-full]': {
          visibility: 'hidden',
          animation: 'motionShow 0s 4s forwards',
        },
        '.motion-ok [data-count]:not([data-counting])': {
          opacity: 0,
          animation: 'motionFade 0s 3s forwards',
        },
        '@keyframes motionShow': { to: { visibility: 'visible' } },
        '@keyframes motionFade': { to: { opacity: 1 } },
      }}
    />
  );
}

// ───────────────────────── reveal on scroll ─────────────────────────

type From = 'up' | 'left' | 'right' | 'scale' | 'fade';
const HIDDEN: Record<From, string> = {
  up: 'translate3d(0, 28px, 0)',
  left: 'translate3d(-48px, 0, 0)',
  right: 'translate3d(48px, 0, 0)',
  scale: 'scale(0.6)',
  fade: 'none',
};

/**
 * Shows its content when it scrolls into view: from below, the left, the right, or growing.
 * Content that is already on screen when the page opens is not hidden (no flash); below the fold
 * it waits for the IntersectionObserver. State lives in a data attribute, not React state, so
 * revealing re-renders nothing. `delay` makes a stagger (keep it 50–80 ms per item).
 */
export function Reveal({
  from = 'up',
  delay = 0,
  children,
  sx,
  ...rest
}: Omit<BoxProps, 'ref'> & {
  from?: From;
  delay?: number;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.dataset.reveal = 'hidden';
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = 'shown';
        io.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Box
      ref={ref}
      {...rest}
      sx={[
        {
          '&[data-reveal="hidden"]': { opacity: 0, transform: HIDDEN[from] },
          '&[data-reveal="shown"]': {
            transition: `opacity 700ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms`,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

// ───────────────────────── hovers ─────────────────────────

/** A card that lifts a little under the mouse */
export const hoverLift = {
  transition: `transform 300ms ${EASE}, box-shadow 300ms ease`,
  [HOVER]: {
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 18px 36px -20px rgba(47,122,99,0.4)',
    },
  },
} as const;

/** The card's picture slowly grows while the card is hovered (the picture box needs overflow: hidden) */
export const hoverZoom = (selector = 'img') =>
  ({
    [`& ${selector}`]: { transition: `transform 900ms ${EASE}` },
    [HOVER]: { [`&:hover ${selector}`]: { transform: 'scale(1.05)' } },
  }) as const;

// ───────────────────────── numbers and the headline ─────────────────────────

/**
 * A number that counts up from 0 the first time it is on screen (the hero's numbers card). The
 * server renders the real number; the count starts after hydration.
 */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let frame = 0;
    const run = () => {
      el.dataset.counting = 'true';
      const start = performance.now();
      el.textContent = '0';
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(value * (1 - (1 - t) ** 4)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      run();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);
  return (
    <span ref={ref} data-count>
      {value}
    </span>
  );
}

/**
 * The hero headline types itself once, with a blinking caret. The full text stays in the layout
 * (invisible while typing), so nothing below it moves; screen readers read the whole headline at
 * once. Without JS, or with reduced motion, the headline is simply there.
 */
export function Typewriter({ text, speed = 34, startDelay = 250 }: { text: string; speed?: number; startDelay?: number }) {
  const full = useRef<HTMLSpanElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fullEl = full.current;
    const typedEl = typed.current;
    if (!fullEl || !typedEl || reducedMotion()) return;
    fullEl.style.visibility = 'hidden';
    typedEl.dataset.typing = 'true';
    let i = 0;
    let timer = window.setTimeout(function step() {
      i += 1;
      typedEl.firstChild!.textContent = text.slice(0, i);
      if (i < text.length) timer = window.setTimeout(step, speed);
      else {
        // Done: the real text comes back, the caret blinks a little longer and goes
        fullEl.style.visibility = 'visible';
        typedEl.firstChild!.textContent = '';
        timer = window.setTimeout(() => delete typedEl.dataset.typing, 1600);
      }
    }, startDelay);
    return () => {
      window.clearTimeout(timer);
      fullEl.style.visibility = 'visible';
      delete typedEl.dataset.typing;
    };
  }, [text, speed, startDelay]);
  return (
    <Box component="span" sx={{ position: 'relative', display: 'block' }}>
      <span ref={full} data-tw-full>
        {text}
      </span>
      <Box
        component="span"
        ref={typed}
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          '&::after': {
            content: '""',
            display: 'none',
            width: '3px',
            height: '0.95em',
            ml: '2px',
            verticalAlign: '-0.1em',
            bgcolor: 'currentColor',
            animation: 'caretBlink 1s steps(1) infinite',
          },
          '&[data-typing]::after': { display: 'inline-block' },
          '@keyframes caretBlink': { '50%': { opacity: 0 } },
        }}
      >
        <span />
      </Box>
    </Box>
  );
}

// ───────────────────────── a line drawn by scrolling ─────────────────────────

/**
 * A vertical line that grows with the scroll through its parent (the admission timeline): 0 when
 * the parent's top reaches 60 % of the screen, full when its bottom does. Written straight to the
 * element's transform on animation frames, so scrolling re-renders nothing. Elements inside the
 * parent marked `data-reach` get `data-reached` once the line has passed their middle (and lose it
 * when the visitor scrolls back up), so they can light up too. Reduced motion: full, all reached.
 */
export function useScrollDraw<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    const track = el?.parentElement;
    if (!el || !track) return;
    const marks = [...track.querySelectorAll<HTMLElement>('[data-reach]')];
    if (reducedMotion()) {
      marks.forEach((m) => (m.dataset.reached = 'true'));
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = track.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      el.style.transform = `scaleY(${progress})`;
      const lineEnd = r.top + progress * r.height;
      marks.forEach((m) => {
        const box = m.getBoundingClientRect();
        if (box.top + box.height / 2 <= lineEnd) m.dataset.reached = 'true';
        else delete m.dataset.reached;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}
