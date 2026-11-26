/**
 * The disk setup: everything needed to braid on a disk (slots, threads with their colors, and the
 * pattern), and every way the demo gets one in or out. See GLOSSARY.md.
 *
 * A thread's position in `threads` is its id everywhere else (the engine's analysis, the drawing), so
 * nothing here reorders threads. Pure functions, plus a cache of runs.
 */
import { Timeline, checkPattern, formatPattern, mod, parsePattern, problems, type NotationError, type Pattern, type Preset, type SlotRef, type Token } from 'kumihimo';
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

// ---- resizing -------------------------------------------------------------------------------------

/** How many moves {@link resizeSetup} plays to make sure the resized braid is the same braid. */
const PROOF_MOVES = 600;

/**
 * The same braid on a disk of `slots` slots, or null if it can't be moved there unchanged.
 *
 * Threads keep their places around the disk, spread out (or drawn in) in proportion; every slot number
 * in the moves is renumbered to match and disk turns are scaled. Growing spreads threads as evenly as
 * the slots allow. Shrinking works only when every slot in use lands exactly on a slot of the smaller
 * disk (16 → 8 with threads on odd slots, say). The result is played against the original, and refused
 * if any move would lift a different thread or carry it over different threads (a move always takes
 * the short way round, so respacing can turn one around; gap moves `E+3` count slots, so they rarely
 * survive spare slots). Unreadable moves can't be renumbered, so that setup can't be resized either.
 *
 * @example
 * resizeSetup(maruYotsuOn4, 8) // threads in slots 1, 3, 5, 7; moves "3*1 7*5 R2 1*3 5*7 R2"
 */
export function resizeSetup(s: DiskSetup, slots: number): DiskSetup | null {
  const N = s.slots;
  const M = slots;
  if (M === N) return s;
  const place = (i: number): number | null => {
    const x = (i * M) / N;
    if (M > N) return Math.floor(x);
    return Number.isInteger(x) ? x : null;
  };
  const threads: number[] = [];
  for (const t of s.threads) {
    const p = place(t.slot);
    if (p == null) return null;
    threads.push(p);
  }
  const moved = (pattern: string): DiskSetup => ({ slots: M, threads: s.threads.map((t, i) => ({ ...t, slot: threads[i]! })), pattern });
  if (!s.pattern.trim()) return moved(s.pattern);

  const parsed = parsePattern(s.pattern, N);
  if (!parsed.ok) return null;
  const ref = (r: SlotRef): SlotRef | null => {
    if (r.kind === 'gap') return r;
    const p = place(r.index);
    return p == null ? null : { kind: 'slot', index: p };
  };
  const tokens: Token[] = [];
  for (const t of parsed.pattern) {
    if (t.kind === 'turn') {
      const by = (t.by * M) / N;
      if (!Number.isInteger(by)) return null;
      tokens.push({ ...t, by });
      continue;
    }
    const from = ref(t.from);
    const to = ref(t.to);
    if (!from || !to) return null;
    tokens.push({ ...t, from, to });
  }

  // play both and compare, move by move
  const a = new Timeline({ slots: N, threads: s.threads.map(t => t.slot), pattern: parsed.pattern }).extend(PROOF_MOVES);
  const b = new Timeline({ slots: M, threads, pattern: tokens }).extend(PROOF_MOVES);
  if (a.last !== b.last || a.halt?.reason !== b.halt?.reason) return null;
  const sorted = (xs: readonly number[]) => [...xs].sort((x, y) => x - y).join(',');
  const same = a.steps.every((sa, i) => {
    const sb = b.steps[i]!;
    if (sa.positions.some((p, t) => place(p) !== sb.positions[t]) || sa.columns.some((c, t) => c !== sb.columns[t])) return false;
    const ma = sa.move;
    const mb = sb.move;
    if (!ma || !mb) return ma === mb;
    return ma.thread === mb.thread && ma.partner === mb.partner && ma.stacked === mb.stacked && sorted(ma.passed) === sorted(mb.passed);
  });
  return same ? moved(formatPattern(tokens)) : null;
}

