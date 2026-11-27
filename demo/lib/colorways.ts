/**
 * Colorways: how a braid's threads are colored. Picking colors thread by thread gives a jumble; a
 * colorway picks a kind of coloring (one color, one odd thread out, pairs…) and a few palette colors
 * for it, so random colorings still look planned. Threads are colored in order round the disk.
 */
import { pickOne, randomInt, type Random } from 'kumihimo';
import { PALETTE } from './palette';

/** The kinds of coloring, each named for what the threads look like round the disk. */
export const COLORWAYS = {
  /** Every thread one color. */
  solid: 'Solid',
  /** One color, with a single thread in another: it traces its own path through the braid. */
  single: 'Single strand',
  /** Two colors, every other thread. */
  alternate: 'Alternating',
  /** Neighbors in pairs, the pairs taking turns through two or three colors. */
  pairs: 'Pairs',
  /** Two to four runs of neighbors, one color each. */
  blocks: 'Blocks',
  /** Each thread any of three or four colors, at random. */
  random: 'Random',
} as const;

export type Colorway = keyof typeof COLORWAYS;

/** How often each kind comes up: the ones that show off a braid's structure most, more often. */
const WEIGHTS: readonly [Colorway, number][] = [
  ['solid', 1],
  ['single', 2],
  ['alternate', 2],
  ['pairs', 3],
  ['blocks', 2],
  ['random', 1],
];

const pickKind = (random: Random): Colorway => {
  let r = random() * WEIGHTS.reduce((n, [, w]) => n + w, 0);
  for (const [kind, w] of WEIGHTS) if ((r -= w) < 0) return kind;
  return 'pairs';
};

/** `k` different palette colors, in random order. */
const pickColors = (random: Random, k: number): string[] => {
  const all: string[] = [...PALETTE];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, k);
};

/**
 * A color for each of `threads` threads, in order round the disk, in a colorway of the given kind (a
 * random one if none is given) and randomly chosen palette colors.
 */
export function colorway(threads: number, random: Random, kind: Colorway = pickKind(random)): { kind: Colorway; colors: string[] } {
  const n = threads;
  const at = (k: number, of: (i: number) => number) => {
    const cs = pickColors(random, k);
    return [...Array(n).keys()].map(i => cs[of(i) % k]!);
  };
  switch (kind) {
    case 'solid':
      return { kind, colors: at(1, () => 0) };
    case 'single': {
      const odd = randomInt(random, 0, Math.max(0, n - 1));
      return { kind, colors: at(2, i => (i === odd ? 1 : 0)) };
    }
    case 'alternate':
      return { kind, colors: at(2, i => i) };
    case 'pairs':
      return { kind, colors: at(randomInt(random, 2, 3), i => Math.floor(i / 2)) };
    case 'blocks': {
      const k = Math.max(1, Math.min(randomInt(random, 2, 4), n));
      return { kind, colors: at(k, i => Math.floor((i * k) / n)) };
    }
    case 'random': {
      const cs = pickColors(random, randomInt(random, 3, 4));
      return { kind, colors: [...Array(n)].map(() => pickOne(random, cs)) };
    }
  }
}
