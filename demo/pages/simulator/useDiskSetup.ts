import { useCallback, useEffect, useRef, useState } from 'react';
import { presets } from 'kumihimo';
import { fromLink, fromPreset, type DiskSetup } from '../../lib/diskSetup';
import { resizeSetup, snapSlots } from '../../lib/diskSize';
import { MAX_SLOTS, loadDisk, onMyDisk, useMyDisk, type MyDisk } from '../../lib/myDisk';
import { colorway } from '../../lib/colorways';
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
   * The setup as it was loaded (a preset, a link), before it went on your disk or changed size. Every
   * new size is worked out from this, so changing size and back returns the original. Any other change
   * to the threads or moves drops it.
   */
  readonly base?: DiskSetup;
  /** False when the braid can't go on your disk, so it's shown on a disk of its own size instead. */
  readonly fits: boolean;
}

/** The presets as disk setups, made once, so whether each goes on a disk is worked out once too. */
const PRESETS = presets.map(fromPreset);

/** Whether preset `i` goes on your disk. */
export const presetFits = (i: number, disk: MyDisk): boolean => !!PRESETS[i] && onMyDisk(PRESETS[i], disk).fits;

/** Preset `i` if it goes on your disk, else the next one in the list that does (round to the start); -1 if none does. */
export function fittingPreset(i: number, disk: MyDisk): number {
  for (let k = 0; k < PRESETS.length; k++) {
    const j = (i + k) % PRESETS.length;
    if (presetFits(j, disk)) return j;
  }
  return -1;
}

/** A setup just loaded, moved onto your disk. */
const placed = (base: DiskSetup, preset: number, disk: MyDisk): Loaded => {
  const { setup, fits } = onMyDisk(base, disk);
  return { setup, draft: setup.pattern, preset, base, fits };
};

/** The same loaded braid on another disk size, keeping its colors as they are now and any draft being written. */
const moved = (l: Loaded, setup: DiskSetup, fits: boolean, base: DiskSetup): Loaded => ({
  setup: { ...setup, threads: setup.threads.map((t, i) => ({ ...t, color: l.setup.threads[i]?.color ?? t.color })) },
  draft: l.draft === l.setup.pattern ? setup.pattern : l.draft,
  preset: l.preset,
  base,
  fits,
});

/** What the page opens with: a setup shared in the link (from the explorer's Open), else the first preset. */
function initial(): Loaded {
  const disk = loadDisk();
  const shared = fromLink(location.hash);
  if (shared) return placed(shared, CUSTOM, disk);
  const i = Math.max(0, fittingPreset(0, disk));
  return placed(PRESETS[i]!, i, disk);
}

/**
 * What's loaded on the disk: one disk setup (what plays), the pattern being written, and which preset
 * it is, if any. Starts on a setup shared in the link, or the first preset. Everything loaded goes on
 * your disk (see myDisk.ts), and follows it when it changes.
 */
export function useDiskSetup() {
  const [disk] = useMyDisk();
  const [{ setup, draft, preset, fits }, setLoaded] = useState(initial);
  const diskNow = useRef(disk);
  diskNow.current = disk;

  // your disk changed (here or on another page): the braid moves onto the new one
  const lastDisk = useRef(disk);
  useEffect(() => {
    if (lastDisk.current === disk) return;
    lastDisk.current = disk;
    setLoaded(l => {
      // a preset that doesn't go on the new disk gives way to the next one in the list that does;
      // anything else stays, with a warning if it doesn't fit
      if (l.preset !== CUSTOM && !presetFits(l.preset, disk)) {
        const j = fittingPreset(l.preset, disk);
        if (j >= 0) return placed(PRESETS[j]!, j, disk);
      }
      const base = l.base ?? l.setup;
      const { setup, fits } = onMyDisk(base, disk);
      return moved(l, setup, fits, base);
    });
  }, [disk]);

  // a new setup in the link while the page is open (say, another Open from the explorer) loads too
  useEffect(() => {
    const onHash = () => {
      const s = fromLink(location.hash);
      if (s) setLoaded(placed(s, CUSTOM, diskNow.current));
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const loadPreset = useCallback((i: number) => {
    const p = presets[i];
    setLoaded(l => (p ? placed(PRESETS[i]!, i, diskNow.current) : { ...l, preset: CUSTOM }));
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
   * Change the number of slots, on any disk (3–32, never fewer than the threads on it). The braid moves
   * with it, the same braid; sizes it can't go on are skipped ({@link snapSlots}). Each size is worked
   * out from the setup as it was loaded.
   */
  const setSlots = useCallback((n: number) => {
    setLoaded(l => {
      const base = l.base ?? l.setup;
      const slots = snapSlots(base, l.setup.slots, n || l.setup.slots, Math.max(3, l.setup.threads.length), MAX_SLOTS);
      const next = slots === l.setup.slots ? null : resizeSetup(base, slots);
      return next ? moved(l, next, true, base) : l;
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

  /** New colors: a random colorway (solid, a single strand, pairs…), laid round the disk in slot order. */
  const shuffle = useCallback(() => {
    setLoaded(l => {
      const ts = l.setup.threads;
      if (!ts.length) return l;
      const { colors } = colorway(ts.length, Math.random);
      // round the disk from just past its widest empty stretch, so pairs and blocks match the groups threads sit in
      const sorted = ts.map((_, i) => i).sort((a, b) => ts[a]!.slot - ts[b]!.slot);
      const space = (k: number) => (ts[sorted[k]!]!.slot - ts[sorted[(k + sorted.length - 1) % sorted.length]!]!.slot + l.setup.slots) % l.setup.slots;
      let start = 0;
      for (let k = 1; k < sorted.length; k++) if (space(k) > space(start)) start = k;
      const ring = [...sorted.slice(start), ...sorted.slice(0, start)];
      const color = new Map(ring.map((i, k) => [i, colors[k]!]));
      return {
        ...l,
        setup: {
          ...l.setup,
          threads: ts.map((t, i) => ({ ...t, color: color.get(i)! })),
        },
      };
    });
  }, []);

  /** Start over: no threads and no moves, on your disk (or, on any disk, the size it is now). */
  const reset = useCallback(
    () =>
      setLoaded(l => ({
        setup: { slots: diskNow.current === 'any' ? l.setup.slots : diskNow.current, threads: [], pattern: '' },
        draft: '',
        preset: CUSTOM,
        fits: true,
      })),
    [],
  );

  return {
    setup,
    disk,
    fits,
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
