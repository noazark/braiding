/**
 * Seedable randomness.
 *
 * Nothing in this package calls `Math.random`. Every function that needs chance (the pattern
 * generators, the braid-word simplifier) takes a {@link Random} source, so results are reproducible:
 * the same seed always gives the same braids. Pass `Math.random` if you want fresh results each time.
 *
 * @module
 */

/** A source of uniform random numbers in `[0, 1)`, like `Math.random`. */
export type Random = () => number;

/**
 * A small, fast, seedable generator (mulberry32). Good enough for exploring patterns; not for
 * anything that needs to be unpredictable.
 *
 * @example
 * const random = seeded(42);
 * random(); // always the same first number for seed 42
 */
export function seeded(seed: number): Random {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from `lo` to `hi`, both included. */
export const randomInt = (random: Random, lo: number, hi: number): number =>
  lo + Math.floor(random() * (hi - lo + 1));

/** One element of `items`, chosen uniformly. */
export const pickOne = <T>(random: Random, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)]!;
