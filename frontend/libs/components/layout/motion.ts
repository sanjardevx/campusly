import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { NavItem } from './nav';

/** Easing with a small overshoot, like the iOS / macOS selection lens */
export const SPRING = 'cubic-bezier(0.25, 1.25, 0.4, 1)';

/**
 * Index of the menu item to highlight. It follows a tap at once instead of waiting for the next
 * page to load (that felt like a hard jump); when the navigation ends or fails, the tap is
 * forgotten and the page on screen decides again.
 */
export function useTapFirstIndex(items: NavItem[], current: NavItem | undefined) {
  const router = useRouter();
  const [tapped, setTapped] = useState<number | null>(null);

  useEffect(() => {
    const forget = () => setTapped(null);
    router.events.on('routeChangeComplete', forget);
    router.events.on('routeChangeError', forget);
    return () => {
      router.events.off('routeChangeComplete', forget);
      router.events.off('routeChangeError', forget);
    };
  }, [router.events]);

  return { index: tapped ?? items.findIndex((i) => i === current), tap: setTapped };
}
