/**
 * The disk setup: everything needed to braid on a disk (slots, threads with their colors, and the
 * pattern), and every way the demo gets one in or out. See GLOSSARY.md.
 *
 * A thread's position in `threads` is its id everywhere else (the engine's analysis, the drawing), so
 * nothing here reorders threads. Pure functions, plus a cache of runs.
 */
import { Timeline, parsePattern, type NotationError, type Pattern, type Preset } from 'kumihimo';
import { PALETTE } from './palette';
import { PRESET_COLORS } from './presetColors';

/** One thread: the slot it starts in (0-based) and its CSS color. */
export interface DiskThread {
  readonly slot: number;
  readonly color: string;
}

export interface DiskSetup {
  /** Number of slots on the disk. */
  readonly slots: number;
  /** The threads, in a fixed order: a thread's position is its id. */
  readonly threads: readonly DiskThread[];
  /** The moves to repeat forever, in notation. */
  readonly pattern: string;
}

/** The color of a palette entry; out-of-range indices fall back to the first. */
export const paletteColor = (i: number): string => PALETTE[i] ?? PALETTE[0];

/** A palette color's index, or -1 if the color isn't one of the palette's. */
export const paletteIndex = (color: string): number => PALETTE.indexOf(color.toLowerCase() as (typeof PALETTE)[number]);

/**
 * A preset as a disk setup, in its default colors (see presetColors.ts). A preset without a
 * coloring there gets the first palette color on every thread.
 */
export const fromPreset = (p: Preset): DiskSetup => ({
  slots: p.slots,
  threads: p.threads.map((slot, i) => ({
    slot,
    color: paletteColor(PRESET_COLORS[p.id]?.[i] ?? 0),
  })),
  pattern: p.pattern,
});

// ---- links ----------------------------------------------------------------------------------------
// A disk setup travels in a URL's hash (after `#`), so it never reaches a server and works on a static
// site:  simulator/#slots=12&threads=1,2,3,4&colors=0,5,e4572e,5&moves=1*2+3*4
// `threads` are slot numbers as written on the disk (1-based); `colors` has one entry per thread, a
// palette index (shorter) or a hex color without the `#`.

const HEX = /^[0-9a-f]{6}$/i;

/** The link hash for a setup, without the leading `#`. */
export function toLink(s: DiskSetup): string {
  const p = new URLSearchParams();
  p.set('slots', String(s.slots));
  p.set('threads', s.threads.map(t => t.slot + 1).join(','));
  p.set('colors', s.threads.map(t => (paletteIndex(t.color) >= 0 ? String(paletteIndex(t.color)) : t.color.replace(/^#/, '').toLowerCase())).join(','));
  p.set('moves', s.pattern);
  return p.toString();
}

/**
 * A setup from a link hash (with or without the `#`), or null if there isn't a usable one. Bad colors
 * fall back to the first palette color; threads outside the disk or doubled up are dropped.
 */
export function fromLink(hash: string): DiskSetup | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const slots = Number(p.get('slots'));
  const pattern = p.get('moves');
  if (!Number.isInteger(slots) || slots < 3 || slots > 64 || pattern == null) return null;
  const colors = (p.get('colors') ?? '').split(',');
  const seen = new Set<number>();
  const threads = (p.get('threads') ?? '')
    .split(',')
    .filter(Boolean)
    .flatMap((t, i) => {
      const slot = Number(t) - 1;
      if (!Number.isInteger(slot) || slot < 0 || slot >= slots || seen.has(slot)) return [];
      seen.add(slot);
      const c = colors[i] ?? '';
      const color = /^\d+$/.test(c) && Number(c) < PALETTE.length ? paletteColor(Number(c)) : HEX.test(c) ? '#' + c.toLowerCase() : paletteColor(0);
      return [{ slot, color }];
    });
  return { slots, threads, pattern };
}

/** The setup as text, for copying: slots, which slots hold threads (1-based), and the moves. */
export const describe = (s: DiskSetup): string => `Slots: ${s.slots}\nThreads in slots: ${s.threads.map(t => t.slot + 1).join(', ')}\nMoves: ${s.pattern}`;

// ---- runs -----------------------------------------------------------------------------------------

/** A disk setup being played. */
export interface Run {
  /** One step per move, extended on demand. */
  readonly timeline: Timeline;
  /** The parsed pattern: empty if it couldn't be read. */
  readonly pattern: Pattern;
  /** Why the pattern couldn't be read, if it couldn't. The disk then runs with no moves. */
  readonly error: NotationError | null;
}

const runs = new WeakMap<DiskSetup, Run>();

/**
 * The setup's run. Made once per setup object and shared by everything that plays or draws it, so a
 * run's steps are worked out once. Unreadable notation gives a run with no moves, plus the error.
 */
export function runOf(s: DiskSetup): Run {
  let run = runs.get(s);
  if (!run) {
    const parsed = parsePattern(s.pattern, s.slots);
    const pattern = parsed.ok ? parsed.pattern : [];
    run = {
      timeline: new Timeline({
        slots: s.slots,
        threads: s.threads.map(t => t.slot),
        pattern,
      }),
      pattern,
      error: parsed.ok ? null : parsed.error,
    };
    runs.set(s, run);
  }
  return run;
}
