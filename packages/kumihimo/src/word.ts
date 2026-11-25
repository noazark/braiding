/**
 * Braid words: a braid written as the crossings it makes.
 *
 * Lay the strands side by side in columns `0 … T-1`, around a ring (column `T-1` neighbors
 * column `0`, because the threads sit around a disk). Any braid can be built from one kind of step:
 * two neighboring strands cross. A {@link Crossing} records which gap they crossed at and which
 * one went over; a {@link Word} is the list of crossings in order. This is Emil Artin's braid
 * group notation (1925), on a ring rather than a line (an *annular* or *affine* braid).
 *
 * Different words can describe the same braid. This module knows three rules for rewriting
 * a word without changing its braid:
 *
 * 1. **Cancellation.** A crossing followed by its exact opposite undoes itself: `a a⁻¹ = (nothing)`.
 * 2. **Commutation.** Crossings at gaps two or more apart involve different strands, so their
 *    order doesn't matter: `a b = b a`.
 * 3. **The braid relation.** At neighboring gaps, `a b a = b a b`, plus the mixed-sign form
 *    `aᵉ bᶠ a⁻ᵉ = b⁻ᵉ aᶠ bᵉ`.
 *
 * {@link reduceWord} applies rules 1 and 2 until nothing more cancels. {@link simplifyWord} also
 * explores rule 3, which can bring a crossing next to its undo. {@link normalForm} picks one
 * fixed ordering among all words that differ only by rule 2 (Cartier–Foata / lexicographic normal
 * form of a trace monoid), so two such words can be compared as strings.
 *
 * Every function here is pure: it takes a word and returns a new one.
 *
 * @module
 */

import { mod } from './ring.js';
import type { Random } from './random.js';
import { seeded } from './random.js';

/** `+1`: the strand on the left (lower column) goes over. `-1`: the strand on the right goes over. */
export type Sign = 1 | -1;

/**
 * Two neighboring strands crossing. `gap` g sits between columns `g` and `g+1`; gap `T-1` joins
 * the last column to the first.
 */
export interface Crossing {
  readonly gap: number;
  readonly sign: Sign;
}

/** A braid as a sequence of crossings. */
export type Word = readonly Crossing[];

const crossing = (gap: number, sign: number): Crossing => ({ gap, sign: sign > 0 ? 1 : -1 });

/** `"gap:sign"`, a crossing as a short string key. */
export const crossingKey = (x: Crossing): string => x.gap + ':' + x.sign;

/** A whole word as a string key (for maps, sets and comparisons). */
export const wordKey = (w: Word): string => w.map(crossingKey).join(',');

/**
 * Whether two crossings can swap order without changing the braid: they must be at gaps two or more
 * apart around the ring, so they involve four different strands. With three strands or fewer every
 * pair of gaps touches, so nothing commutes.
 */
export const commutes = (a: Crossing, b: Crossing, strands: number): boolean => {
  const d = mod(a.gap - b.gap, strands);
  return strands > 3 && d >= 2 && d <= strands - 2;
};

/** Options shared by the word reducers. */
export interface ReduceOptions {
  /**
   * Treat the word as a loop (it repeats forever), so a crossing near the end may cancel against
   * one near the start. Only valid when one pass of the word returns every strand to its column.
   */
  readonly cyclic?: boolean;
}

/**
 * Cancel every crossing that is undone by its opposite with nothing in between that touches the
 * same strands (rules 1 and 2). The result describes the same braid with no needless crossings
 * that can be found without the braid relation.
 *
 * @example
 * // gap 0 over, then gap 2 (commutes with gap 0), then gap 0 under: the gap-0 pair cancels
 * reduceWord([{gap:0,sign:1},{gap:2,sign:1},{gap:0,sign:-1}], 6) // [{gap:2,sign:1}]
 */
export function reduceWord(word: Word, strands: number, options: ReduceOptions = {}): Crossing[] {
  let w = word.slice();
  const pass = (): boolean => {
    for (let i = 0; i < w.length; i++) {
      for (let j = i + 1; j < w.length; j++) {
        if (w[j]!.gap === w[i]!.gap && w[j]!.sign === -w[i]!.sign) {
          w.splice(j, 1);
          w.splice(i, 1);
          return true;
        }
        if (!commutes(w[i]!, w[j]!, strands)) break;
      }
    }
    return false;
  };
  let changed = true;
  while (changed) {
    changed = pass();
    // the pattern repeats forever, so try every starting point around the loop
    if (!changed && options.cyclic && w.length > 1) {
      for (let k = 1; k < w.length && !changed; k++) {
        const keep = w;
        w = w.slice(k).concat(w.slice(0, k));
        if (pass()) changed = true;
        else w = keep;
      }
    }
  }
  return w;
}

/** Options for {@link simplifyWord}. */
export interface SimplifyOptions extends ReduceOptions {
  /** How many rewrites in a row may fail to shorten the word before giving up. Default 150. */
  readonly budget?: number;
  /** Randomness for choosing rewrites. Default: a fixed seed, so results are reproducible. */
  readonly random?: Random;
}

