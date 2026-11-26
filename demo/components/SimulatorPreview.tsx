import type { ReactNode, Ref } from 'react';
import { angle, slotPoint } from '../lib/diskGeometry';
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
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** How far out a moving thread is lifted while it travels around: just past the beads, inside the frame. */
const LIFT = 195;
/** How far in a swap's partner travels around, so the two pass each other instead of colliding. */
const DIP = 164;
/** The share of a move spent lifting out (and again dropping in); the rest goes around. */
const EDGE = 0.25;

/**
 * Where a moving thread is, `t` (0–1) of the way from slot `from` to slot `to`: out (or, for a swap's
 * partner, in) from its slot, around the disk the short way to the new slot's angle, then into place
 * at radius `endR`.
 */
function travel(from: number, to: number, endR: number, t: number, slots: number, ring: number): [number, number] {
  const a0 = angle(from, slots);
  // the short way around, either direction
  const d = ((((angle(to, slots) - a0) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const r = t < EDGE ? lerp(BEAD_RADIUS, ring, smooth(t / EDGE)) : t > 1 - EDGE ? lerp(ring, endR, smooth((t - 1 + EDGE) / EDGE)) : ring;
  const a = a0 + d * smooth((t - EDGE) / (1 - 2 * EDGE));
  return [200 + r * Math.cos(a), 200 + r * Math.sin(a)];
}

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
    const r = BEAD_RADIUS - (k - 1) * 9;
    let [x, y] = slotPoint(slot, r, slots);
    // a moving thread lifts out of its slot, goes around the disk and drops into its new one (a
    // swap's partner goes around on the inside, the other way)
    if (move && moving.includes(i) && progress < 1) {
      [x, y] = i === move.thread ? travel(move.from, slot, r, progress, slots, LIFT) : travel(move.to, slot, r, progress, slots, DIP);
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
