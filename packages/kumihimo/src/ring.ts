/**
 * Arithmetic on a ring of positions.
 *
 * A braiding disk is a circle: after the last slot comes the first one again. The same holds for
 * the columns of a strand chart and for the gaps between neighboring strands. Every index in this
 * package wraps around with {@link mod}.
 *
 * @module
 */

/**
 * `a` modulo `n`, always in `0 … n-1` (JavaScript's `%` keeps the sign of `a`, so `-1 % 8` is `-1`).
 *
 * @example
 * mod(-1, 8) // 7
 * mod(9, 8)  // 1
 */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * The shortest signed distance from `a` to `b` around a ring of `n` positions:
 * positive = clockwise, negative = counterclockwise. Exactly opposite positions come out as `+n/2`.
 *
 * @example
 * ringDistance(1, 3, 8) // 2
 * ringDistance(1, 7, 8) // -2
 */
export function ringDistance(a: number, b: number, n: number): number {
  let d = b - a;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}
