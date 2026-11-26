import { useLayoutEffect, useRef, useState } from 'react';

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/**
 * How far the current step's move has traveled, 0 to 1, for drawing it on its way. Each step forward
 * by one (playing, or stepping by hand) plays its move over `ms`; any other change of step (back, a
 * jump, a new pattern) shows it landed, as does `off` (reduced motion).
 */
export function useMoveTween(step: number, ms: number, off: boolean): number {
  const [t, setT] = useState(1);
  const last = useRef(step);
  useLayoutEffect(() => {
    const forward = step === last.current + 1;
    last.current = step;
    if (!forward || off) {
      setT(1);
      return;
    }
    // set before paint, so the new step never flashes up already landed
    setT(0);
    const t0 = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const x = Math.min(1, (now - t0) / ms);
      setT(ease(x));
      if (x < 1) id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [step, ms, off]);
  return t;
}
