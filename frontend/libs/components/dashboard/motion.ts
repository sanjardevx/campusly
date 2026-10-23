import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { keyframes } from '@mui/material/styles';

/**
 * Dashboard motion (ui-ux-pro-max rules): transform + opacity only, ease-out, 260 ms,
 * a 40 ms stagger between cards, nothing at all when the OS asks for reduced motion.
 */
const fadeUpKeyframes = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** sx for a card that enters in order: index 0, 1, 2 … */
export const fadeUp = (index: number) => ({
  animation: `${fadeUpKeyframes} 260ms ${EASE_OUT} both`,
  animationDelay: `${index * 40}ms`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)', { noSsr: true });

/** A number that counts up to `value` (from the old value when it changes); reduced motion: the value */
export function useCountUp(value: number, duration = 600): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  // The number on screen right now: a change of value continues from it
  const current = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const from = current.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic: fast start, gentle landing
      current.current = from + (value - from) * (1 - (1 - t) ** 3);
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return reduced ? value : shown;
}
