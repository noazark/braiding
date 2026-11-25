/**
 * The pieces of a braiding disk, drawn the same way wherever a disk appears (the simulator, the home
 * page). All in the shared 400×400 disk frame centered on (200, 200); see `lib/diskGeometry`.
 *
 * Layering, bottom to top: {@link DiskShadow}, {@link DiskFace} (rim, inner ring, hub, notches, slot
 * numbers), then the threads ({@link Strand}). Threads always run over the hub.
 */
import { slotPoint } from '../lib/diskGeometry';
import { SlotNumbers } from './SlotNumbers';

/** How far out a thread's bead sits: on the notches. */
export const BEAD_RADIUS = 182;

/** The disk's hard shadow. Separate from the face so a turning disk can turn without its shadow. */
export const DiskShadow = () => <circle cx={208} cy={208} r={192} fill="#000" />;

/**
 * The disk face: rim, inner ring, center hub, a notch for each slot, and the slot numbers. Colors
 * come from the page's `--foam` / `--foam2` / `--panel`, falling back to white and light gray.
 */
export function DiskFace({ slots }: { slots: number }) {
  return (
    <>
      <circle cx={200} cy={200} r={192} fill="var(--foam, #fff)" stroke="#000" strokeWidth={4} />
      <circle cx={200} cy={200} r={128} fill="var(--foam2, #f1f1f1)" stroke="#000" strokeWidth={3} />
      <circle cx={200} cy={200} r={24} fill="var(--panel, #fff)" stroke="#000" strokeWidth={4} />
      {Array.from({ length: slots }, (_, i) => {
        const [x1, y1] = slotPoint(i, 190, slots);
        const [x2, y2] = slotPoint(i, 168, slots);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={4} />;
      })}
      <SlotNumbers slots={slots} />
    </>
  );
}

/** One thread: a line from the center out to (x, y), ending in a bead. `hi` draws it a little bolder (the one moving). */
export function Strand({ x, y, color, hi = false }: { x: number; y: number; color: string; hi?: boolean }) {
  return (
    <>
      <line x1={200} y1={200} x2={x} y2={y} stroke="#000" strokeWidth={hi ? 11 : 9} strokeLinecap="round" />
      <line x1={200} y1={200} x2={x} y2={y} stroke={color} strokeWidth={hi ? 6 : 5} strokeLinecap="round" />
      <circle cx={x} cy={y} r={hi ? 9 : 8} fill={color} stroke="#000" strokeWidth={3} />
    </>
  );
}
