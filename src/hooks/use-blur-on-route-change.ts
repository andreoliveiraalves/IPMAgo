import { usePathname } from 'expo-router';
import { useEffect, useLayoutEffect } from 'react';
import { Platform } from 'react-native';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * React Navigation hides inactive screens with `aria-hidden` + `display: none` on web.
 * If the element that triggered the navigation still owns focus, Chrome blocks the
 * `aria-hidden` attribute and logs:
 *
 *   "Blocked aria-hidden on an element because its descendant retained focus."
 *
 * Timing is the whole fix: a layout effect runs in the same task as the DOM mutation
 * that hides the screen, ahead of the browser's accessibility check. A passive effect
 * lands a frame too late, after Chrome has already rejected the attribute.
 */
export function useBlurOnRouteChange() {
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
  }, [pathname]);
}