/**
 * Look for a shorter word for the same braid.
 *
 * Some needless crossings only show up after rearranging with the braid relation (rule 3). This
 * takes a short random walk through rewrites (none of which change the braid or the word's length),
 * reducing after each one, and keeps the shortest word it meets. It finds shorter forms but does
 * not prove they are the shortest.
 */
export function simplifyWord(word: Word, strands: number, options: SimplifyOptions = {}): Crossing[] {
  const { cyclic = false, budget = 150, random = seeded(1) } = options;
  const neighbors = (a: number, b: number) => {
    const d = mod(a - b, strands);
    return d === 1 || d === strands - 1;
  };
  let best = reduceWord(word, strands, { cyclic });
  let cur = best.slice();
  let idle = 0;
  while (idle < budget && cur.length > 2) {
    idle++;
    if (cyclic) {
      const k = Math.floor(random() * cur.length);
      cur = cur.slice(k).concat(cur.slice(0, k));
    }
    const i = Math.floor(random() * (cur.length - 1));
    const a = cur[i]!;
    const b = cur[i + 1]!;
    const c = cur[i + 2];
    if (c && c.gap === a.gap && neighbors(a.gap, b.gap)) {
      if (a.sign === c.sign && a.sign === b.sign) {
        // a b a = b a b
        cur.splice(i, 3, crossing(b.gap, a.sign), crossing(a.gap, a.sign), crossing(b.gap, a.sign));
      } else if (a.sign === -c.sign) {
        // aᵉ bᶠ a⁻ᵉ = b⁻ᵉ aᶠ bᵉ
        cur.splice(i, 3, crossing(b.gap, -a.sign), crossing(a.gap, b.sign), crossing(b.gap, a.sign));
      } else continue;
    } else if (commutes(a, b, strands)) cur.splice(i, 2, b, a);
    else continue;
    cur = reduceWord(cur, strands, { cyclic });
    if (cur.length < best.length) {
      best = cur.slice();
      idle = 0;
    }
  }
  return best;
}

/**
 * The lexicographic normal form under commutation: repeatedly take the lowest crossing that nothing
 * before it blocks. Two words that differ only by reordering commuting crossings get the same
 * normal form.
 */
export function normalForm(word: Word, strands: number): Crossing[] {
  const left = word.slice();
  const out: Crossing[] = [];
  const rank = (x: Crossing) => x.gap * 2 + (x.sign > 0 ? 1 : 0);
  while (left.length) {
    let bi = -1;
    for (let i = 0; i < left.length; i++) {
      let free = true;
      for (let j = 0; j < i && free; j++) if (!commutes(left[j]!, left[i]!, strands)) free = false;
      if (free && (bi < 0 || rank(left[i]!) < rank(left[bi]!))) bi = i;
    }
    out.push(left.splice(bi, 1)[0]!);
  }
  return out;
}

/**
 * The shortest `u` with `word = u u u …`, allowing for commuting crossings: for a k-fold repeat, `u`
 * takes the first 1/k of each kind of crossing and must reproduce the word (in normal form) when
 * repeated. Returns the word itself if it isn't a repeat. Words over 400 crossings are compared
 * letter for letter instead of in normal form, to keep this fast.
 */
export function wordRoot(word: Word, strands: number): Crossing[] {
  const L = word.length;
  const count: Record<string, number> = {};
  for (const x of word) count[crossingKey(x)] = (count[crossingKey(x)] || 0) + 1;
  const nf = (v: Word) => wordKey(normalForm(v, strands));
  const full = L <= 400 ? nf(word) : null;
  for (let p = 1; p < L; p++) {
    if (L % p) continue;
    const k = L / p;
    if (Object.values(count).some(c => c % k)) continue;
    const seen: Record<string, number> = {};
    const u = word.filter(x => {
      const key = crossingKey(x);
      const c = (seen[key] = (seen[key] || 0) + 1);
      return c <= count[key]! / k;
    });
    const uk = repeatWord(u, k);
    if (full !== null ? nf(uk) === full : uk.every((x, i) => crossingKey(x) === crossingKey(word[i]!))) return u;
  }
  return word.slice();
}

/** `word` written out `times` times in a row. */
export const repeatWord = (word: Word, times: number): Crossing[] => ([] as Crossing[]).concat(...Array(times).fill(word));

/**
 * The word as swaps on a full disk of `strands` slots, threads in slot order: left-over-right at gap
 * g is `(g+1)*(g+2)`. A word becomes a pattern anyone can play.
 *
 * @example
 * wordToNotation([{gap:0,sign:1},{gap:1,sign:-1}], 4) // "1*2 3*2"
 */
export const wordToNotation = (word: Word, strands: number): string =>
  word
    .map(({ gap, sign }) => {
      const a = gap + 1;
      const b = mod(gap + 1, strands) + 1;
      return sign > 0 ? `${a}*${b}` : `${b}*${a}`;
    })
    .join(' ');
