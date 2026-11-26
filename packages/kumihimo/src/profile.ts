/**
 * Profiling a braid: is it a real braid, and what kind?
 *
 * {@link profileBraid} plays a pattern until it repeats, turns one repeat into crossings, strips the
 * needless ones, and then judges what is left:
 *
 * - **Real or not.** A real braid holds together as one cord: every strand is linked to every other
 *   through crossings, and every strand goes both over and under somewhere.
 * - **Round or flat.** If the crossings pass every gap between neighboring strands, the braid wraps
 *   all the way round (a round cord). If some gap is never crossed, it can be cut open there and
 *   laid flat (a band).
 * - **Traits.** How the strands weave, named as braiders name them by the longest run a thread
 *   stays over (or under) before switching: one over one under = diamond, two-and-two = regular, a
 *   mix of ones and twos = mixed, threes = Hercules, longer = long float. And how they travel around
 *   the cord (spiral, lattice, twist or wave). Together these give a descriptive name such as
 *   "8-strand regular spiral cord".
 * - **Signature.** A string that is the same for two patterns that make the same braid up to
 *   starting point, disk rotation, mirror image, or the order of crossings that don't touch.
 *   It never matches two different braids, but it can miss that two words are equal when proving
 *   it takes the braid relation (that would need Garside normal form and conjugacy checks).
 *
 * @module
 */

import { crossingsOf } from './crossings.js';
import { Timeline, type Setup } from './disk.js';
import type { Random } from './random.js';
import { seeded } from './random.js';
import { findRepeat, type Repeat } from './repeat.js';
import { mod } from './ring.js';
import { type Crossing, type Word, normalForm, reduceWord, repeatWord, simplifyWord, wordRoot, wordToNotation } from './word.js';

/**
 * How strands alternate over and under, by the longest run a thread stays over (or under) the
 * threads it crosses: diamond 1/1, regular 2/2, mixed (ones and twos), Hercules (threes), long
 * float (four or more).
 */
export type Weave = 'diamond' | 'regular' | 'mixed' | 'Hercules' | 'long float';

/** The weaves from tightest (shortest runs) to loosest. */
export const WEAVES: readonly Weave[] = ['diamond', 'mixed', 'regular', 'Hercules', 'long float'];

/**
 * How strands travel around the cord over one repeat, from each strand's net column travel:
 * `lattice` some travel one way and some the other, `wave` none travel (they wander and come
 * back), `spiral` every strand travels the same way, `twist` some travel one way while the
 * rest stay.
 *
 * Known limitation: travel is counted from crossings alone, and every crossing moves one strand
 * +1 and its neighbor −1, so net travel always sums to zero and `spiral` / `twist` can't occur
 * yet. A uniform rotation of the whole cord (as in Kongō Gumi) shows up as the repeat's column
 * rotation instead, which this doesn't count. Kept as is so names stay stable; see the README.
 */
export type Drift = 'spiral' | 'lattice' | 'twist' | 'wave';

/** A braid's describable traits. */
export interface Traits {
  readonly strands: number;
  readonly weave: Weave;
  readonly drift: Drift;
  readonly shape: 'round' | 'flat';
}

/** Everything {@link profileBraid} learns about a real braid. */
export interface BraidProfile {
  readonly slots: number;
  readonly strands: number;
  readonly repeat: Repeat;
  /** Crossings in one repeat as played, and how many are left after the needless ones go. */
  readonly crossings: { readonly played: number; readonly kept: number };
  /** One repeat's crossings with the needless ones removed. */
  readonly word: Word;
  /** The shortest repeating unit found for the braid (the word may be several copies of it). */
  readonly unit: Word;
  /** {@link BraidProfile.unit} as swap notation on a full disk of `strands` slots. */
  readonly unitNotation: string;
  readonly shape: 'round' | 'flat';
  /** True if some kept crossing happens across the chart's wrap-around seam (last column ↔ first). */
  readonly crossesSeam: boolean;
  readonly traits: Traits;
  /** A descriptive name from the traits, e.g. "8-strand regular spiral cord". */
  readonly name: string;
  /** Equal for patterns that make the same braid (see module notes). */
  readonly signature: string;
}

