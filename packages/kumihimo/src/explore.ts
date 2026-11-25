/**
 * Exploring: turning random candidates into tidy, comparable braids.
 *
 * {@link refineCandidate} profiles a generated {@link Candidate} and, when it is a real braid,
 * tidies it for display:
 *
 * - A swap pattern with needless crossings is rewritten in its simplified form, when that form is
 *   no longer than the original and is itself free of needless crossings.
 * - A flat braid is renumbered so the gap its strands never cross falls at the strand chart's
 *   wrap-around seam. The chart then shows the band whole instead of split across the edges.
 *
 * Two finds are the same braid when their `profile.signature`s are equal.
 *
 * @module
 */

import type { Candidate } from './generate.js';
import { parsePattern, renumberPattern } from './notation.js';
import { profileBraid, type BraidProfile, type ProfileOptions } from './profile.js';
import { mod } from './ring.js';

/** A candidate that makes a real braid, ready to show. */
export interface Find extends Candidate {
  readonly profile: BraidProfile;
  /** Set when the pattern shown was rewritten from a longer one. */
  readonly simplifiedFrom?: {
    readonly pattern: string;
    /** Crossings the original played in one repeat. */
    readonly played: number;
    /** How many of those undid each other. */
    readonly canceled: number;
  };
}

/** Profile a pattern written in notation. Returns `null` if it can't be read or isn't a braid. */
export function profileNotation(
  slots: number,
  threads: readonly number[],
  text: string,
  options: ProfileOptions = {},
): BraidProfile | null {
  const parsed = parsePattern(text, slots);
  if (!parsed.ok) return null;
  const r = profileBraid({ slots, threads, pattern: parsed.pattern }, options);
  return r.ok ? r.profile : null;
}

const tokenCount = (t: string) => t.trim().split(/\s+/).length;

/**
 * Keep a candidate only if it makes a real braid, tidied for display (see module notes).
 * Pass a shared `random` to make a whole exploration reproducible from one seed.
 */
export function refineCandidate(candidate: Candidate, options: ProfileOptions = {}): Find | null {
  const { slots } = candidate;
  const r = profileNotation(slots, candidate.threads, candidate.pattern, options);
  if (!r) return null;
  let find: Find = { ...candidate, profile: r };

  if (candidate.family === 'swap' && r.crossings.kept < r.crossings.played && tokenCount(r.unitNotation) <= tokenCount(candidate.pattern)) {
    const r2 = profileNotation(slots, candidate.threads, r.unitNotation, options);
    if (r2 && r2.crossings.kept === r2.crossings.played) {
      find = {
        ...candidate,
        pattern: r.unitNotation,
        profile: r2,
        simplifiedFrom: { pattern: candidate.pattern, played: r.crossings.played, canceled: r.crossings.played - r.crossings.kept },
      };
    }
  }
  return find.profile.shape === 'round' ? find : openFlat(find, options);
}

/** Renumber a pattern's fixed slots `by` places counterclockwise (text in, text out). */
function renumberText(text: string, by: number, slots: number): string {
  const p = parsePattern(text, slots);
  return p.ok ? renumberPattern(p.pattern, by, slots).map(t => t.text).join(' ') : text;
}

/** Move a flat braid's open gap to the chart seam, if it isn't there already. */
function openFlat(find: Find, options: ProfileOptions): Find {
  if (!find.profile.crossesSeam) return find;
  const N = find.slots;
  for (let r = 1; r < N; r++) {
    const threads = find.threads.map(s => mod(s - r, N)).sort((a, b) => a - b);
    const pattern = renumberText(find.pattern, r, N);
    const r2 = profileNotation(N, threads, pattern, options);
    if (r2 && r2.shape === 'flat' && !r2.crossesSeam) {
      return {
        ...find,
        threads,
        pattern,
        profile: r2,
        ...(find.simplifiedFrom ? { simplifiedFrom: { ...find.simplifiedFrom, pattern: renumberText(find.simplifiedFrom.pattern, r, N) } } : {}),
      };
    }
  }
  return find;
}
