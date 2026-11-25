/**
 * Pattern cards (see GLOSSARY.md): a braid that makes a real cord, as a disk setup plus what the
 * engine found out about it. The explorer's grid is made of them, and the home page shows a few.
 */
import { pickOne, profileNotation, randomInt, type BraidProfile, type Family, type Find, type Preset, type Random } from 'kumihimo';
import { fromPreset, type DiskSetup } from './diskSetup';
import { PALETTE } from './palette';

export interface Card {
  /** What to load on a disk to make this braid, colors included. */
  readonly setup: DiskSetup;
  /** The engine's profile of the braid: shape, name, repeat, signature… */
  readonly profile: BraidProfile;
  /** The kind of pattern that found it. */
  readonly family: Family;
  /** Set when the pattern shown was rewritten from a longer one. */
  readonly simplifiedFrom?: Find['simplifiedFrom'];
  /** The preset this braid is, if it is one. */
  readonly known: string | null;
}

export const FAMILY_LABEL: Record<Family, string> = {
  disk: 'Disk moves',
  swap: 'Neighbor swaps',
  gap: 'Gap braid',
};

/** The card's signature: the same for any two cards of the same braid. */
export const keyOf = (c: Card): string => c.profile.signature;
export const isRound = (c: Card): boolean => c.profile.shape === 'round';
/** Crossings that undo each other. */
export const waste = ({ profile }: { profile: BraidProfile }): number => profile.crossings.played - profile.crossings.kept;
/** Each thread's color, by thread id. */
export const colorsOf = (c: Card): string[] => c.setup.threads.map(t => t.color);

/** A coloring that shows the structure: 2–4 palette colors, alternating, in pairs, or in blocks. */
export function colorize(threads: number, random: Random): string[] {
  const order = [0, 5, 2, 1, 3, 4, 6];
  const k = randomInt(random, 2, 4);
  const base = [...order].sort(() => random() - 0.5).slice(0, k);
  const mode = pickOne(random, ['pairs', 'alt', 'blocks'] as const);
  return [...Array(threads).keys()].map(i => PALETTE[base[mode === 'alt' ? i % k : mode === 'pairs' ? Math.floor(i / 2) % k : Math.floor((i * k) / threads)]!]!);
}

/** The same card in new colors, one per thread. */
export const withColors = (c: Card, colors: readonly string[]): Card => ({
  ...c,
  setup: {
    ...c.setup,
    threads: c.setup.threads.map((t, i) => ({
      ...t,
      color: colors[i] ?? t.color,
    })),
  },
});

/** A card for something the explorer found, in the given colors (one per thread). */
export const cardFromFind = (f: Find, colors: readonly string[], known: string | null): Card => ({
  setup: {
    slots: f.slots,
    threads: f.threads.map((slot, i) => ({
      slot,
      color: colors[i] ?? PALETTE[0],
    })),
    pattern: f.pattern,
  },
  profile: f.profile,
  family: f.family,
  ...(f.simplifiedFrom ? { simplifiedFrom: f.simplifiedFrom } : {}),
  known,
});

/** The family of pattern a preset belongs to, as the explorer would label it. */
const familyOf = (p: Preset): Family => (p.group === 'weave' ? 'swap' : p.group === 'gap' ? 'gap' : 'disk');

/** A preset as a pattern card, in its default colors (or the ones given). */
export function presetCard(p: Preset, colors?: readonly string[]): Card | null {
  const setup = fromPreset(p);
  const profile = profileNotation(
    setup.slots,
    setup.threads.map(t => t.slot),
    setup.pattern,
  );
  if (!profile) return null;
  const card: Card = { setup, profile, family: familyOf(p), known: p.name };
  return colors ? withColors(card, colors) : card;
}
