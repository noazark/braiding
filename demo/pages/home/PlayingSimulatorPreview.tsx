import { useMemo, useRef } from 'react';
import { SimulatorPreview } from '../../components/SimulatorPreview';
import { useIsVisible } from '../../hooks/useIsVisible';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { useStepper } from '../../hooks/useStepper';
import { runOf, type DiskSetup } from '../../lib/diskSetup';
import { PatternSteps, stepsPlayed } from '../../components/PatternSteps';

const TURN_MS = 900;
const MOVE_MS = 850;
const REST_MS = 900;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The simulator's card on the home page: the {@link SimulatorPreview} playing a pattern on its own.
 * Each step the moving thread is carried across the disk into its new slot; when the pattern says `R`,
 * the whole disk turns first. The pattern steps beside it show the step being played and what's next.
 * Pauses while off screen, and holds still with reduced motion.
 */
export function PlayingSimulatorPreview({ setup }: { setup: DiskSetup }) {
  const { timeline, pattern } = runOf(setup);
  const N = setup.slots;
  const colors = useMemo(() => setup.threads.map(t => t.color), [setup]);

  const box = useRef<HTMLDivElement>(null);
  const visible = useIsVisible(box);
  const still = usePrefersReducedMotion();
  const turned = (s: number) => timeline.at(s)!.turn !== timeline.at(s - 1)!.turn;
  const { step, t } = useStepper(visible && !still, s => (turned(s) ? TURN_MS : 0) + MOVE_MS + REST_MS);

  const prev = timeline.at(step - 1)!;
  const cur = timeline.at(step) ?? prev;
  // phase 1: turn the disk (if the pattern turned it); phase 2: carry the thread across
  const turnMs = still || !turned(step) ? 0 : TURN_MS;
  const turnT = still ? 1 : ease(turnMs ? t / turnMs : 1);
  const moveT = ease((t - turnMs) / MOVE_MS);
  const spin = -lerp(prev.turn, cur.turn, turnT) * (360 / N);

  // how far through the endless run of steps: the turn while the disk turns, then the move
  const position = still || !cur.move ? 0 : stepsPlayed(timeline, pattern.length, step) - (turnMs && t < turnMs ? 1 : 0);

  return (
    <div className="playing-preview" ref={box} aria-hidden="true">
      <PatternSteps pattern={pattern} position={position} />
      {still ? (
        <SimulatorPreview slots={N} colors={colors} positions={timeline.at(0)!.positions} />
      ) : (
        <SimulatorPreview slots={N} colors={colors} positions={cur.positions} move={cur.move} progress={moveT} spin={spin} />
      )}
    </div>
  );
}
