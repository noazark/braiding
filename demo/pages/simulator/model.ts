/**
 * The simulator's own model: how hand edits change the threads of a disk setup.
 * Pure functions only; the components and hooks call these.
 */
import { slotPoint } from '../../lib/diskGeometry';
import type { DiskThread } from '../../lib/diskSetup';

export { slotPoint };

/** The brush: a CSS color, or {@link ERASER}. */
export type Brush = string | typeof ERASER;
export const ERASER = null;

/** What is being dragged. */
export type DragSource =
  | {
      readonly kind: 'thread';
      readonly ix: number;
      readonly color: string;
      readonly slot: number;
    }
  | { readonly kind: 'add'; readonly slot: number }
  | { readonly kind: 'swatch'; readonly color: Brush };

/** Drop target: a slot index, {@link CENTER} (no slot), or {@link OFF_DISK}. */
export const CENTER = -1;
export const OFF_DISK = -2;

export interface Edit {
  readonly threads: DiskThread[];
  /** True if only colors changed (the preset is kept); false if threads moved, came or went. */
  readonly colorOnly: boolean;
}

const sortBySlot = (t: DiskThread[]) => t.sort((a, b) => a.slot - b.slot);

/**
 * The result of a click or drag on the disk, or `null` if it changes nothing. Threads come back in
 * slot order.
 *
 * - Click a thread: paint it with the brush (or remove it with the eraser).
 * - Click an empty slot: add a thread in the brush color.
 * - Drag a thread to another slot: move it there (swapping with a thread already there); off the disk: remove it.
 * - Drag a swatch onto a slot: add a thread, or recolor the one there (the eraser removes it).
 */
export function applyDrop(threads: readonly DiskThread[], src: DragSource, moved: boolean, target: number, brush: Brush): Edit | null {
  const next = threads.map(t => ({ ...t }));
  const at = target >= 0 ? next.findIndex(t => t.slot === target) : -1;
  if (src.kind === 'thread') {
    if (!moved) {
      if (brush === ERASER) next.splice(src.ix, 1);
      else if (next[src.ix]!.color !== brush)
        return {
          threads: sortBySlot(next.map((t, i) => (i === src.ix ? { ...t, color: brush } : t))),
          colorOnly: true,
        };
      else return null;
    } else if (target === OFF_DISK) next.splice(src.ix, 1);
    else if (target >= 0 && target !== src.slot) {
      if (at >= 0) next[at] = { ...next[at]!, slot: src.slot };
      next[src.ix] = { ...next[src.ix]!, slot: target };
    } else return null;
    return { threads: sortBySlot(next), colorOnly: false };
  }
  if (src.kind === 'add') {
    if (moved || brush === ERASER) return null;
    return {
      threads: sortBySlot([...next, { slot: src.slot, color: brush }]),
      colorOnly: false,
    };
  }
  if (!moved || target < 0) return null;
  if (src.color === ERASER) {
    if (at < 0) return null;
    next.splice(at, 1);
    return { threads: sortBySlot(next), colorOnly: false };
  }
  if (at >= 0) {
    next[at] = { ...next[at]!, color: src.color };
    return { threads: sortBySlot(next), colorOnly: true };
  }
  return {
    threads: sortBySlot([...next, { slot: target, color: src.color }]),
    colorOnly: false,
  };
}

// ---- disk geometry (the frame itself is in lib/diskGeometry) ----

/** The slot under a point, or {@link CENTER} / {@link OFF_DISK}. */
export function slotAt(x: number, y: number, n: number): number {
  const r = Math.hypot(x - 200, y - 200);
  if (r > 232) return OFF_DISK;
  if (r < 70) return CENTER;
  const deg = ((((Math.atan2(y - 200, x - 200) * 180) / Math.PI + 90) % 360) + 360) % 360;
  return Math.floor(deg / (360 / n));
}
