import { useMemo } from 'react';
import { checkPattern } from 'kumihimo';
import { describeFindings, type Line } from '../lib/messages';
import type { Run } from '../lib/diskSetup';

export interface CheckSummary {
  readonly lines: readonly Line[];
  /** Errors plus warnings. */
  readonly issues: number;
  readonly broken: boolean;
}

/** Run the engine's pattern check on a run and put the findings into words. */
export function usePatternCheck(run: Run, name: (thread: number) => string): CheckSummary {
  return useMemo(() => {
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
    };
    // `name` reads the same threads the run was made from
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
}
