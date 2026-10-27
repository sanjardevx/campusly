// Kept apart from motion.tsx so the server-only _document does not pull Lenis and MUI in.

const REDUCED = '(prefers-reduced-motion: reduce)';

/**
 * Runs in <head> before the first paint: marks <html> when motion is welcome, so the headline and
 * the numbers start hidden instead of flashing in full and then restarting. If the page's JS
 * never runs, the CSS fallback shows them after a few seconds anyway.
 */
export const MOTION_BOOT = `if(!matchMedia('${REDUCED}').matches)document.documentElement.classList.add('motion-ok')`;
