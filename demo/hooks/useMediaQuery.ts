import { useSyncExternalStore } from 'react';

/** Whether a CSS media query matches, kept up to date. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    notify => {
      const mq = matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

/** The user's reduced-motion preference. */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion:reduce)');
