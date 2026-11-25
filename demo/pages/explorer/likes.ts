/**
 * Which braids you've liked, kept in this browser's localStorage by signature (so a like follows
 * the braid, whatever its colors). Pure parse and serialize, plus a hook.
 */
import { useCallback, useState } from 'react';

const KEY = 'braid-explorer:likes:v1';

/** Stored text into a set of signatures, ignoring anything that isn't a list of strings. */
export function parseLikes(text: string | null): Set<string> {
  if (!text) return new Set();
  try {
    const data: unknown = JSON.parse(text);
    return new Set(Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export const serializeLikes = (likes: ReadonlySet<string>): string => JSON.stringify([...likes]);

function load(): Set<string> {
  try {
    return parseLikes(localStorage.getItem(KEY));
  } catch {
    return new Set();
  }
}

function save(likes: ReadonlySet<string>) {
  try {
    localStorage.setItem(KEY, serializeLikes(likes));
  } catch {
    /* not saved this time */
  }
}

/** Your likes, and ways to change them. Every change is saved straight away. */
export function useLikes() {
  const [likes, setLikes] = useState<ReadonlySet<string>>(load);
  const update = useCallback((f: (s: Set<string>) => void) => {
    setLikes(prev => {
      const next = new Set(prev);
      f(next);
      save(next);
      return next;
    });
  }, []);
  /** Like (double-tap): only ever adds, like TikTok's. */
  const like = useCallback((key: string) => update(s => s.add(key)), [update]);
  /** The heart button: like or unlike. */
  const toggle = useCallback((key: string) => update(s => (s.has(key) ? s.delete(key) : s.add(key))), [update]);
  return { likes, like, toggle };
}
