/** The explorer's own model: settings, the presets it starts with, and how finds are labeled. */
import { pickOne, presets, profileNotation, randomInt, seeded, type Drift, type Family, type Random, type Weave } from 'kumihimo';
import { colorize, isRound, keyOf, presetCard, type Card } from '../../lib/patternCards';

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
  maxThreads: 12,
  shape: 'any',
};

/** The range of the Threads slider. The generators make patterns of 4 to 16 threads. */
export const THREADS = { min: 4, max: 16 } as const;

/** A fully random search (any family, 4 to 16 threads), keeping only the shape on show. */
export const randomSettings = (random: Random, shape: Shape): Settings => ({
  family: 'mixed',
  maxThreads: randomInt(random, THREADS.min, THREADS.max),
  shape,
});

/** The family a search actually uses for one pattern ('mixed' picks one, disk moves weighted up). */
export const pickFamily = (random: Random, f: FamilyChoice): Family => (f === 'mixed' ? pickOne(random, ['disk', 'disk', 'swap', 'gap'] as const) : f);

/** Preset braids by signature, so finds that happen to be a preset are labeled as one. */
export const KNOWN: ReadonlyMap<string, string> = new Map(
  presets.flatMap(p => {
    const prof = profileNotation(p.slots, p.threads, p.pattern);
    return prof ? [[prof.signature, p.name] as const] : [];
  }),
);

/** The presets as pattern cards, keyed by signature: what the explorer starts with. */
export function presetCards(): [string, Card][] {
  const seen = new Set<string>();
  return presets.flatMap((p, i) => {
    const base = presetCard(p);
    if (!base || seen.has(keyOf(base))) return [];
    seen.add(keyOf(base));
    const card = presetCard(p, colorize(base.profile.strands, seeded(i + 1)))!;
    return [[keyOf(card), card]];
  });
}

/** Whether a card shows under the Shape setting. */
export const matches = (shape: Shape) => (c: Card) => shape === 'any' || (shape === 'round') === isRound(c);

/** The filter bar's choices: which braids the grid shows, by their traits. Empty means no limit. */
export interface Filters {
  readonly liked: boolean;
  readonly weave: ReadonlySet<Weave>;
  readonly drift: ReadonlySet<Drift>;
  readonly strands: ReadonlySet<number>;
}

/** A trait the filter bar offers chips for. */
export type TraitKey = 'weave' | 'drift' | 'strands';
export const TRAITS: readonly [TraitKey, string][] = [
  ['weave', 'Weave'],
  ['drift', 'Drift'],
  ['strands', 'Threads'],
];

export const NO_FILTERS: Filters = { liked: false, weave: new Set(), drift: new Set(), strands: new Set() };

export const isUnfiltered = (f: Filters): boolean => !f.liked && TRAITS.every(([k]) => f[k].size === 0);

/** A card's value for a trait. */
export const traitOf = (c: Card, k: TraitKey): string | number => c.profile.traits[k];

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
