import { useCallback, useEffect, useState } from 'react';
import { presets } from 'kumihimo';
import { fromLink, fromPreset, type DiskSetup } from '../../lib/diskSetup';
import { PALETTE } from '../../lib/palette';
import type { Edit } from './model';

/** Preset index, or {@link CUSTOM} once the disk or pattern has been changed by hand. */
export const CUSTOM = -1;

interface Loaded {
  /** What plays: the disk as it is now, with the pattern last applied. */
  readonly setup: DiskSetup;
  /** The pattern being written, applied on request. */
  readonly draft: string;
  readonly preset: number;
}

const loadedFrom = (setup: DiskSetup, preset: number): Loaded => ({
  setup,
  draft: setup.pattern,
  preset,
});

/** What the page opens with: a setup shared in the link (from the explorer's Open), else the first preset. */
function initial(): Loaded {
  const shared = fromLink(location.hash);
  return shared ? loadedFrom(shared, CUSTOM) : loadedFrom(fromPreset(presets[0]!), 0);
}

/**
 * What's loaded on the disk: one disk setup (what plays), the pattern being written, and which preset
 * it is, if any. Starts on a setup shared in the link, or the first preset.
 */
export function useDiskSetup() {
  const [{ setup, draft, preset }, setLoaded] = useState(initial);

  // a new setup in the link while the page is open (say, another Open from the explorer) loads too
  useEffect(() => {
    const onHash = () => {
      const s = fromLink(location.hash);
      if (s) setLoaded(loadedFrom(s, CUSTOM));
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const loadPreset = useCallback((i: number) => {
    const p = presets[i];
    setLoaded(l => (p ? loadedFrom(fromPreset(p), i) : { ...l, preset: CUSTOM }));
  }, []);

  const setDraft = useCallback((draft: string) => setLoaded(l => ({ ...l, draft })), []);

  const apply = useCallback(
    () =>
      setLoaded(l => ({
        ...l,
        setup: { ...l.setup, pattern: l.draft },
        preset: CUSTOM,
      })),
    [],
  );

  /** Change the number of slots (3–64); threads past the end come off. */
  const setSlots = useCallback((n: number) => {
    const slots = Math.max(3, Math.min(64, n || 32));
    setLoaded(l => ({
      ...l,
      setup: {
        ...l.setup,
        slots,
        threads: l.setup.threads.filter(t => t.slot < slots),
      },
      preset: CUSTOM,
    }));
    return slots;
  }, []);

  /** Apply a hand edit; color-only edits keep the preset. */
  const edit = useCallback((e: Edit) => {
    setLoaded(l => ({
      ...l,
      setup: { ...l.setup, threads: e.threads },
      preset: e.colorOnly ? l.preset : CUSTOM,
    }));
  }, []);

  /** Random palette colors, never all the same. */
  const shuffle = useCallback(() => {
    setLoaded(l => {
      const ts = l.setup.threads;
      if (!ts.length) return l;
      let cs: string[];
      do cs = ts.map(() => PALETTE[Math.floor(Math.random() * PALETTE.length)]!);
      while (ts.length > 1 && new Set(cs).size < 2);
      return {
        ...l,
        setup: {
          ...l.setup,
          threads: ts.map((t, i) => ({ ...t, color: cs[i]! })),
        },
      };
    });
  }, []);

  /** Start over: no threads on the disk and no moves (the slots stay). */
  const reset = useCallback(
    () =>
      setLoaded(l => ({
        setup: { ...l.setup, threads: [], pattern: '' },
        draft: '',
        preset: CUSTOM,
      })),
    [],
  );

  return {
    setup,
    draft,
    setDraft,
    preset,
    loadPreset,
    apply,
    setSlots,
    edit,
    shuffle,
    reset,
  };
}
