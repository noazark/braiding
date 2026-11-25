import { BEAD_RADIUS, Strand } from '../../../components/DiskParts';
import { ERASER, OFF_DISK, slotAt, slotPoint, type Brush } from '../model';
import type { DragState } from '../useDiskDrag';

/** Drag feedback: the dragged thread follows the pointer, and the slot it would land in gets a ring. */
export function DragGhost({ drag, slots, brush }: { drag: DragState | null; slots: number; brush: Brush }) {
  if (!drag?.moved || !drag.at) return null;
  const { x, y } = drag.at;
  const s = slotAt(x, y, slots);
  const c = drag.src.kind === 'add' ? brush : drag.src.color;
  const ring = s >= 0 ? slotPoint(s, BEAD_RADIUS, slots) : null;
  return (
    <g pointerEvents="none">
      {ring && <circle cx={ring[0]} cy={ring[1]} r={13} fill="none" stroke="var(--target)" strokeOpacity={0.9} strokeWidth={2.2} strokeDasharray="4 3" />}
      {c === ERASER ? (
        <text x={x} y={y + 7} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--target)">
          ×
        </text>
      ) : drag.src.kind === 'thread' || s >= 0 ? (
        <>
          <g opacity={s === OFF_DISK ? 0.45 : 1}>
            <Strand x={x} y={y} color={c} hi />
          </g>
          {s === OFF_DISK && (
            <text x={x} y={y - 16} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--target)">
              remove
            </text>
          )}
        </>
      ) : (
        <circle cx={x} cy={y} r={8} fill={c} stroke="#0008" strokeWidth={2} />
      )}
    </g>
  );
}
