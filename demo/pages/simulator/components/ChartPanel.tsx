import { useMemo, useRef, useState } from 'react';
import type { Timeline } from 'kumihimo';
import { StrandChart } from '../../../components/StrandChart';
import { useElementSize } from '../../../hooks/useElementSize';
import type { CheckSummary } from '../../../hooks/usePatternCheck';
import { CheckDrawer } from './CheckDrawer';

/** A CSS custom property's value from the page (the skin decides the chart's colors). */
const cssVar = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export interface ChartPanelProps {
  readonly timeline: Timeline;
  readonly colors: readonly string[];
  readonly playhead: number;
  /** The pattern check, shown in a drawer that slides up over the chart. */
  readonly check: CheckSummary;
  readonly onJump: (step: number) => void;
}

/** How the chart is drawn: narrow columns, flat crossings, rounded S-bends. */
const COLUMN_WIDTH = 12;
const STEEPNESS = 0;
const CORNER = 1.5;

/** The strand chart, exactly as tall as its box and following the playhead, with the pattern check over its bottom edge. */
export function ChartPanel({ timeline, colors, playhead, check, onJump }: ChartPanelProps) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(box);
  const style = useMemo(
    () => ({
      bg: cssVar('--chartbg', '#fff'),
      tw: 5,
      outline: '#000',
      ow: 2.5,
    }),
    [],
  );
  const [checkOpen, setCheckOpen] = useState(false);
  return (
    <div className="card chartcard">
      <div className={'chartwrap' + (checkOpen ? ' open' : '')}>
        <div className="scrollbox fit" ref={box}>
          <StrandChart
            timeline={timeline}
            colors={colors}
            columnWidth={COLUMN_WIDTH}
            steepness={STEEPNESS}
            corner={CORNER}
            playhead={playhead}
            style={style}
            width={width}
            minHeight={height || 400}
            follow
          />
        </div>
        <CheckDrawer check={check} open={checkOpen} onToggle={() => setCheckOpen(o => !o)} onJump={onJump} />
      </div>
    </div>
  );
}
