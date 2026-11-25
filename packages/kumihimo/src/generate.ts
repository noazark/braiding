/**
 * Random pattern generators, for exploring what braids are possible.
 *
 * Each generator proposes one {@link Candidate}: a disk, threads and pattern, built so that it at
 * least *can* repeat. Most candidates turn out not to be real braids; run them through
 * {@link refineCandidate} (or {@link profileBraid}) to keep the good ones. Generators return `null`
 * when a random choice leads nowhere, which is cheap and expected.
 *
 * @module
 */

import { mod } from './ring.js';
import { pickOne, randomInt, type Random } from './random.js';

/** The kinds of pattern the generators make. */
export type Family =
  /** Threads carried across the disk with `a>b`, plus disk turns, like Kongō Gumi. */
  | 'disk'
  /** Rounds of neighbor swaps `a*b` on a full disk, like a basket weave. */
  | 'swap'
  /** Gap-relative moves `E+k>E` on a disk with one empty slot, like card braids. */
  | 'gap';

/** A proposed pattern, not yet known to make a braid. */
export interface Candidate {
  readonly family: Family;
  readonly slots: number;
  /** Starting slot (0-based) of each thread. */
  readonly threads: readonly number[];
  /** The pattern in notation. */
  readonly pattern: string;
}

/**
 * Threads in evenly spaced groups on a 16-, 24- or 32-slot disk, and one pass of 1–3 moves across
 * it, followed by the disk turns that let the pass repeat forever.
 */
export function randomDiskPattern(maxThreads: number, random: Random): Candidate | null {
  const N = pickOne(random, [16, 24, 32]);
  const G = pickOne(random, [2, 4, 4, 4]);
  const g = randomInt(random, 1, Math.max(1, Math.min(4, Math.floor(maxThreads / G))));
  const T = G * g;
  if (T < 3 || T > maxThreads) return null;
  // slots here are 1-based, as written, until the end
  const init = new Set<number>();
  const slots: number[] = [];
  for (let k = 0; k < G; k++) {
    const c = (k * N) / G;
    for (let j = 0; j < g; j++) {
      const s = mod(c - Math.floor(g / 2) + j, N) + 1;
      init.add(s);
      slots.push(s);
    }
  }
  // one pass of 1–3 moves, each crossing the disk or part of it
  const scratch = new Set(init);
  const moves: [number, number][] = [];
  const m = randomInt(random, 1, 3);
  for (let i = 0; i < m; i++) {
    const src = pickOne(random, [...scratch]);
    const empty = [...Array(N).keys()].map(x => x + 1).filter(x => !scratch.has(x));
    const far = empty.filter(x => {
      let d = Math.abs(x - src);
      d = Math.min(d, N - d);
      return d > 1 && d < N / 2;
    });
    if (!far.length) return null;
    const dst = pickOne(random, far);
    scratch.delete(src);
    scratch.add(dst);
    moves.push([src, dst]);
  }
  // find disk turns that let the pass repeat: after pass, turn t1, pass again, turn t2, the threads
  // must sit where they started (shifted around the disk), so the whole thing can loop forever
  const shifted = (set: Set<number>, o: number) => new Set([...set].map(s => mod(s - 1 + o, N) + 1));
  const applyAt = (set: Set<number>, o: number) => {
    const S = new Set(set);
    for (const [a, b] of moves) {
      const A = mod(a - 1 + o, N) + 1;
      const B = mod(b - 1 + o, N) + 1;
      if (!S.has(A) || S.has(B)) return null;
      S.delete(A);
      S.add(B);
    }
    return S;
  };
  const same = (a: Set<number>, b: Set<number>) => a.size === b.size && [...a].every(x => b.has(x));
  const options: number[][] = [];
  for (let t1 = -(N / 2) + 1; t1 <= N / 2; t1++) {
    if (!t1) continue;
    const s1 = applyAt(init, 0);
    if (!s1) break;
    if (same(s1, shifted(init, t1))) options.push([t1]);
    const s2 = applyAt(s1, t1);
    if (!s2) continue;
    for (let t2 = -(N / 2) + 1; t2 <= N / 2; t2++) if (t2 && same(s2, shifted(init, t1 + t2))) options.push([t1, t2]);
  }
  if (!options.length) return null;
  const t = pickOne(random, options);
  const pass = moves.map(([a, b]) => a + '>' + b).join(' ');
  const pattern = t.length === 1 ? `${pass} R${t[0]}` : `${pass} R${t[0]} ${pass} R${t[1]}`;
  return { family: 'disk', slots: N, threads: slots.map(s => s - 1), pattern };
}

/** 2–4 rounds of swaps between neighbors (or every other thread) on a full disk of 4–16. */
export function randomSwapPattern(maxThreads: number, random: Random): Candidate | null {
  const T = randomInt(random, 4, Math.min(maxThreads, 16));
  const N = T;
  const rounds = randomInt(random, 2, 4);
  const parts: string[] = [];
  for (let r = 0; r < rounds; r++) {
    const stride = pickOne(random, [1, 1, 1, 2]);
    const off = randomInt(random, 0, stride);
    const dir = pickOne(random, [1, -1]);
    const used = new Set<number>();
    const round: string[] = [];
    for (let i = off; i < T; i += stride * 2) {
      const a = i;
      const b = mod(i + stride, T);
      if (used.has(a) || used.has(b)) continue;
      used.add(a);
      used.add(b);
      round.push(dir > 0 ? `${a + 1}*${b + 1}` : `${b + 1}*${a + 1}`);
    }
    if (!round.length) return null;
    parts.push(round.join(' '));
  }
  return { family: 'swap', slots: N, threads: [...Array(T).keys()], pattern: parts.join(' ') };
}

/** 1–3 gap moves `E±k>E` on a disk with one empty slot. */
export function randomGapPattern(maxThreads: number, random: Random): Candidate | null {
  const N = randomInt(random, 5, Math.min(maxThreads, 16) + 1);
  const T = N - 1;
  if (T > maxThreads) return null;
  const m = randomInt(random, 1, 3);
  const moves: string[] = [];
  for (let i = 0; i < m; i++) {
    const k = randomInt(random, 2, N - 2) * pickOne(random, [1, -1]);
    moves.push(`E${k > 0 ? '+' : ''}${k}>E`);
  }
  return { family: 'gap', slots: N, threads: [...Array(T).keys()], pattern: moves.join(' ') };
}

/** The generator for each family. */
export const generators: Readonly<Record<Family, (maxThreads: number, random: Random) => Candidate | null>> = {
  disk: randomDiskPattern,
  swap: randomSwapPattern,
  gap: randomGapPattern,
};