/**
 * The setup on a disk of `slots` slots, always. The same braid when {@link resizeSetup} can manage it;
 * otherwise the nearest thing: threads to the nearest free slots (in the same order round the disk),
 * every slot number in the moves to its nearest slot, and turns rounded (never to zero). That may
 * braid differently, but the moves always fit the disk. Unreadable moves are left as written.
 * Needs a slot per thread: threads past `slots` come off.
 */
export function scaleSetup(s: DiskSetup, slots: number): DiskSetup {
  const exact = resizeSetup(s, slots);
  if (exact) return exact;
  const N = s.slots;
  const M = slots;
  const near = (i: number) => mod(Math.round((i * M) / N), M);

  // threads in disk order, each at its nearest slot, nudged along so no two share one
  const kept = s.threads.slice(0, M);
  const order = kept.map((_, i) => i).sort((a, b) => kept[a]!.slot - kept[b]!.slot);
  const at = order.map(i => Math.round((kept[i]!.slot * M) / N));
  for (let k = 0; k < at.length; k++) at[k] = Math.max(at[k]!, k ? at[k - 1]! + 1 : 0);
  for (let k = at.length - 1; k >= 0; k--) at[k] = Math.min(at[k]!, k === at.length - 1 ? M - 1 : at[k + 1]! - 1);
  const slotOf = new Map<number, number>();
  const threads = kept.slice();
  order.forEach((i, k) => {
    slotOf.set(kept[i]!.slot, at[k]!);
    threads[i] = { ...kept[i]!, slot: at[k]! };
  });

  const parsed = s.pattern.trim() ? parsePattern(s.pattern, N) : null;
  if (!parsed?.ok) return { slots: M, threads, pattern: s.pattern };
  const ref = (r: SlotRef): SlotRef => (r.kind === 'gap' ? r : { kind: 'slot', index: slotOf.get(r.index) ?? near(r.index) });
  const tokens = parsed.pattern.map((t): Token => {
    if (t.kind !== 'turn') return { ...t, from: ref(t.from), to: ref(t.to) };
    return { ...t, by: Math.round((t.by * M) / N) || Math.sign(t.by) };
  });
  return { slots: M, threads, pattern: formatPattern(tokens) };
}

/** The codes of a setup's errors and warnings. */
const problemCodes = (s: DiskSetup): Set<string> => new Set(problems(checkPattern(runOf(s).timeline)).map(f => f.code));

/**
 * Whether `base` still braids when scaled to `slots` slots ({@link scaleSetup}): scaling it exactly
 * always does; scaling it to the nearest slots does if the check finds no problem the original didn't
 * have. Kongō Gumi on 32 slots, for one, scales to 28 or 36 but halts on 29.
 */
export function scalesTo(base: DiskSetup, slots: number): boolean {
  if (slots === base.slots || resizeSetup(base, slots)) return true;
  if (!base.pattern.trim() || runOf(base).error) return true;
  const before = problemCodes(base);
  return [...problemCodes(scaleSetup(base, slots))].every(c => before.has(c));
}

/**
 * The disk size to use when someone asks for `wanted` slots, moving from `current`: `wanted` if the
 * braid scales there ({@link scalesTo}), else the next size that works past it in the same direction,
 * else the nearest that works on the other side. Never outside `min`–`max`.
 */
export function snapSlots(base: DiskSetup, current: number, wanted: number, min: number, max: number): number {
  const n = Math.max(min, Math.min(max, wanted));
  const ok = (k: number) => scalesTo(base, k);
  const down = n < current;
  for (let k = n; down ? k >= min : k <= max; k += down ? -1 : 1) if (ok(k)) return k;
  for (let k = n; down ? k <= max : k >= min; k += down ? 1 : -1) if (ok(k)) return k;
  return current;
}

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
 * run's steps are worked out once. Unreadable notation gives a run with no moves, plus the error;
 * blank notation is just an empty pattern (no moves, no error).
 */
export function runOf(s: DiskSetup): Run {
  let run = runs.get(s);
  if (!run) {
    const parsed = s.pattern.trim() ? parsePattern(s.pattern, s.slots) : null;
    const pattern = parsed?.ok ? parsed.pattern : [];
    run = {
      timeline: new Timeline({
        slots: s.slots,
        threads: s.threads.map(t => t.slot),
        pattern,
      }),
      pattern,
      error: parsed && !parsed.ok ? parsed.error : null,
    };
    runs.set(s, run);
  }
  return run;
}
