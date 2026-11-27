/**
 * The pattern check: does this pattern make a real braid, and if not, why not?
 *
 * {@link checkPattern} plays the pattern until it repeats and looks for the common ways a pattern
 * goes wrong. It returns {@link Finding}s: structured data with a `code`, a severity `level` and the
 * threads or steps involved. It deliberately returns no sentences: an app decides how to say each
 * finding to its readers (the demo site words them for beginners).
 *
 * | code            | level | what it means                                                         |
 * | --------------- | ----- | --------------------------------------------------------------------- |
 * | `no-threads`    | error | Nothing on the disk.                                                  |
 * | `gap-but-full`  | error | The pattern uses `E` but there's no empty slot.                       |
 * | `halted`        | error | A move lifts from an empty slot, so the pattern stops there.          |
 * | `disconnected`  | error | The threads form separate groups that never cross: several cords.     |
 * | `loose`         | warn  | Some threads never cross or move: they hang straight down.            |
 * | `passive`       | info  | Some threads are only ever passed over, never moved: a core.          |
 * | `idle-moves`    | info  | Some moves cross nothing; they only re-space threads.                 |
 * | `stacked`       | warn  | A move drops a thread into a slot that's already full.                |
 * | `undo`          | warn  | A move is immediately reversed by the next one.                       |
 * | `no-weaving`    | error | Some threads only go over, the rest only under: two loose layers.     |
 * | `only-over`     | warn  | Some threads never go under: they sit loose on the surface.           |
 * | `only-under`    | warn  | Some threads never go over: they're buried, not woven in.             |
 * | `repeats`       | ok    | The pattern repeats every so many moves.                              |
 * | `no-repeat`     | info  | No repeat found within the move limit.                                |
 * | `sound`         | ok    | No errors or warnings: one connected, woven cord.                     |
 *
 * Findings come in a fixed order, with `sound` first when present.
 *
 * @module
 */

import { Timeline, type Halt, type Setup } from './disk.js';
import { usesGap } from './notation.js';
import { findRepeat } from './repeat.js';

export type Level = 'ok' | 'info' | 'warn' | 'error';

/** Which moves a count covers: one repeat, or (if none was found) the first `moves` moves. */
export type Scope = { readonly kind: 'repeat' } | { readonly kind: 'first'; readonly moves: number };

/** One thing the check found. Thread lists hold thread ids (indices into `setup.threads`). */
export type Finding =
  | { readonly code: 'no-threads'; readonly level: 'error' }
  | { readonly code: 'gap-but-full'; readonly level: 'error' }
  | { readonly code: 'halted'; readonly level: 'error'; readonly halt: Halt; readonly step: number }
  | { readonly code: 'disconnected'; readonly level: 'error'; readonly groups: readonly (readonly number[])[] }
  | { readonly code: 'loose'; readonly level: 'warn'; readonly threads: readonly number[] }
  | { readonly code: 'passive'; readonly level: 'info'; readonly threads: readonly number[] }
  | { readonly code: 'idle-moves'; readonly level: 'info'; readonly count: number; readonly scope: Scope; readonly step: number }
  | { readonly code: 'stacked'; readonly level: 'warn'; readonly count: number; readonly scope: Scope; readonly step: number }
  | { readonly code: 'undo'; readonly level: 'warn'; readonly step: number }
  | { readonly code: 'no-weaving'; readonly level: 'error'; readonly top: readonly number[]; readonly bottom: readonly number[] }
  | { readonly code: 'only-over'; readonly level: 'warn'; readonly threads: readonly number[] }
  | { readonly code: 'only-under'; readonly level: 'warn'; readonly threads: readonly number[] }
  | { readonly code: 'repeats'; readonly level: 'ok'; readonly length: number; readonly leadIn: number; readonly turns: number }
  | { readonly code: 'no-repeat'; readonly level: 'info'; readonly limit: number }
  | { readonly code: 'sound'; readonly level: 'ok' };

export type FindingCode = Finding['code'];

export interface CheckOptions {
  /** Moves to play while looking for a repeat. Default 2000. */
  readonly limit?: number;
}

/** True if any finding is an error. */
export const hasErrors = (findings: readonly Finding[]): boolean => findings.some(f => f.level === 'error');

/** The findings that need attention (errors and warnings). */
export const problems = (findings: readonly Finding[]): Finding[] => findings.filter(f => f.level === 'error' || f.level === 'warn');

