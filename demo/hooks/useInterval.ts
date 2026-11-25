import { useEffect } from 'react';
import { useLatest } from './useLatest';

/** Call `callback` every `delay` ms; pass `null` to pause. Always calls the latest callback. */
export function useInterval(callback: () => void, delay: number | null) {
  const saved = useLatest(callback);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay, saved]);
}
