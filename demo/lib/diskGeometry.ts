/** Disk geometry, in a 400×400 SVG frame centered on (200, 200). Slot 0 is just right of the top. */

/** Angle (radians) of slot i's center on a disk of n slots; slot 0 just right of the top. */
export const angle = (i: number, n: number) => ((-90 + ((i + 0.5) * 360) / n) * Math.PI) / 180;

/** The point at radius r through the middle of slot i. */
export const slotPoint = (i: number, r: number, n: number): [number, number] => [200 + r * Math.cos(angle(i, n)), 200 + r * Math.sin(angle(i, n))];
