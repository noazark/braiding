/**
 * Moving a braid onto a disk of another size: the same braid, threads spread round the new disk and
 * the moves renumbered to match.
 *
 * Scaling every slot number in proportion isn't enough. A move like Kongō Gumi's `1>15` drops a thread
 * just beside the pair opposite; on a disk half the size, "in proportion" can land it on that pair. So
 * each slot a move lands in and each disk turn gets a few nearby choices, and the first set of choices
 * that plays exactly the same braid wins: every move lifts the same thread, over the same threads, and
 * every strand ends up in the same place in the strand chart.
 */
import { braid, formatPattern, mod, parsePattern, usesGap, type Pattern, type SlotRef, type Step, type Token } from 'kumihimo';
import type { DiskSetup } from './diskSetup';

/** How many moves are played to make sure a resized braid is the same braid. */
const PROOF_MOVES = 600;
/** The most sets of choices tried before giving up on a size. */
const MAX_TRIES = 3000;

/** Fewer, nearer choices first: `x` itself when whole, else the whole numbers either side, then one further. */
const near = (x: number, wide: boolean): number[] => {
  const r = Math.round(x);
  const opts = Number.isInteger(x) ? [x] : [r, x < r ? r - 1 : r + 1];
  if (wide) opts.push(...(Number.isInteger(x) ? [x - 1, x + 1] : [x < r ? r + 1 : r - 1]));
  return opts;
};

/** Every combination of one choice per list, nearer choices (lower indices) first, at most `cap` of them. */
function* combos(lists: readonly (readonly number[])[], cap: number): Generator<number[]> {
  const all: number[][] = [[]];
  for (const l of lists) {
    const next: number[][] = [];
    for (const a of all) for (let i = 0; i < l.length && next.length < cap * 4; i++) next.push([...a, i]);
    all.splice(0, all.length, ...next);
  }
  all.sort((a, b) => a.reduce((n, x) => n + x, 0) - b.reduce((n, x) => n + x, 0));
  for (const c of all.slice(0, cap)) yield c.map((i, k) => lists[k]![i]!);
}

/** Whether a resized setup plays the same braid as the original, whose steps are `want`. */
function playsLike(want: readonly Step[], slots: number, threads: readonly number[], pattern: Pattern): boolean {
  const sorted = (xs: readonly number[]) => [...xs].sort((x, y) => x - y).join(',');
  const gen = braid({ slots, threads, pattern });
  for (let i = 0; i < want.length; i++) {
    const r = gen.next();
    if (r.done) return false;
    const a = want[i]!;
    const b = r.value;
    if (a.columns.some((c, t) => c !== b.columns[t])) return false;
    const ma = a.move;
    const mb = b.move;
    if (!ma || !mb) {
      if (ma !== mb) return false;
      continue;
    }
    if (ma.thread !== mb.thread || ma.partner !== mb.partner || ma.stacked !== mb.stacked || sorted(ma.passed) !== sorted(mb.passed)) return false;
  }
  // both stop at the same point, or both keep going
  return want.length > PROOF_MOVES || !!gen.next().done;
}

const cache = new WeakMap<DiskSetup, Map<number, DiskSetup | null>>();

/**
 * The same braid on a disk of `slots` slots, or null if there's no way to braid it there.
 *
 * Threads keep their order round the disk, spread as evenly as the new size allows; a gap braid's gap
 * goes to slot 1, so `E` starts where it should. Blank moves move just the threads; unreadable ones
 * can't be renumbered, so that setup can't be resized. Results are kept, so asking again is free.
 *
 * @example
 * resizeSetup(kongoGumiOn32, 16) // threads in slots 16, 1, 4, 5, 8, 9, 12, 13; moves "1>7 9>15 R-4 1>7 9>15 R-5"
 */
export function resizeSetup(s: DiskSetup, slots: number): DiskSetup | null {
  const N = s.slots;
  const M = slots;
  if (M === N) return s;
  let known = cache.get(s);
  if (!known) cache.set(s, (known = new Map()));
  if (known.has(M)) return known.get(M)!;
  const out = resize(s, M);
  known.set(M, out);
  return out;
}

