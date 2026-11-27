/**
 * The disk: playing a pattern, one move at a time.
 *
 * {@link braid} is a generator. It starts from the loaded disk (step 0) and yields one
 * {@link Step} per thread move, forever, since a pattern repeats without end. It stops early only
 * when a move can't be made (its slot is empty); the generator's return value then says why.
 *
 * Each step records two views of the same arrangement:
 *
 * - **positions**: which slot each thread sits in (what you see on the disk).
 * - **columns**: each thread's place in the ring order around the disk (what the strand chart
 *   draws). When a thread is carried across, the threads it passes over each shift one column
 *   to close the gap, and the mover takes the last of those columns.
 *
 * Steps are plain, immutable data, so a whole run can be kept, compared or sent anywhere.
 * {@link Timeline} wraps the generator for random access (scrubbing back and forth in a UI).
 *
 * @module
 */

import type { Pattern, SlotRef } from './notation.js';
import { mod, ringDistance } from './ring.js';

/** What to braid: a disk, the threads on it, and the pattern to play. */
export interface Setup {
  /** Number of slots on the disk. */
  readonly slots: number;
  /**
   * The starting slot (0-based) of each thread. A thread's index in this array is its id
   * everywhere else (in steps, findings and crossings).
   */
  readonly threads: readonly number[];
  /** The moves to repeat. */
  readonly pattern: Pattern;
}

/** What one step did. */
export interface Move {
  /** The thread that was lifted. */
  readonly thread: number;
  /** Slot it was lifted from (0-based, after disk turns). */
  readonly from: number;
  /** Slot it was dropped into. */
  readonly to: number;
  /** Index of the pattern token that made this move. */
  readonly token: number;
  /**
   * How many columns the thread traveled in the strand chart, signed (positive = clockwise).
   * Zero means it crossed nothing.
   */
  readonly shift: number;
  /** Threads it passed over, in no particular order. For a swap, the partner is included last. */
  readonly passed: readonly number[];
  /** True when a `move` dropped the thread into a slot that already held one. */
  readonly stacked: boolean;
  /** For a swap: the other thread, which goes the opposite way underneath. */
  readonly partner?: number;
  /** For a swap: the partner's column shift (always `-shift`). */
  readonly partnerShift?: number;
}

/** The disk after a step. Step 0 is the disk as loaded, with no move. */
export interface Step {
  /** 0 for the loaded disk, then 1, 2, 3… */
  readonly index: number;
  /** Slot of each thread, by thread id. */
  readonly positions: readonly number[];
  /** Strand-chart column of each thread, by thread id (`0 … threads-1`). */
  readonly columns: readonly number[];
  /** Total disk turn so far: the sum of every `R` token played. */
  readonly turn: number;
  /** The slot `E` refers to right now. */
  readonly gap: number;
  /** The move that led here, or `null` for step 0. */
  readonly move: Move | null;
}

/** Why {@link braid} stopped. */
export type Halt =
  | { readonly reason: 'no-threads' }
  | { readonly reason: 'no-moves' }
  /** Step `step` would lift a thread from `slot` (0-based), but the slot is empty. */
  | { readonly reason: 'empty-slot'; readonly step: number; readonly slot: number };

/**
 * Play a pattern on a disk. Yields step 0 (the loaded disk), then one step per move, forever.
 *
 * @example
 * for (const step of braid(setup)) {
 *   if (step.index > 10) break;
 *   console.log(step.move?.thread, step.positions);
 * }
 */
