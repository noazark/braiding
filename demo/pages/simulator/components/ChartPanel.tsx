import { useMemo, useRef, useState } from 'react';
import type { Timeline } from 'kumihimo';
import { StrandChart } from '../../../components/StrandChart';
import { useElementSize } from '../../../hooks/useElementSize';
import { usePersistentState } from '../../../hooks/usePersistentState';
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

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label
      style={{
        flex: '1 1 200px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: 600,
      }}
    >
      {label}
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  );
}

/** The strand chart, kept scrolled to the playhead, with its drawing settings. */
export function ChartPanel({ timeline, colors, playhead, check, onJump }: ChartPanelProps) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(box);
  const [colW, setColW] = usePersistentState('braidColW5', 12, v => v >= 12);
  const [slope, setSlope] = usePersistentState('braidSlope2', 0);
  const [corner, setCorner] = usePersistentState('braidCorner2', 1.5);
  const style = useMemo(
    () => ({
      bg: cssVar('--chartbg', '#fff'),
      accent: cssVar('--acc', '#000'),
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
        <div className="scrollbox" ref={box}>
          <StrandChart
            timeline={timeline}
            colors={colors}
            columnWidth={colW}
            steepness={slope}
            corner={corner}
            playhead={playhead}
            style={style}
            width={width}
            minHeight={height || 400}
            onRender={r => {
              if (r.playheadY != null && box.current) box.current.scrollTop = r.playheadY - box.current.clientHeight / 2;
            }}
          />
        </div>
        <CheckDrawer check={check} open={checkOpen} onToggle={() => setCheckOpen(o => !o)} onJump={onJump} />
      </div>
      <div className="ctl">
        <Slider label="Width" min={12} max={60} value={colW} onChange={setColW} />
        <Slider label="Height" min={0} max={100} value={Math.round(slope * 100)} onChange={v => setSlope(v / 100)} />
        <Slider label="Corners" min={0} max={200} value={Math.round(corner * 100)} onChange={v => setCorner(v / 100)} />
      </div>
    </div>
  );
}
