/**
 * Keeping the explorer's finds between visits, in this browser's localStorage. Finds are stored whole
 * (pattern, analysis and colors) so they come back without re-analyzing anything. Only the newest
 * {@link MAX_SAVED} are kept (liked ones always are), so storage can't grow without limit.
 */
import { braidName, type Weave } from 'kumihimo';
import { keyOf, type Card } from './model';

const KEY = 'braid-explorer:finds:v1';
export const MAX_SAVED = 500;

/**
 * The finds as text to store, in their order: every one in `keep` (your likes), plus the newest of
 * the rest, up to {@link MAX_SAVED} in all.
 */
export function serializeFinds(finds: readonly Card[], keep: ReadonlySet<string> = new Set()): string {
  const kept = finds.filter(c => keep.has(keyOf(c))).length;
  let room = Math.max(0, MAX_SAVED - kept);
  const out: Card[] = [];
  for (let i = finds.length - 1; i >= 0; i--) {
    const e = finds[i]!;
    if (keep.has(keyOf(e))) out.push(e);
    else if (room > 0) {
      out.push(e);
      room--;
    }
  }
  return JSON.stringify(out.reverse());
}

/** Weave names from before they followed braiders' names, and what each is called now. */
const OLD_WEAVES: Readonly<Record<string, Weave>> = {
  plain: 'diamond',
  twill: 'regular',
  'broken twill': 'mixed',
  floating: 'Hercules',
  'long-float': 'long float',
};

/** A card saved under an old weave name, renamed (its braid name too), so old and new finds filter together. */
function upgrade(c: Card): Card {
  const weave = OLD_WEAVES[c.profile.traits?.weave as string];
  if (!weave) return c;
  const traits = { ...c.profile.traits, weave };
  return { ...c, profile: { ...c.profile, traits, name: braidName(traits) } };
}

/** Stored text back into pattern cards, dropping anything that doesn't look like one (old formats, hand edits). */
export function parseFinds(text: string | null): Card[] {
  if (!text) return [];
  try {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (c): c is Card =>
          !!c &&
          typeof c.setup?.pattern === 'string' &&
          typeof c.setup?.slots === 'number' &&
          Array.isArray(c.setup?.threads) &&
          c.setup.threads.every((t: unknown) => typeof (t as { color?: unknown })?.color === 'string') &&
          typeof c.profile?.signature === 'string',
      )
      .map(upgrade);
  } catch {
    return [];
  }
}

/** The finds saved last visit (empty if none, or if storage isn't available). */
export function loadFinds(): Card[] {
  try {
    return parseFinds(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Save the finds for next visit. Storage may be full or unavailable; finds then just aren't kept. */
export function saveFinds(finds: readonly Card[], keep?: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, serializeFinds(finds, keep));
  } catch {
    /* not saved this time */
  }
}

const PRESETS_KEY = 'braid-explorer:presets:v1';

/**
 * The presets as pattern cards, saved from an earlier visit, if they were made from the same presets
 * by the same engine (`stamp`; see {@link presetStamp}). Profiling them takes the better part of a
 * second, so they're worked out once and kept.
 */
export function loadPresetCards(stamp: string): [string, Card][] | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? 'null');
    if (!data || typeof data !== 'object' || (data as { stamp?: unknown }).stamp !== stamp) return null;
    const cards = parseFinds(JSON.stringify((data as { cards?: unknown }).cards ?? null));
    return cards.length ? cards.map(c => [keyOf(c), c]) : null;
  } catch {
    return null;
  }
}

/** Keep the presets' cards for next visit, under `stamp`. */
export function savePresetCards(stamp: string, cards: readonly Card[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify({ stamp, cards }));
  } catch {
    /* not saved this time: they're worked out again next visit */
  }
}
