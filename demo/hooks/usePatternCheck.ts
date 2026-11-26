import { useMemo } from 'react';
import { checkPattern } from 'kumihimo';
import { describeFindings, type Line } from '../lib/messages';
import type { Run } from '../lib/diskSetup';

export interface CheckSummary {
  readonly lines: readonly Line[];
  /** Errors plus warnings. */
  readonly issues: number;
  readonly broken: boolean;
  /** No threads, or no moves: there's nothing to check yet, which isn't a problem. */
  readonly empty: boolean;
}

/** What's missing from an empty disk or pattern, as a nudge (not a finding). */
function emptyLine(threads: number, moves: number): Line {
  const text = !threads && !moves ? 'The disk is empty: add some threads and write some moves.' : !moves ? 'No moves yet: write some and Apply.' : 'No threads yet: drag a color onto a slot to add one.';
  return { tone: 'info', text };
}

/** Run the engine's pattern check on a run and put the findings into words. */
export function usePatternCheck(run: Run, name: (thread: number) => string): CheckSummary {
  return useMemo(() => {
    const threads = run.timeline.at(0)!.positions.length;
    if (!run.error && (!threads || !run.pattern.length))
      return { lines: [emptyLine(threads, run.pattern.length)], issues: 0, broken: false, empty: true };
    const lines: Line[] = run.error
      ? [
          {
            tone: 'err',
            text: `The moves can't be read: ${run.error.message}.`,
          },
        ]
      : describeFindings(checkPattern(run.timeline), name);
    return {
      lines,
      issues: lines.filter(l => l.tone === 'err' || l.tone === 'warn').length,
      broken: lines.some(l => l.tone === 'err'),
      empty: false,
    };
    // `name` reads the same threads the run was made from
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
}
