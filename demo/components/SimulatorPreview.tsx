import type { ReactNode, Ref } from 'react';
import { slotPoint } from '../lib/diskGeometry';
import { BEAD_RADIUS, DiskFace, DiskShadow, Strand } from './DiskParts';

/** A move being shown: its thread (and a swap's partner) drawn bold on top, traveling between slots. */
export interface ShownMove {
  readonly thread: number;
  /** A swap's other thread, which travels the opposite way. */
  readonly partner?: number;
  /** Slot the thread was lifted from. */
  readonly from: number;
  /** Slot it lands in. */
  readonly to: number;
}

export interface SimulatorPreviewProps {
  readonly slots: number;
  /** CSS color of each thread, by thread id. */
  readonly colors: readonly string[];
  /** The slot each thread is in once the move (if any) is done, by thread id. */
  readonly positions: readonly number[];
  /** The move being shown, or none. */
  readonly move?: ShownMove | null;
  /** How far the move has traveled, 0 (still in `from`) to 1 (landed). Default 1. */
  readonly progress?: number;
  /** Mark the slot the move lifted from with a dashed ring. */
  readonly markFrom?: boolean;
  /** How far the disk is turned, in degrees. The shadow stays put. Default 0. */
  readonly spin?: number;
  /** A thread to leave out (say, while it's being dragged). */
  readonly hidden?: number;
  /** Drawn on top of everything, in the unturned frame (drag feedback). */
  readonly overlay?: ReactNode;
  /** An accessible name. Without one, the disk is decorative and hidden from assistive tech. */
  readonly label?: string;
  readonly id?: string;
  readonly className?: string;
  readonly svgRef?: Ref<SVGSVGElement>;
  readonly onPointerDown?: (e: React.PointerEvent) => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The braiding disk, as both the simulator and the home page show it: shadow, face (rim, ring, hub,
 * notches, slot numbers) and threads, with a move's threads drawn bold on top. It draws whatever
 * state it's given; the page decides what that is (stepping by hand, or playing on its own).
 *
 * Threads that share a slot stack inwards, in drawing order.
 */
export function SimulatorPreview({
  slots,
  colors,
  positions,
  move,
  progress = 1,
  markFrom = false,
  spin = 0,
  hidden,
  overlay,
  label,
  id,
  className,
  svgRef,
  onPointerDown,
}: SimulatorPreviewProps) {
  // the move's threads go last (on top); a swap's partner under the thread that was lifted
  const moving = move ? [move.partner, move.thread].filter((x): x is number => x != null) : [];
  const order = [...positions.keys()].filter(i => !moving.includes(i)).concat(moving);

  const depth: Record<number, number> = {};
  const threads = order.map(i => {
    const slot = positions[i]!;
    const k = (depth[slot] = (depth[slot] || 0) + 1);
    let [x, y] = slotPoint(slot, BEAD_RADIUS - (k - 1) * 9, slots);
    // a moving thread travels in a straight line from where it was lifted to where it lands
    if (move && moving.includes(i) && progress < 1) {
      const start = i === move.thread ? move.from : move.to;
      const [sx, sy] = slotPoint(start, BEAD_RADIUS, slots);
      [x, y] = [lerp(sx, x, progress), lerp(sy, y, progress)];
    }
    return (
      <g key={i} style={i === hidden ? { opacity: 0 } : undefined}>
        <Strand x={x} y={y} color={colors[i] ?? '#000'} hi={moving.includes(i)} />
      </g>
    );
  });
  const mark = markFrom && move ? slotPoint(move.from, 192, slots) : null;

  return (
    <svg
      id={id}
      className={className}
      ref={svgRef}
      viewBox="-6 -6 418 418"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      onPointerDown={onPointerDown}
    >
      <DiskShadow />
      {/* the disk turns; its shadow doesn't */}
      <g
        style={
          spin
            ? {
                transform: `rotate(${spin}deg)`,
                transformOrigin: '200px 200px',
              }
            : undefined
        }
      >
        <DiskFace slots={slots} />
        {threads}
        {mark && <circle cx={mark[0]} cy={mark[1]} r={8} fill="none" stroke="var(--acc, #000)" strokeWidth={2.5} strokeDasharray="3 3" />}
      </g>
      {overlay}
    </svg>
  );
}
