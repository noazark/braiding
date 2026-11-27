/**
 * The move notation: how a braiding pattern is written down.
 *
 * A pattern is a short list of moves, separated by spaces, commas or semicolons, that is played
 * over and over forever. Slots are numbered `1 … N` clockwise, slot 1 just right of the top.
 *
 * | Token    | Meaning                                                                                  |
 * | -------- | ---------------------------------------------------------------------------------------- |
 * | `1>15`   | **Move**: lift the thread in slot 1 and drop it into slot 15, over everything between.   |
 * | `3*4`    | **Swap**: the threads in slots 3 and 4 trade places; the one from 3 goes over.           |
 * | `R-8`    | **Turn**: rotate the disk. Every slot number after this is shifted by −8 (cumulative).   |
 * | `E`      | **The gap**: the slot emptied most recently (at the start, the first empty slot).        |
 * | `E+3>E`  | Gap-relative move: take the third thread clockwise from the gap and drop it in the gap.  |
 *
 * Counting from the gap skips empty slots: `E+3` is the third *thread* clockwise, however the threads
 * are spaced, so a gap pattern still works on a disk with more than one empty slot. For the same
 * reason a thread dropped into the gap goes the way past fewer threads (the short way round on a disk
 * with one empty slot).
 *
 * Inside this package slots are **0-based indices** (`0 … N-1`). Only the written notation uses
 * the 1-based numbers printed on a disk; {@link parsePattern} and {@link formatPattern} convert.
 *
 * @module
 */

import { mod } from './ring.js';

/** Where a move starts or ends: a fixed slot, or a slot counted from the gap. */
export type SlotRef =
  /** A slot by its 0-based index, as written before any disk turns are applied. */
  | { readonly kind: 'slot'; readonly index: number }
  /** The `offset`th thread clockwise from the gap (negative = counterclockwise), skipping empty slots. `E` is offset 0. */
  | { readonly kind: 'gap'; readonly offset: number };

/** A thread move: `a>b` (move) or `a*b` (swap). */
export interface MoveToken {
  readonly kind: 'move' | 'swap';
  readonly from: SlotRef;
  readonly to: SlotRef;
  /** The token as it was written, for display. */
  readonly text: string;
}

/** A disk turn: `R+3`, `R-8`. */
export interface TurnToken {
  readonly kind: 'turn';
  /** How many slots the numbering shifts by. */
  readonly by: number;
  readonly text: string;
}

/** One step of a pattern as written. */
export type Token = MoveToken | TurnToken;

/** A parsed pattern: the tokens that repeat forever. */
export type Pattern = readonly Token[];

/** Why a pattern couldn't be read. */
export type NotationError =
  | { readonly code: 'unreadable'; readonly token: string; readonly message: string }
  | {
      readonly code: 'slot-out-of-range';
      readonly token: string;
      /** The 1-based slot number as written. */
      readonly slot: number;
      readonly slots: number;
      readonly message: string;
    }
  | { readonly code: 'no-moves'; readonly message: string };

/** The outcome of {@link parsePattern}: either a pattern or the reason it couldn't be read. */
export type ParseResult =
  | { readonly ok: true; readonly pattern: Pattern }
  | { readonly ok: false; readonly error: NotationError };

const TURN = /^R([+-]?\d+)$/i;
const MOVE = /^(E(?:[+-]\d+)?|\d+)([>*])(E(?:[+-]\d+)?|\d+)$/i;

/** Split written moves into their raw tokens. */
export const splitTokens = (text: string): string[] => String(text).split(/[\s,;]+/).filter(Boolean);

/**
 * Read a written pattern for a disk with `slots` slots.
 *
 * Never throws: an unreadable pattern comes back as `{ ok: false, error }`, with an error `code`
 * an app can turn into its own wording and a plain-English `message` it can show as is.
 *
 * @example
 * const r = parsePattern('1>15 17>31 R-8', 32);
 * if (r.ok) r.pattern.length // 3
 */
export function parsePattern(text: string, slots: number): ParseResult {
  const out: Token[] = [];
  for (const raw of splitTokens(text)) {
    const turn = raw.match(TURN);
    if (turn) {
      out.push({ kind: 'turn', by: Number(turn[1]), text: raw });
      continue;
    }
    const m = raw.match(MOVE);
    if (!m) return { ok: false, error: { code: 'unreadable', token: raw, message: `Can't read “${raw}”` } };
    const refs: SlotRef[] = [];
    for (const s of [m[1]!, m[3]!]) {
      if (/^E/i.test(s)) {
        refs.push({ kind: 'gap', offset: Number(s.slice(1) || 0) });
        continue;
      }
      const n = Number(s);
      if (n < 1 || n > slots) {
        return {
          ok: false,
          error: { code: 'slot-out-of-range', token: raw, slot: n, slots, message: `Slot ${n} is outside 1–${slots}` },
        };
      }
      refs.push({ kind: 'slot', index: n - 1 });
    }
    out.push({ kind: m[2] === '>' ? 'move' : 'swap', from: refs[0]!, to: refs[1]!, text: raw });
  }
  if (!out.some(t => t.kind !== 'turn')) {
    return { ok: false, error: { code: 'no-moves', message: 'Add at least one move' } };
  }
  return { ok: true, pattern: out };
}

/** Write one slot reference the way {@link parsePattern} reads it. */
export const formatSlotRef = (ref: SlotRef): string =>
  ref.kind === 'slot' ? String(ref.index + 1) : ref.offset === 0 ? 'E' : `E${ref.offset > 0 ? '+' : ''}${ref.offset}`;

/** Write one token in canonical form (ignores its original `text`). */
export const formatToken = (t: Token): string =>
  t.kind === 'turn' ? `R${t.by}` : `${formatSlotRef(t.from)}${t.kind === 'move' ? '>' : '*'}${formatSlotRef(t.to)}`;

/** Write a pattern back out as notation, one space between tokens. */
export const formatPattern = (pattern: Pattern): string => pattern.map(formatToken).join(' ');

/** True if any move in the pattern is counted from the gap (`E`). */
export const usesGap = (pattern: Pattern): boolean =>
  pattern.some(t => t.kind !== 'turn' && (t.from.kind === 'gap' || t.to.kind === 'gap'));

/**
 * The same pattern with every fixed slot renumbered `by` places counterclockwise, as if counting
 * started from a different slot. Gap-relative moves and turns are unchanged.
 */
export function renumberPattern(pattern: Pattern, by: number, slots: number): Pattern {
  const shift = (r: SlotRef): SlotRef => (r.kind === 'slot' ? { kind: 'slot', index: mod(r.index - by, slots) } : r);
  return pattern.map(t => {
    if (t.kind === 'turn') return t;
    const moved = { ...t, from: shift(t.from), to: shift(t.to) };
    return { ...moved, text: formatToken(moved) };
  });
}
