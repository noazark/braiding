import { useCallback, useState } from 'react';

/**
 * Like `useState`, but remembered between visits in localStorage. Values that fail `valid` (or
 * storage that isn't available) fall back to `initial`.
 */
export function usePersistentState(key: string, initial: number, valid: (v: number) => boolean = Number.isFinite) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const v = raw == null ? NaN : Number(raw);
      return raw != null && valid(v) ? v : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: number) => {
      setValue(v);
      try {
        localStorage.setItem(key, String(v));
      } catch {
        /* storage may be unavailable */
      }
    },
    [key],
  );
  return [value, set] as const;
}
