import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useLatest } from '../../hooks/useLatest';
import { applyDrop, slotAt, type Brush, type DragSource, type Edit } from './model';
import type { DiskThread } from '../../lib/diskSetup';

export interface DragState {
  readonly src: DragSource;
  /** Where the pointer went down, in client pixels. */
  readonly startX: number;
  readonly startY: number;
  /** Past the 6px threshold: a drag, not a click. */
  readonly moved: boolean;
  /** The pointer, in the disk SVG's coordinates. */
  readonly at: { readonly x: number; readonly y: number } | null;
}

interface Options {
  readonly svg: RefObject<SVGSVGElement | null>;
  readonly slots: number;
  readonly threads: readonly DiskThread[];
  readonly brush: Brush;
  /** A drag (not a plain click on a slot) has begun. */
  readonly onDragStart: () => void;
  readonly onEdit: (e: Edit) => void;
}

/**
 * Clicking and dragging on the disk and from the swatches. The drop rules themselves live in
 * {@link applyDrop}; this hook only tracks the pointer.
 */
export function useDiskDrag(opts: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const o = useLatest(opts);
  const d = useLatest(drag);

  const toSvg = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      const svg = o.current.svg.current;
      if (!svg) return { x: 0, y: 0 };
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      return p.matrixTransform(svg.getScreenCTM()!.inverse());
    },
    [o],
  );

  const begin = useCallback((src: DragSource, e: React.PointerEvent) => {
    e.preventDefault();
    setDrag({
      src,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      at: null,
    });
  }, []);

  /** Pointer down on the disk itself: a thread to drag, or an empty slot to click. */
  const onDiskPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { slots, threads } = o.current;
      const { x, y } = toSvg(e);
      const s = slotAt(x, y, slots);
      if (s < 0) return;
      o.current.onDragStart();
      const ix = threads.findIndex(t => t.slot === s);
      begin(ix >= 0 ? { kind: 'thread', ix, color: threads[ix]!.color, slot: s } : { kind: 'add', slot: s }, e);
    },
    [o, toSvg, begin],
  );

  const active = drag !== null;
  useEffect(() => {
    if (!active) return;
    const move = (e: PointerEvent) => {
      const cur = d.current;
      if (!cur) return;
      let moved = cur.moved;
      if (!moved && Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY) > 6) {
        moved = true;
        if (cur.src.kind !== 'add') o.current.onDragStart();
      }
      setDrag({ ...cur, moved, at: toSvg(e) });
    };
    const up = (e: PointerEvent) => {
      const cur = d.current;
      setDrag(null);
      if (!cur) return;
      const { x, y } = toSvg(e);
      const { threads, brush, slots, onEdit } = o.current;
      const edit = applyDrop(threads, cur.src, cur.moved, slotAt(x, y, slots), brush);
      if (edit) onEdit(edit);
    };
    const cancel = () => setDrag(null);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
    };
  }, [active, d, o, toSvg]);

  return { drag, begin, onDiskPointerDown };
}
