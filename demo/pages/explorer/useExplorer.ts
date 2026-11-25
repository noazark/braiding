import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { generators, refineCandidate } from 'kumihimo';
import { KNOWN, cardFromFind, colorize, colorsOf, keyOf, matches, pickFamily, presetCards, waste, withColors, type Card, type Settings } from './model';
import { loadFinds, saveFinds } from './storage';

/** Exploring is meant to surprise: fresh randomness each visit. */
const random = Math.random;
/** Give up on a search after this many patterns. */
const CAP = 40000;

/**
 * The pattern cards (starting with the presets) and the search that adds to them. Each search runs
 * until it finds one braid that isn't on the grid yet, fits its settings, and has no needless moves
 * (no crossings that undo each other), adds it at the end, and stops. Finds are kept between visits
 * (see `storage.ts`). One search runs at a time. Work is done in ~30ms slices between frames so the page stays
 * responsive.
 */
export function useExplorer(likes: ReadonlySet<string>) {
  // the presets, then the finds saved from earlier visits; built once, not on every render
  const [initial] = useState(() => {
    const m = new Map<string, Card>(presetCards());
    for (const c of loadFinds()) if (!m.has(keyOf(c))) m.set(keyOf(c), c);
    return m;
  });
  const found = useRef(initial);
  const [version, changed] = useReducer((n: number) => n + 1, 0);

  // keep the finds (not the presets) for next visit whenever they change; liked ones are always kept
  useEffect(() => {
    if (version)
      saveFinds(
        [...found.current.values()].filter(c => !c.known),
        likes,
      );
  }, [version, likes]);
  /** Patterns tried so far in the search under way, or null when idle. */
  const [searching, setSearching] = useState<number | null>(null);
  /** The most recent find, to highlight. */
  const [latest, setLatest] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const busy = useRef(false);
  /** Braids found during this visit. Not saved: "New" means new since the page loaded. */
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());

  /** Find one new braid that fits `s`; `then` gets its key (or null if none turned up). Ignored while a search runs. */
  const findOne = useCallback((s: Settings, then?: (key: string | null) => void) => {
    if (busy.current) return;
    busy.current = true;
    setNote('');
    const fits = matches(s.shape);
    let n = 0;
    const step = () => {
      const t0 = performance.now();
      let added: string | null = null;
      while (!added && n < CAP && performance.now() - t0 < 30) {
        n++;
        const c = generators[pickFamily(random, s.family)](s.maxThreads, random);
        const f = c && refineCandidate(c, { random });
        if (!f) continue;
        const key = f.profile.signature;
        const old = found.current.get(key);
        if (old) {
          // a braid already on the grid: keep a find's tidiest version (presets stay as written)
          if (!old.known && (waste(f) < waste(old) || (waste(f) === waste(old) && f.pattern.length < old.setup.pattern.length)))
            found.current.set(key, cardFromFind(f, colorsOf(old), null));
          continue;
        }
        // only patterns where every move counts: none whose crossings undo each other
        if (waste(f) > 0) continue;
        const card = cardFromFind(f, colorize(f.profile.strands, random), KNOWN.get(key) ?? null);
        if (!fits(card)) continue;
        found.current.set(key, card);
        added = key;
        setFresh(prev => new Set(prev).add(key));
      }
      if (added || n >= CAP) {
        if (!added) setNote(` · no new braid in ${CAP.toLocaleString()} tries; try other settings`);
        setLatest(added);
        setSearching(null);
        busy.current = false;
        changed();
        then?.(added);
      } else {
        setSearching(n);
        requestAnimationFrame(step);
      }
    };
    setSearching(0);
    requestAnimationFrame(step);
  }, []);

  const recolor = useCallback((key: string) => {
    const c = found.current.get(key);
    if (!c) return;
    found.current.set(key, withColors(c, colorize(c.profile.strands, random)));
    changed();
  }, []);

  return {
    entries: found.current,
    version,
    searching,
    latest,
    note,
    fresh,
    findOne,
    recolor,
  };
}