/**
 * Check a pattern for the common ways it can fail to make a braid. Pure: the same setup always
 * gives the same findings. Pass a {@link Timeline} you already have to reuse its steps.
 */
export function checkPattern(setup: Setup | Timeline, options: CheckOptions = {}): Finding[] {
  const tl = setup instanceof Timeline ? setup : new Timeline(setup);
  const { slots: N, threads, pattern } = tl.setup;
  const T = threads.length;
  const limit = options.limit ?? 2000;
  const out: Finding[] = [];
  if (!T) return [{ code: 'no-threads', level: 'error' }];

  const gapped = usesGap(pattern);
  const empty = N - new Set(threads).size;
  if (gapped && empty === 0) out.push({ code: 'gap-but-full', level: 'error' });

  // run until the arrangement repeats
  const rep = findRepeat(tl, limit);
  const H = tl.steps;
  const n = H.length - 1;
  const end = rep ? rep.start + rep.length : n;
  const scope: Scope = rep ? { kind: 'repeat' } : { kind: 'first', moves: end };

  // who crosses whom
  const parent = [...Array(T).keys()];
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  const moved = new Set<number>();
  const touched = new Set<number>();
  const over = Array<number>(T).fill(0);
  const under = Array<number>(T).fill(0);
  let idle: number | null = null;
  let stack: number | null = null;
  let undo: number | null = null;
  let nIdle = 0;
  let nStack = 0;
  // counts cover one repeat (or everything played, if none was found)
  const windowStart = rep ? rep.start + 1 : 1;
  for (let s = 1; s <= end; s++) {
    const m = H[s]!.move!;
    const inWindow = s >= windowStart;
    moved.add(m.thread);
    touched.add(m.thread);
    for (const q of m.passed) {
      parent[find(q)] = find(m.thread);
      touched.add(q);
      over[m.thread]!++;
      under[q]!++;
    }
    if (m.partner != null) {
      moved.add(m.partner);
      touched.add(m.partner);
    }
    if (inWindow && !m.passed.length && m.partner == null) {
      nIdle++;
      idle ??= s;
    }
    if (inWindow && m.stacked) {
      nStack++;
      stack ??= s;
    }
    const pm = s > 1 ? H[s - 1]!.move : null;
    if (!undo && pm && pm.thread === m.thread && pm.from === m.to && pm.to === m.from) undo = s;
  }

  if (tl.halt && tl.halt.reason !== 'no-moves') {
    out.push({ code: 'halted', level: 'error', halt: tl.halt, step: n });
    return out;
  }

  const groups = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    if (!touched.has(t)) continue;
    const r = find(t);
    groups.set(r, [...(groups.get(r) || []), t]);
  }
  const loose = [...Array(T).keys()].filter(t => !touched.has(t));
  if (groups.size > 1) out.push({ code: 'disconnected', level: 'error', groups: [...groups.values()] });
  if (loose.length) out.push({ code: 'loose', level: 'warn', threads: loose });
  const still = [...touched].filter(t => !moved.has(t));
  if (still.length) out.push({ code: 'passive', level: 'info', threads: still });
  // moves that cross nothing only re-space threads: normal on a real disk, so a note, not a problem
  if (nIdle) out.push({ code: 'idle-moves', level: 'info', count: nIdle, scope, step: idle! });
  if (nStack) out.push({ code: 'stacked', level: 'warn', count: nStack, scope, step: stack! });
  if (undo) out.push({ code: 'undo', level: 'warn', step: undo });

  // weaving: a braid only holds together if threads take turns going over and under
  const top = [...touched].filter(t => over[t] && !under[t]);
  const bottom = [...touched].filter(t => under[t] && !over[t]);
  if (top.length && bottom.length && top.length + bottom.length === touched.size) {
    out.push({ code: 'no-weaving', level: 'error', top, bottom });
  } else if (top.length) out.push({ code: 'only-over', level: 'warn', threads: top });
  else if (bottom.length) out.push({ code: 'only-under', level: 'warn', threads: bottom });

  if (rep) out.push({ code: 'repeats', level: 'ok', length: rep.length, leadIn: rep.leadIn, turns: rep.turns });
  else out.push({ code: 'no-repeat', level: 'info', limit });
  if (!problems(out).length) out.unshift({ code: 'sound', level: 'ok' });
  return out;
}
