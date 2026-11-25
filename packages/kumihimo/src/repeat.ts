/**
 * Finding where a pattern starts repeating.
 *
 * A pattern is played forever, but the braid it makes is periodic: after some number of moves the
 * disk is back in an arrangement it has been in before, about to play the same token, and from then
 * on everything repeats. That stretch of moves is one **repeat** of the braid, and it is all that
 * needs to be drawn, checked or compared.
 *
 * Disk turns are factored out: an arrangement that is the same as an earlier one except rotated
 * around the disk counts as the same, because the pattern's slot numbers rotate with it.
 *
 * @module
 */

import type { Timeline } from './disk.js';
import { mod } from './ring.js';

/** One repeat of a braid. Steps `start+1 … start+length` are the first full repeat. */
export interface Repeat {
  /** The step the first repeat begins after. Steps `1 … start-1` (if any) are a lead-in. */
  readonly start: number;
  /** Number of moves in one repeat. */
  readonly length: number;
  /** Moves played before the first repeat begins (`start - 1`). */
  readonly leadIn: number;
  /** How many whole (or fractional) times the disk turns during one repeat. Signed. */
  readonly turns: number;
}

/**
 * Play up to `limit` moves and find the first repeat. Returns `null` if the pattern doesn't
 * repeat within that many moves, or halts first.
 */
export function findRepeat(timeline: Timeline, limit: number): Repeat | null {
  timeline.extend(limit);
  const H = timeline.steps;
  const N = timeline.setup.slots;
  const seen = new Map<string, number>();
  for (let s = 1; s < H.length; s++) {
    const h = H[s]!;
    const key = h.move!.token + '|' + mod(h.gap - h.turn, N) + '|' + h.positions.map(p => mod(p - h.turn, N)).join(',');
    const first = seen.get(key);
    if (first !== undefined) {
      const length = s - first;
      return { start: first, length, leadIn: first - 1, turns: (H[s]!.turn - H[first]!.turn) / N };
    }
    seen.set(key, s);
  }
  return null;
}
