import { useLayoutEffect, useRef, useState } from 'react';

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** What to draw: which step's disk, and how far its move has traveled (0 to 1). */
export interface MoveTween {
  /** The step whose disk and move to draw. While a step back plays, the step being undone. */
  readonly shown: number;
  /** How far `shown`'s move has traveled: 0 lifted from where it started, 1 landed. */
  readonly t: number;
}

/**
 * The move to draw, on its way. Each step forward by one (playing, or stepping by hand) plays its move
 * over `ms`; each step back by one plays the move it undoes backwards, then settles on the earlier
 * step. Any other change of step (a jump, a new pattern) shows it landed, as does `off` (reduced motion).
 */
export function useMoveTween(step: number, ms: number, off: boolean): MoveTween {
  const [tween, setTween] = useState<MoveTween>({ shown: step, t: 1 });
  const last = useRef(step);
  useLayoutEffect(() => {
    const from = last.current;
    last.current = step;
    const dir = step === from + 1 ? 1 : step === from - 1 ? -1 : 0;
    if (!dir || off) {
      setTween({ shown: step, t: 1 });
      return;
    }
    // forward: the new step's move, from its start; back: the undone step's move, from where it landed.
    // Set before paint, so the new step never flashes up already landed (or already undone)
    const shown = dir > 0 ? step : from;
    setTween({ shown, t: dir > 0 ? 0 : 1 });
    const t0 = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const x = Math.min(1, (now - t0) / ms);
      if (dir > 0) setTween({ shown, t: ease(x) });
      else setTween(x < 1 ? { shown, t: ease(1 - x) } : { shown: step, t: 1 });
      if (x < 1) id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [step, ms, off]);
  return tween;
}