export function* braid(setup: Setup): Generator<Step, Halt, undefined> {
  const { slots: N, pattern } = setup;
  const T = setup.threads.length;
  const pos = setup.threads.slice();
  // which thread is on top when two share a slot: the one put there last
  const stamp = pos.map((_, i) => i);
  let clock = T;
  let turn = 0;
  let index = 0;
  let tokenAt = 0;

  // the gap starts at the first empty slot
  const occupied = new Set(pos);
  let gap = 0;
  for (let k = 0; k < N; k++) {
    if (!occupied.has(k)) {
      gap = k;
      break;
    }
  }

  // ring order: one column per thread, in the order they sit around the disk
  const col: number[] = Array(T);
  [...pos.keys()].sort((x, y) => pos[x]! - pos[y]! || stamp[x]! - stamp[y]!).forEach((id, k) => (col[id] = k));
  const byColumn = () => {
    const L: number[] = Array(T);
    col.forEach((c, id) => (L[c] = id));
    return L;
  };

  /**
   * Threads strictly past slot `a`, up to and including `b`: going the short way round, or the way
   * `toward` says (1 clockwise, -1 counterclockwise).
   */
  const passedBetween = (mover: number, a: number, b: number, except?: number, toward?: number) => {
    const d = ringDistance(a, b, N);
    const dir = toward ?? (Math.sign(d) || 1);
    const span = toward ? mod((b - a) * dir, N) : Math.abs(d);
    const ids: number[] = [];
    for (let t = 0; t < T; t++) {
      if (t === mover || t === except) continue;
      const o = mod((pos[t]! - a) * dir, N);
      if (o > 0 && o <= span) ids.push(t);
    }
    return { dir, ids };
  };
  /**
   * The way a move into the gap goes: past fewer threads, whatever the empty slots between (on a disk
   * with one empty slot that's also the short way round, so nothing changes there). A tie goes the short
   * way round, as any other move.
   */
  const intoGap = (mover: number, a: number, b: number): number | undefined => {
    const cw = passedBetween(mover, a, b, undefined, 1).ids.length;
    const ccw = passedBetween(mover, a, b, undefined, -1).ids.length;
    return cw < ccw ? 1 : ccw < cw ? -1 : undefined;
  };
  const topOf = (slot: number) => {
    let best = -1;
    for (let k = 0; k < T; k++) if (pos[k] === slot && (best < 0 || stamp[k]! > stamp[best]!)) best = k;
    return best;
  };
  /**
   * The slot of the `k`th thread clockwise from the gap (counterclockwise if negative), skipping empty
   * slots, so a gap pattern plays the same however many spare slots the disk has. `E` itself is the gap.
   */
  const fromGap = (k: number) => {
    if (k === 0) return gap;
    const dir = Math.sign(k);
    const held = new Set(pos);
    const ring: number[] = [];
    for (let j = 1; j < N; j++) if (held.has(mod(gap + dir * j, N))) ring.push(mod(gap + dir * j, N));
    return ring.length ? ring[(Math.abs(k) - 1) % ring.length]! : gap;
  };
  const resolve = (r: SlotRef) => (r.kind === 'gap' ? fromGap(r.offset) : mod(r.index + turn, N));
  const snapshot = (move: Move | null): Step =>
    Object.freeze({ index: index++, positions: Object.freeze(pos.slice()), columns: Object.freeze(col.slice()), turn, gap, move });

  yield snapshot(null);
  if (!T) return { reason: 'no-threads' };
  if (!pattern.some(t => t.kind !== 'turn')) return { reason: 'no-moves' };

  for (;;) {
    const ti = tokenAt % pattern.length;
    const t = pattern[ti]!;
    tokenAt++;
    if (t.kind === 'turn') {
      turn += t.by;
      continue;
    }
    const a = resolve(t.from);
    const b = resolve(t.to);
    const p = topOf(a);
    if (p < 0) return { reason: 'empty-slot', step: index, slot: a };

    if (t.kind === 'move') {
      const toGap = t.to.kind === 'gap' && t.to.offset === 0 && a !== b;
      const { dir, ids } = passedBetween(p, a, b, undefined, toGap ? intoGap(p, a, b) : undefined);
      const k = ids.length;
      const L = byColumn();
      const c0 = col[p]!;
      const stacked = topOf(b) >= 0;
      // the threads passed over slide back one column each; the mover takes the last one
      for (let j = 1; j <= k; j++) col[L[mod(c0 + dir * j, T)]!] = mod(c0 + dir * (j - 1), T);
      col[p] = mod(c0 + dir * k, T);
      pos[p] = b;
      stamp[p] = ++clock;
      gap = a;
      yield snapshot({ thread: p, from: a, to: b, token: ti, shift: dir * k || 0, passed: ids, stacked });
    } else {
      const q = topOf(b);
      if (q < 0) return { reason: 'empty-slot', step: index, slot: b };
      const { dir, ids } = passedBetween(p, a, b, q);
      const shift = dir * (ids.length + 1);
      const cp = col[p]!;
      col[p] = col[q]!;
      col[q] = cp;
      pos[p] = b;
      pos[q] = a;
      stamp[q] = ++clock;
      stamp[p] = ++clock;
      yield snapshot({
        thread: p,
        partner: q,
        from: a,
        to: b,
        token: ti,
        shift,
        partnerShift: -shift,
        passed: ids.concat([q]),
        stacked: false,
      });
    }
  }
}

/**
 * A recorded run of {@link braid}, extended on demand.
 *
 * Patterns repeat forever, so a run is never "finished" unless it halts; a timeline plays only
 * as far as someone has asked for. Asking again for steps it already has costs nothing, which
 * is what a UI needs for stepping back and forth.
 *
 * Determinism: a timeline is a cache over a pure generator. Two timelines for the same setup
 * always hold the same steps.
 */
export class Timeline {
  readonly setup: Setup;
  #gen: Generator<Step, Halt, undefined>;
  #steps: Step[] = [];
  #halt: Halt | null = null;

  constructor(setup: Setup) {
    this.setup = setup;
    this.#gen = braid(setup);
    this.extend(0);
  }

  /** Play until step `n` exists (or the pattern halts). Returns the timeline for chaining. */
  extend(n: number): this {
    while (!this.#halt && this.#steps.length <= n) {
      const r = this.#gen.next();
      if (r.done) this.#halt = r.value;
      else this.#steps.push(r.value);
    }
    return this;
  }

  /** Every step played so far, from step 0. */
  get steps(): readonly Step[] {
    return this.#steps;
  }

  /** Index of the last step played so far. */
  get last(): number {
    return this.#steps.length - 1;
  }

  /** Why the run stopped, or `null` if it can keep going. */
  get halt(): Halt | null {
    return this.#halt;
  }

  /** True once the run has stopped for good (see {@link Timeline.halt}). */
  get finished(): boolean {
    return this.#halt !== null;
  }

  /** Step `i`, playing ahead if needed. Undefined only if the run halts first. */
  at(i: number): Step | undefined {
    this.extend(i);
    return this.#steps[i];
  }
}
