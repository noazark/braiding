import { mod, type Pattern } from 'kumihimo';

/** Rows kept in the list around the current step: a couple above (faded), the next ones, and one below (faded). */
const OFFSETS = [-2, -1, 0, 1, 2, 3];

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
