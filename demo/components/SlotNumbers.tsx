import { slotPoint } from '../lib/diskGeometry';

export interface SlotNumbersProps {
  readonly slots: number;
}

/**
 * Slot numbers for a braiding disk (in the shared 400×400 disk frame). Each sits alongside its notch,
 * just inside it and a little to the clockwise side, reading outward along the notch's line, the same
 * way all around the disk. Being beside the notch keeps it clear of the slot's own thread, so it's drawn
 * on the disk face, under the threads.
 *
 * Used by the simulator's disk and the home page's demo disk, so both read the same way.
 */
export function SlotNumbers({ slots }: SlotNumbersProps) {
  const every = slots <= 40 ? 1 : 4;
  const size = slots > 24 ? 13 : 16;
  return (
    <g pointerEvents="none">
      {Array.from({ length: slots }, (_, i) => {
        if (i % every !== 0 && i !== slots - 1) return null;
        // the slot's direction from the center, in degrees (0 = right, 90 = down)
        const a = -90 + ((i + 0.5) * 360) / slots;
        const rad = (a * Math.PI) / 180;
        // just inside the notch, nudged clockwise so the slot's thread passes beside it
        const [cx, cy] = slotPoint(i, 160, slots);
        const nudge = size * 0.85;
        const x = cx - Math.sin(rad) * nudge;
        const y = cy + Math.cos(rad) * nudge;
        // every number reads outward along its notch, the same way all around the disk
        const turn = a;
        return (
          <text
            key={i}
            x={x}
            y={y}
            transform={`rotate(${turn} ${x} ${y})`}
            fill="#000"
            fontSize={size}
            fontFamily="Space Grotesk,sans-serif"
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {i + 1}
          </text>
        );
      })}
    </g>
  );
}