/** Why a pattern isn't a real braid (or couldn't be judged). */
export type Rejection =
  | 'too-few-threads'
  | 'halted'
  | 'no-repeat'
  | 'stacked'
  | 'irregular'
  | 'cancels-out'
  | 'disconnected'
  | 'not-woven';

export type ProfileResult =
  | { readonly ok: true; readonly profile: BraidProfile }
  | { readonly ok: false; readonly reason: Rejection };

export interface ProfileOptions {
  /** Randomness for the word simplifier. Default: a fixed seed. */
  readonly random?: Random;
  /** Moves to play while looking for a repeat. Default 1600. */
  readonly limit?: number;
  /** Longest repeat accepted. Default 900. */
  readonly maxRepeat?: number;
}

/**
 * Decide whether a setup makes a real braid, and if so describe it.
 *
 * Stricter than {@link checkPattern}: anything a check would flag as an error or as stacking is
 * rejected here, so only patterns that make a sound cord get a profile.
 */
export function profileBraid(setup: Setup, options: ProfileOptions = {}): ProfileResult {
  const { random = seeded(1), limit = 1600, maxRepeat = 900 } = options;
  const no = (reason: Rejection): ProfileResult => ({ ok: false, reason });
  const T = setup.threads.length;
  const N = setup.slots;
  if (T < 3) return no('too-few-threads');

  const tl = new Timeline(setup).extend(limit);
  if (tl.halt && tl.halt.reason !== 'no-moves') return no('halted');
  const rep = findRepeat(tl, limit);
  if (!rep || rep.length > maxRepeat) return no('no-repeat');
  const H = tl.steps;
  const { start, length } = rep;
  // two threads in one slot tangle on a real disk
  for (let s = start + 1; s <= start + length; s++) if (H[s]!.move!.stacked) return no('stacked');

  // the crossings over one repeat, with needless ones canceled; everything below judges what's left
  const cw = crossingsOf(H, start, length, T);
  if (!cw) return no('irregular');
  const played = cw.word.length;
  const loops = cw.rotation === 0;
  let red: Crossing[] = reduceWord(cw.word, T, { cyclic: loops });
  if (!red.length) return no('cancels-out');

  // when the repeat returns every column to where it started, simplify its shortest unit as a loop
  let unit: Crossing[] = red;
  if (loops) {
    const u = wordRoot(red, T);
    const k = red.length / u.length;
    if (u.length <= 160) {
      unit = simplifyWord(u, T, { cyclic: true, random });
      red = repeatWord(unit, k);
    } else unit = u;
  }
  if (!red.length) return no('cancels-out');

  // who is linked to whom, who goes over and under, and how far each strand travels
  const parent = [...Array(T).keys()];
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  const over = Array<number>(T).fill(0);
  const under = Array<number>(T).fill(0);
  const ord: number[] = [];
  H[start]!.columns.forEach((c, id) => (ord[c] = id));
  const seq: number[][] = [...Array(T)].map(() => []);
  const travel = Array<number>(T).fill(0);
  for (const { gap, sign } of red) {
    const L = ord[gap]!;
    const R = ord[mod(gap + 1, T)]!;
    const [o, u] = sign > 0 ? [L, R] : [R, L];
    parent[find(o)] = find(u);
    over[o]!++;
    under[u]!++;
    seq[o]!.push(1);
    seq[u]!.push(0);
    travel[L]!++;
    travel[R]!--;
    ord[gap] = R;
    ord[mod(gap + 1, T)] = L;
  }
  if (new Set([...Array(T).keys()].map(find)).size > 1) return no('disconnected');
  for (let t = 0; t < T; t++) if (!over[t] || !under[t]) return no('not-woven');

  const round = new Set(red.map(x => x.gap)).size === T;
  const traits = describeTraits(seq, travel, round);
  const base = loops ? wordRoot(unit, T) : red;
  return {
    ok: true,
    profile: {
      slots: N,
      strands: T,
      repeat: rep,
      crossings: { played, kept: red.length },
      word: red,
      unit,
      unitNotation: wordToNotation(unit, T),
      shape: round ? 'round' : 'flat',
      crossesSeam: red.some(x => x.gap === T - 1),
      traits,
      name: braidName(traits),
      signature: shortestSignature(signatureOf(base, T)),
    },
  };
}

