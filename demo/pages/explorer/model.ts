/** The explorer's own model: settings, the presets it starts with, and how finds are labeled. */
import { pickOne, presets, randomInt, seeded, type Drift, type Family, type Random, type Weave } from 'kumihimo';
import { colorize, isRound, keyOf, presetCard, withColors, type Card } from '../../lib/patternCards';
import { smallestDisk } from '../../lib/myDisk';

export { FAMILY_LABEL, cardFromFind, colorize, colorsOf, isRound, keyOf, waste, withColors, type Card } from '../../lib/patternCards';

export type FamilyChoice = Family | 'mixed';
export type Shape = 'any' | 'round' | 'flat';

/** What a search looks for. */
export interface Settings {
  readonly family: FamilyChoice;
  /** The most threads a generated pattern may use. */
  readonly maxThreads: number;
  readonly shape: Shape;
}

/** Where the settings card starts, and what Reset puts it back to. */
export const DEFAULT_SETTINGS: Settings = {
  family: 'mixed',
  // as many as your disk takes (see threadsFor); the feed's random searches pick fewer
  maxThreads: 16,
  shape: 'any',
};

/** How many threads the generators make: 4 to 16. */
export const THREADS = { min: 4, max: 16 } as const;

/** A fully random search (any family, 4 to 16 threads), keeping only the shape on show. */
export const randomSettings = (random: Random, shape: Shape): Settings => ({
  family: 'mixed',
  maxThreads: randomInt(random, THREADS.min, THREADS.max),
  shape,
});

/** The family a search actually uses for one pattern ('mixed' picks one, disk moves weighted up). */
export const pickFamily = (random: Random, f: FamilyChoice): Family => (f === 'mixed' ? pickOne(random, ['disk', 'disk', 'swap', 'gap'] as const) : f);

/**
 * Preset braids by signature, so finds that happen to be a preset are labeled as one. Filled in as
 * the presets are profiled ({@link presetCardAt}), which the explorer does a few at a time after it loads.
 */
export const KNOWN = new Map<string, string>();

/**
 * Preset `i` as a pattern card in its explorer colors, keyed by signature (null if it isn't a braid).
 * Profiling a preset is the slow part (up to ~90ms): it's done once here, and noted in {@link KNOWN}.
 */
export function presetCardAt(i: number): [string, Card] | null {
  const p = presets[i];
  const base = p && presetCard(p);
  if (!base) return null;
  if (!KNOWN.has(keyOf(base))) KNOWN.set(keyOf(base), p.name);
  return [keyOf(base), withColors(base, colorize(base.profile.strands, seeded(i + 1)))];
}

/** Names the presets as written and the engine that profiles them: saved preset cards are only reused under the same stamp. */
export function presetStamp(): string {
  const text = (import.meta.env.VITE_ENGINE_HASH ?? 'dev') + JSON.stringify(presets.map(p => [p.name, p.slots, p.threads, p.pattern, p.group]));
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return `${import.meta.env.VITE_ENGINE_HASH ?? 'dev'}:${(h >>> 0).toString(36)}`;
}

/** Note saved preset cards in {@link KNOWN}, as profiling them would have. */
export function knowPresets(cards: readonly (readonly [string, Card])[]): void {
  for (const [key, c] of cards) if (c.known && !KNOWN.has(key)) KNOWN.set(key, c.known);
}

/** All the presets as pattern cards, keyed by signature, the first of any that are the same braid. */
export function presetCards(): [string, Card][] {
  const seen = new Set<string>();
  return presets.flatMap((_, i) => {
    const e = presetCardAt(i);
    if (!e || seen.has(e[0])) return [];
    seen.add(e[0]);
    return [e];
  });
}

/** Whether a card shows under the Shape setting. */
export const matches = (shape: Shape) => (c: Card) => shape === 'any' || (shape === 'round') === isRound(c);

/** The filter bar's choices: which braids the grid shows, by their traits. Empty means no limit. */
export interface Filters {
  readonly liked: boolean;
  readonly weave: ReadonlySet<Weave>;
  readonly drift: ReadonlySet<Drift>;
  /** The smallest disk a braid goes on (see smallestDisk). */
  readonly disk: ReadonlySet<number>;
}

/** A trait the filter bar offers chips for. */
export type TraitKey = 'weave' | 'drift' | 'disk';
export const TRAITS: readonly [TraitKey, string][] = [
  ['weave', 'Weave'],
  ['drift', 'Drift'],
  ['disk', 'Disk'],
];

export const NO_FILTERS: Filters = { liked: false, weave: new Set(), drift: new Set(), disk: new Set() };

export const isUnfiltered = (f: Filters): boolean => !f.liked && TRAITS.every(([k]) => f[k].size === 0);

/** A card's value for a trait. */
export const traitOf = (c: Card, k: TraitKey): string | number => (k === 'disk' ? smallestDisk(c.setup) : c.profile.traits[k]);

/** Whether a card passes the trait chips (any chip within a trait, every trait with chips on). */
export const fitsTraits = (f: Filters) => (c: Card): boolean =>
  TRAITS.every(([k]) => f[k].size === 0 || (f[k] as ReadonlySet<string | number>).has(traitOf(c, k)));

/** Whether a card shows under the filter bar. */
export const inFilters = (f: Filters, likes: ReadonlySet<string>) => {
  const traits = fitsTraits(f);
  return (c: Card): boolean => (!f.liked || likes.has(keyOf(c))) && traits(c);
};

/** The same filters with one trait chip turned on or off. */
export function toggleTrait(f: Filters, k: TraitKey, v: string | number): Filters {
  const next = new Set<string | number>(f[k]);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return { ...f, [k]: next };
}
