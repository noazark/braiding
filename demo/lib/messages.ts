/**
 * The words. The engine reports what it found as data; this module says it to the reader.
 *
 * The site is often someone's first look at braiding, so every message says what happened, why it
 * matters for a real cord, and (where it can) what to do. Wording changes are deliberate:
 * `messages.test.ts` locks this copy against the original simulator's.
 */
import type { Finding, Halt, NotationError } from 'kumihimo';

export type Tone = 'ok' | 'info' | 'warn' | 'err';

/** One line of the pattern check, ready to show. `step` links to a step to jump to. */
export interface Line {
  readonly tone: Tone;
  readonly text: string;
  readonly step?: number;
}

const TONE = { ok: 'ok', info: 'info', warn: 'warn', error: 'err' } as const;

/** Why a pattern couldn't be read, as one short sentence fragment. */
export const notationErrorText = (e: NotationError): string => e.message;

/** Why the disk stopped, or '' if it didn't stop for a problem. */
export function haltText(h: Halt | null): string {
  if (!h) return '';
  switch (h.reason) {
    case 'empty-slot':
      return `Step ${h.step}: slot ${h.slot + 1} is empty`;
    case 'no-threads':
      return 'No threads loaded';
    case 'no-moves':
      return '';
  }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const times = (turns: number) => {
  const a = Math.abs(turns);
  return a % 1 ? a.toFixed(2) : String(a);
};

/**
 * Put each finding into words. `name` says how to refer to a thread (the site uses its starting
 * slot: "slot 3").
 */
export function describeFindings(findings: readonly Finding[], name: (thread: number) => string): Line[] {
  const list = (ids: readonly number[]) => (ids.length > 4 ? ids.slice(0, 4).map(name).join(', ') + ` and ${ids.length - 4} more` : ids.map(name).join(', '));
  return findings.map((f): Line => {
    const tone = TONE[f.level];
    switch (f.code) {
      case 'no-threads':
        return {
          tone,
          text: 'No threads on the disk. Drag a color onto a slot to add one.',
        };
      case 'gap-but-full':
        return {
          tone,
          text: 'The pattern uses E (the gap), but every slot is full.',
        };
      case 'halted':
        return {
          tone,
          text: `${haltText(f.halt)}, so the pattern stops there. Fix that move first; the other checks need the pattern to keep going.`,
          step: f.step,
        };
      case 'disconnected':
        return {
          tone,
          text: `Disconnected: the threads form ${f.groups.length} separate braids that never cross each other (${f.groups
            .map(g => '[' + list(g) + ']')
            .join(' · ')}). They will come apart into ${f.groups.length} cords.`,
        };
      case 'loose': {
        const n = f.threads.length;
        return {
          tone,
          text: `${n === 1 ? 'The thread in ' + list(f.threads) + ' is' : 'The threads in ' + list(f.threads) + ' are'} never crossed and never moved, so ${plural(n, 'it runs', 'they run')} straight down, not braided in.`,
        };
      }
      case 'passive': {
        const n = f.threads.length;
        return {
          tone,
          text: `${plural(n, 'The thread in', 'The threads in')} ${list(f.threads)} ${plural(n, 'is', 'are')} only ever passed over, never moved. Fine for a core or a stripe, but ${plural(n, 'it', 'they')} won't wrap the cord.`,
        };
      }
      case 'idle-moves': {
        const n = f.count;
        return {
          tone,
          text: `${n} move${n > 1 ? 's' : ''} ${scopeText(f.scope)} only re-space threads (${n > 1 ? 'they cross' : 'it crosses'} nothing). Normal on a real disk; no effect on the braid.`,
          step: f.step,
        };
      }
      case 'stacked': {
        const n = f.count;
        return {
          tone,
          text: `${n} move${n > 1 ? 's' : ''} ${scopeText(f.scope)} ${n > 1 ? 'drop threads' : 'drops a thread'} into a slot that's already filled. On a real disk two threads in one slot tend to tangle.`,
          step: f.step,
        };
      }
      case 'undo':
        return {
          tone,
          text: 'A move is immediately reversed by the next one, so the pair cancels out.',
          step: f.step,
        };
      case 'no-weaving':
        return {
          tone,
          text: `No weaving: the threads in ${list(f.top)} only ever go over, and the ones in ${list(f.bottom)} only ever go under. The layers never interlock, so the cord would lift apart into a top layer and a bottom layer.`,
        };
      case 'only-over': {
        const n = f.threads.length;
        return {
          tone,
          text: `${n === 1 ? 'The thread in ' + list(f.threads) + ' only ever goes' : 'The threads in ' + list(f.threads) + ' only ever go'} over others, never under, so ${plural(n, 'it sits', 'they sit')} loose on the surface instead of being locked in.`,
        };
      }
      case 'only-under': {
        const n = f.threads.length;
        return {
          tone,
          text: `${n === 1 ? 'The thread in ' + list(f.threads) + ' only ever goes' : 'The threads in ' + list(f.threads) + ' only ever go'} under others, never over, so ${plural(n, 'it is', 'they are')} buried rather than woven in.`,
        };
      }
      case 'repeats':
        return {
          tone,
          text:
            `Repeats every ${f.length} move${f.length > 1 ? 's' : ''}` +
            (f.leadIn > 0 ? ` (after a ${f.leadIn}-move lead-in)` : '') +
            (f.turns ? `, turning the disk ${times(f.turns)} time${Math.abs(f.turns) === 1 ? '' : 's'} per repeat` : '') +
            '.',
        };
      case 'no-repeat':
        return {
          tone,
          text: `Doesn't repeat within ${f.limit} moves. It may drift slowly, or just have a very long cycle.`,
        };
      case 'sound':
        return {
          tone,
          text: 'No problems found: every thread is braided into one connected cord.',
        };
    }
  });
}

const scopeText = (s: Extract<Finding, { scope: unknown }>['scope']) => (s.kind === 'repeat' ? 'per repeat' : `in the first ${s.moves} moves`);

/** "turns 2.13×", for compact labels. */
export const turnsLabel = times;