/**
 * The signature of a braid word: the smallest string among all its starting points, column
 * rotations and mirror images, each first put in {@link normalForm} (skipped for very long words,
 * which then compare in plain order).
 */
export function signatureOf(word: Word, strands: number): string {
  const T = strands;
  const L = word.length;
  const useNormalForm = L * L * L * 2 * T <= 6e6;
  let best: string | null = null;
  for (const mirror of [0, 1]) {
    for (let r = 0; r < T; r++) {
      const w = word.map(({ gap, sign }) => ({ gap: mirror ? mod(T - 2 - gap + r, T) : mod(gap + r, T), sign: mirror ? -sign : sign }) as Crossing);
      for (let st = 0; st < L; st++) {
        const v = w.slice(st).concat(w.slice(0, st));
        const s = (useNormalForm ? normalForm(v, T) : v).map(x => x.gap + ':' + x.sign).join(',');
        if (best === null || s < best) best = s;
      }
    }
  }
  return T + '|' + best;
}

/** Collapse a signature that is a repeat of a shorter one ("AB" and "ABAB" are the same braid). */
export function shortestSignature(sig: string): string {
  const [T, w = ''] = sig.split('|');
  const a = w.split(',');
  for (let p = 1; p <= a.length; p++) {
    if (a.length % p) continue;
    let ok = true;
    for (let i = p; i < a.length && ok; i++) if (a[i] !== a[i - p]) ok = false;
    if (ok) return T + '|' + a.slice(0, p).join(',');
  }
  return sig;
}

/**
 * Traits from each strand's over/under sequence (1 = over, 0 = under, in order), its net travel
 * in columns over one repeat, and whether the braid is round.
 */
export function describeTraits(seq: readonly (readonly number[])[], travel: readonly number[], round: boolean): Traits {
  // runs of the same state around each strand's loop of over/under
  const runs: number[] = [];
  for (const q of seq) {
    const n = q.length;
    let st = q.findIndex((x, i) => x !== q[mod(i - 1, n)]);
    if (st < 0) st = 0;
    let len = 0;
    for (let k = 0; k < n; k++) {
      const x = q[(st + k) % n];
      if (k && x !== q[(st + k - 1) % n]) {
        runs.push(len);
        len = 0;
      }
      len++;
    }
    runs.push(len);
  }
  const longest = Math.max(...runs);
  const weave: Weave =
    longest === 1 ? 'diamond' : runs.every(r => r === 2) ? 'regular' : longest === 2 ? 'mixed' : longest === 3 ? 'Hercules' : 'long float';
  const pos = travel.some(d => d > 0);
  const neg = travel.some(d => d < 0);
  const zero = travel.some(d => d === 0);
  const drift: Drift = !pos && !neg ? 'wave' : pos && neg ? 'lattice' : zero ? 'twist' : 'spiral';
  return { strands: seq.length, weave, drift, shape: round ? 'round' : 'flat' };
}

/** "8-strand regular spiral cord", "6-strand diamond lattice band", "12-strand long-float wave cord". */
export const braidName = (t: Traits): string =>
  `${t.strands}-strand ${t.weave === 'long float' ? 'long-float' : t.weave} ${t.drift} ${t.shape === 'round' ? 'cord' : 'band'}`;
