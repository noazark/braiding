import { useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';

/**
 * A frame-by-frame clock that walks through numbered steps, each lasting `durationOf(step)` ms.
 * Returns the current step and how far into it we are. Holds still while `running` is false.
 */
export function useStepper(running: boolean, durationOf: (step: number) => number, first = 1) {
  const [state, setState] = useState({ step: first, t: 0 });
  const duration = useLatest(durationOf);
  const now = useRef(state);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (time: number) => {
      // cap the frame gap so a backgrounded tab doesn't fast-forward on return
      const dt = Math.min(64, time - last);
      last = time;
      let { step, t } = now.current;
      t += dt;
      while (t >= duration.current(step)) {
        t -= duration.current(step);
        step++;
      }
      now.current = { step, t };
      setState(now.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, duration]);
  return state;
}
