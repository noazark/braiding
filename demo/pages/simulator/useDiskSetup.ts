import { useCallback, useEffect, useState } from 'react';
import { presets } from 'kumihimo';
import { fromLink, fromPreset, scaleSetup, snapSlots, type DiskSetup } from '../../lib/diskSetup';
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
  /**
   * The setup as it was before the slot count started changing. Every new size is scaled from this,
   * so stepping down and back up again returns the original instead of piling up rounding. Any other
   * change to the threads or moves drops it.
   */
  readonly base?: DiskSetup;
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
        base: undefined,
      })),
    [],
  );

  /**
   * Change the number of slots (3–64, and never fewer than the threads on the disk). The braid scales
   * with the disk: exactly when it can stay the same braid, otherwise to the nearest slots
   * ({@link scaleSetup}). Sizes it would break on are skipped ({@link snapSlots}). Each size is scaled
   * from the setup before the size started changing.
   */
  const setSlots = useCallback((n: number) => {
    setLoaded(l => {
      const base = l.base ?? l.setup;
      // skip sizes the braid would break on: from 32, a step down lands on 28 for Kongō Gumi
      const slots = snapSlots(base, l.setup.slots, n || l.setup.slots, Math.max(3, l.setup.threads.length), 64);
      if (slots === l.setup.slots) return l;
      const scaled = scaleSetup(base, slots);
      // colors as they are now (shuffled since, say), not as they were in the base
      const setup = { ...scaled, threads: scaled.threads.map((t, i) => ({ ...t, color: l.setup.threads[i]?.color ?? t.color })) };
      // a draft being written that differs from what's applied stays as it is
      const draft = l.draft === l.setup.pattern ? setup.pattern : l.draft;
      return { setup, draft, preset: CUSTOM, base };
    });
  }, []);

  /** Apply a hand edit; color-only edits keep the preset. */
  const edit = useCallback((e: Edit) => {
    setLoaded(l => ({
      ...l,
      setup: { ...l.setup, threads: e.threads },
      preset: e.colorOnly ? l.preset : CUSTOM,
      // recoloring keeps the base (colors are taken as they are when scaling); anything else drops it
      base: e.colorOnly ? l.base : undefined,
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
