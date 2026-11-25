/**
 * From disk moves to crossings.
 *
 * A disk move carries one thread across several others at once. In the strand chart that is several
 * neighbor crossings in a row: the mover crosses its neighbor, then the next, and so on, going
 * over each one. {@link crossingsOf} turns one repeat of moves into that sequence of crossings,
 * a braid {@link Word} that the rest of the package can reduce, compare and classify.
 *
 * @module
 */

import type { Step } from './disk.js';
import { mod } from './ring.js';
import type { Crossing, Word } from './word.js';

/** The crossings of one repeat. */
export interface RepeatWord {
  readonly word: Word;
  /**
   * How far the columns have turned around after one repeat. 0 means every strand is back in the
   * column it started in, so the word can be treated as a loop.
   */
  readonly rotation: number;
}

/**
 * The crossings made by steps `start+1 … start+length`, with `strands` threads.
 *
 * Returns `null` if the crossings don't land the strands where the simulation put them (a sanity
 * check that should never fail), or if the repeat leaves the columns in an order that isn't a plain
 * rotation of where they started.
 */
export function crossingsOf(steps: readonly Step[], start: number, length: number, strands: number): RepeatWord | null {
  const T = strands;
  const ord: number[] = [];
  steps[start]!.columns.forEach((c, id) => (ord[c] = id));
  const w: Crossing[] = [];

  // carry `id` n columns in direction dir; over(nb) says whether it goes over neighbor nb
  const carry = (id: number, dir: number, n: number, over: (nb: number) => boolean) => {
    let c = ord.indexOf(id);
    for (let k = 0; k < n; k++) {
      const x = mod(c + dir, T);
      const nb = ord[x]!;
      w.push({ gap: dir > 0 ? c : x, sign: (dir > 0) === over(nb) ? 1 : -1 });
      ord[c] = nb;
      ord[x] = id;
      c = x;
    }
  };

  for (let s = start + 1; s <= start + length; s++) {
    const m = steps[s]!.move!;
    if (!m.shift) continue;
    const dir = Math.sign(m.shift);
    // the mover goes over everything it passes
    carry(m.thread, dir, Math.abs(m.shift), () => true);
    // in a swap, the partner comes back the other way, over everything except the mover
    if (m.partner != null) {
      const partner = m.partner;
      carry(partner, -dir, mod((steps[s]!.columns[partner]! - ord.indexOf(partner)) * -dir, T), nb => nb !== m.thread);
    }
    // sanity: must land where the simulation put them
    for (let c = 0; c < T; c++) if (steps[s]!.columns[ord[c]!] !== c) return null;
  }

  // the repeat may leave the columns turned around by r
  const first = steps[start]!.columns;
  for (let k = 0; k < T; k++) {
    if (ord.every((id, c) => first[id] === mod(c - k, T))) return { word: w, rotation: k };
  }
  return null;
}
