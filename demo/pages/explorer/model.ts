/** The explorer's own model: settings, the presets it starts with, and how finds are labeled. */
import { pickOne, presets, profileNotation, randomInt, seeded, type Family, type Random } from 'kumihimo';
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