function resize(s: DiskSetup, M: number): DiskSetup | null {
  const N = s.slots;
  const T = s.threads.length;
  if (!Number.isInteger(M) || M < 1 || T > M) return null;
  const blank = !s.pattern.trim();
  const parsed = blank ? null : parsePattern(s.pattern, N);
  if (parsed && !parsed.ok) return null;
  const pattern = parsed?.ok ? parsed.pattern : [];

  // count round the disk from the gap a gap braid starts at, so it lands on slot 1
  const held = new Set(s.threads.map(t => t.slot));
  let start = 0;
  if (usesGap(pattern)) while (start < N && held.has(start)) start++;
  if (start === N) start = 0;
  const x = (i: number) => (mod(i - start, N) * M) / N;

  // threads: spread in proportion, rounded down, to nearest, or up, keeping their order and one to a
  // slot; where two would share a slot, the later one moves along to the next free slot (and back from
  // the end), which keeps groups of threads together: Kongō Gumi's threes on 16 slots
  const order = s.threads.map((_, i) => i).sort((a, b) => mod(s.threads[a]!.slot - start, N) - mod(s.threads[b]!.slot - start, N));
  const spreads: number[][] = [];
  const add = (at: number[]) => {
    const ok = order.every((i, k) => at[i]! >= 0 && at[i]! < M && (k === 0 || at[i]! > at[order[k - 1]!]!));
    if (ok && !spreads.some(o => o.every((v, i) => v === at[i]))) spreads.push(at);
  };
  for (const nudge of [false, true])
    for (const f of [Math.round, Math.floor, Math.ceil]) {
      const at = s.threads.map(t => f(x(t.slot)));
      if (nudge) {
        order.forEach((i, k) => k && (at[i] = Math.max(at[i]!, at[order[k - 1]!]! + 1)));
        for (let k = order.length - 1; k >= 0; k--) at[order[k]!] = Math.min(at[order[k]!]!, k === order.length - 1 ? M - 1 : at[order[k + 1]!]! - 1);
      }
      add(at);
    }
  if (!spreads.length) return null;
  const dress = (at: readonly number[], text: string): DiskSetup => ({
    slots: M,
    threads: s.threads.map((t, i) => ({ ...t, slot: at[i]! })),
    pattern: text,
  });
  if (blank) return dress(spreads[0]!, s.pattern);

  // the slot numbers and turns the moves use, each with a few nearby choices
  const starts = new Map(s.threads.map((t, i) => [t.slot, i]));
  const free = [...new Set(pattern.flatMap(t => (t.kind === 'turn' ? [] : [t.from, t.to])).flatMap(r => (r.kind === 'slot' && !starts.has(r.index) ? [r.index] : [])))];
  const turns = [...new Set(pattern.flatMap(t => (t.kind === 'turn' ? [t.by] : [])))];
  const lists = [...free.map(i => near(x(i), true)), ...turns.map(by => near((by * M) / N, false))];

  // the original, played once
  const want: Step[] = [];
  const gen = braid({ slots: N, threads: s.threads.map(t => t.slot), pattern });
  for (let i = 0; i <= PROOF_MOVES; i++) {
    const r = gen.next();
    if (r.done) break;
    want.push(r.value);
  }

  let tries = 0;
  for (const at of spreads)
    for (const pick of combos(lists, MAX_TRIES)) {
      if (tries++ > MAX_TRIES) return null;
      const slotOf = new Map<number, number>([...starts].map(([slot, i]) => [slot, at[i]!]));
      free.forEach((i, k) => slotOf.set(i, mod(pick[k]!, M)));
      const turnOf = new Map(turns.map((by, k) => [by, pick[free.length + k]!]));
      // a turn never rounds away to nothing
      if (turns.some(by => by !== 0 && turnOf.get(by) === 0)) continue;
      const ref = (r: SlotRef): SlotRef => (r.kind === 'gap' ? r : { kind: 'slot', index: slotOf.get(r.index)! });
      const tokens = pattern.map((t): Token => (t.kind === 'turn' ? { ...t, by: turnOf.get(t.by)! } : { ...t, from: ref(t.from), to: ref(t.to) }));
      if (playsLike(want, M, at, tokens)) return dress(at, formatPattern(tokens));
    }
  return null;
}

/** Whether `base` can be braided on a disk of `slots` slots ({@link resizeSetup}). */
export const scalesTo = (base: DiskSetup, slots: number): boolean => resizeSetup(base, slots) !== null;

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
