import { useSyncExternalStore } from 'react';

/** Whether the page has been scrolled down more than `px`, kept up to date. */
export function useScrolledPast(px: number): boolean {
  return useSyncExternalStore(
    notify => {
      addEventListener('scroll', notify, { passive: true });
      return () => removeEventListener('scroll', notify);
    },
    () => scrollY > px,
    () => false,
  );
}
