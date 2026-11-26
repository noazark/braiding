import { mod, type Pattern, type Timeline } from 'kumihimo';
import './pattern-steps.css';

/**
 * Rows kept in the list around the current step: the current one, the next two, and hidden rows on
 * either side. The hidden rows are there so that when the list moves more than one row at once (a
 * pattern step that makes no move of its own, or stepping back), every row that ends up showing was
 * already there and slides into place, instead of appearing on top of one still sliding.
 */
const OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

export interface PatternStepsProps {
  readonly pattern: Pattern;
  /**
   * How many steps have been played, counting every pass through the pattern (so it only goes up).
   * Each time it goes up, the whole list moves up one row.
   */
  readonly position: number;
}

/**
 * The pattern steps: the pattern as an endless list that scrolls up one row per move. Every row moves
 * together; only the current step (highlighted), the next and, dimmer, the one after are visible, and
 * rows fade in and out as they pass. Rows are keyed by their place in the endless run of steps, so each
 * row element keeps its identity and CSS animates it sliding up.
 */
export function PatternSteps({ pattern, position }: PatternStepsProps) {
  if (!pattern.length) return null;
  return (
    <div className="pattern-steps">
      {OFFSETS.map(offset => {
        const n = position + offset;
        const role = offset === 0 ? 'now' : offset === 1 ? 'next' : offset === 2 ? 'later' : 'hidden';
        return (
          <span key={n} className={'pattern-step ' + role} style={{ '--o': offset } as React.CSSProperties}>
            {pattern[mod(n, pattern.length)]!.text}
          </span>
        );
      })}
    </div>
  );
}

/** Per run: how many pattern steps have been played by each step of it (see {@link stepsPlayed}). */
const played = new WeakMap<Timeline, number[]>();

/**
 * The list position for step `n` of a run: the place, in the endless run of pattern steps, of the one
 * step `n` played (step 0, the loaded disk, shows the first). Steps the run passes over without a
 * move (a pattern step that does nothing) are counted too, so the list moves past them.
 */
export function stepsPlayed(timeline: Timeline, length: number, n: number): number {
  if (!length || n <= 0 || !timeline.at(n)?.move) return 0;
  let p = played.get(timeline);
  if (!p) played.set(timeline, (p = [0]));
  while (p.length <= n) {
    const k = p.length;
    const tok = timeline.at(k)?.move?.token ?? 0;
    const before = k > 1 ? (timeline.at(k - 1)?.move?.token ?? -1) : -1;
    p.push(p[k - 1]! + (mod(tok - before, length) || length));
  }
  return p[n]! - 1;
}
