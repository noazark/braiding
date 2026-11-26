import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePatternCheck } from '../../hooks/usePatternCheck';
import { haltText } from '../../lib/messages';
import { PALETTE } from '../../lib/palette';
import { runOf } from '../../lib/diskSetup';
import { ChartPanel } from './components/ChartPanel';
import { SimulatorPreview } from '../../components/SimulatorPreview';
import { DragGhost } from './components/DragGhost';
import { NotationHelp } from './components/NotationHelp';
import { PatternEditor } from './components/PatternEditor';
import { ThreadPalette } from './components/ThreadPalette';
import { Transport } from './components/Transport';
import type { Brush } from './model';
import { useDiskDrag } from './useDiskDrag';
import { useDiskSetup } from './useDiskSetup';
import { useMoveTween } from './useMoveTween';
import { usePlayhead } from './usePlayhead';

/**
 * On smaller screens the thread tools fold away when the notation help opens (and the other way
 * round), so the disk and its controls stay in view.
 */
function useFoldingPanels() {
  const compact = useMediaQuery('(max-height:960px),(max-width:900px)');
  const [threadsOpen, setThreadsOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('compact', compact);
  }, [compact]);
  return {
    threadsOpen: compact ? threadsOpen : true,
    helpOpen,
    toggleThreads: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!compact) return;
      if (!threadsOpen) setHelpOpen(false);
      setThreadsOpen(!threadsOpen);
    },
    toggleHelp: (e: React.MouseEvent) => {
      e.preventDefault();
      if (compact && !helpOpen) setThreadsOpen(false);
      setHelpOpen(!helpOpen);
    },
  };
}

export function SimulatorApp() {
  const disk = useDiskSetup();
  const { slots, threads } = disk.setup;
  const run = runOf(disk.setup);
  const { timeline } = run;
  const colors = threads.map(t => t.color);
  const playhead = usePlayhead(timeline);
  const check = usePatternCheck(run, id => `slot ${threads[id]!.slot + 1}`);
  const [brush, setBrush] = useState<Brush>(PALETTE[0]);
  const svg = useRef<SVGSVGElement>(null);
  const { drag, begin, onDiskPointerDown } = useDiskDrag({
    svg,
    slots,
    threads,
    brush,
    onDragStart: playhead.toStart,
    onEdit: disk.edit,
  });
  const panels = useFoldingPanels();

  const step = timeline.steps[playhead.step]!;
  // each step forward plays its move: within the step's time while playing (a little under, so it lands
  // before the next one starts), at an easy pace when stepping by hand
  const moveT = useMoveTween(playhead.step, playhead.playing ? playhead.stepMs * 0.9 : 360, playhead.reducedMotion);
  const error = run.error ? '' : haltText(timeline.halt);
  // anything that changes the disk starts again from the loaded disk
  const thenRewind =
    <A extends unknown[]>(f: (...a: A) => unknown) =>
    (...a: A) => {
      playhead.toStart();
      f(...a);
    };

  return (
    <div className="band">
      <PageHeader title="Braiding simulator" current="simulator">
        <p className="sub">
          A ring of slots, some threads, and a pattern of moves. Each move carries a thread across the center, over the others, into a new slot. Step through it and watch
          the strands build up.
        </p>
      </PageHeader>

      <div className="stage">
        <div className="card diskcard">
          <div className="dkgrid">
            <div className="diskcol">
              <SimulatorPreview
                id="disk"
                label="Braiding disk"
                svgRef={svg}
                slots={slots}
                colors={colors}
                positions={step.positions}
                move={step.move}
                progress={moveT}
                markFrom
                hidden={drag?.moved && drag.src.kind === 'thread' ? drag.src.ix : undefined}
                overlay={<DragGhost drag={drag} slots={slots} brush={brush} />}
                onPointerDown={onDiskPointerDown}
              />
              <Transport
                step={step}
                playing={playhead.playing}
                speed={playhead.speed}
                onSpeed={playhead.setSpeed}
                threads={threads.length}
                slots={slots}
                error={error}
                atEnd={playhead.step === timeline.last}
                onGo={n => {
                  playhead.stop();
                  playhead.go(n);
                }}
                onToggle={playhead.toggle}
              />
            </div>
            <div className="ctrlcol">
              <ThreadPalette
                threads={threads}
                brush={brush}
                onBrush={setBrush}
                onSwatchPointerDown={(c, e) => begin({ kind: 'swatch', color: c }, e)}
                onShuffle={thenRewind(disk.shuffle)}
                onClear={thenRewind(disk.clear)}
                open={panels.threadsOpen}
                onSummaryClick={panels.toggleThreads}
              />
              <PatternEditor
                preset={disk.preset}
                onPreset={thenRewind(disk.loadPreset)}
                slots={slots}
                onSlots={thenRewind(disk.setSlots)}
                draft={disk.draft}
                onDraft={disk.setDraft}
                onApply={thenRewind(disk.apply)}
                error={run.error?.message ?? ''}
                pattern={run.pattern}
                activeToken={step.move?.token ?? null}
              />
              <NotationHelp open={panels.helpOpen} onSummaryClick={panels.toggleHelp} />
            </div>
          </div>
        </div>
        <ChartPanel
          timeline={timeline}
          colors={colors}
          playhead={playhead.step}
          check={check}
          onJump={n => {
            playhead.stop();
            playhead.go(n);
          }}
        />
      </div>
    </div>
  );
}
