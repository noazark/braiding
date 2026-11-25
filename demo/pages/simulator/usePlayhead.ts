import { useCallback, useEffect, useState } from 'react';
import type { Timeline } from 'kumihimo';
import { useInterval } from '../../hooks/useInterval';
import { useLatest } from '../../hooks/useLatest';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';

/**
 * Which step is showing, and playback. Going back to the start whenever the braid changes (a new
 * timeline), since the old step number means nothing for a new pattern.
 */
export function usePlayhead(timeline: Timeline) {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(timeline);
  if (shown !== timeline) {
    // adjust during render, so a stale step never reaches the new timeline
    setShown(timeline);
    setCur(0);
    setPlaying(false);
  }
  const step = shown === timeline ? cur : 0;
  const latest = useLatest({ step, timeline });

  /** Show step n (clamped to what the pattern can reach), playing ahead if needed. */
  const go = useCallback(
    (n: number) => {
      const tl = latest.current.timeline;
      tl.extend(n);
      setCur(Math.max(0, Math.min(tl.last, n)));
    },
    [latest],
  );
  const stop = useCallback(() => setPlaying(false), []);
  const atEnd = () => timeline.finished && step >= timeline.last;
  const toggle = () => {
    if (playing) return stop();
    if (atEnd()) go(0);
    setPlaying(true);
  };
  /** Stop and rewind: hand edits always start from the loaded disk. */
  const toStart = useCallback(() => {
    setPlaying(false);
    go(0);
  }, [go]);

  const reducedMotion = usePrefersReducedMotion();
  useInterval(
    () => {
      const { step, timeline: tl } = latest.current;
      go(step + 1);
      if (tl.finished && Math.min(step + 1, tl.last) >= tl.last) stop();
    },
    playing ? (reducedMotion ? 500 : 220) : null,
  );

  // arrow keys step, unless typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.matches('textarea,input,select')) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      stop();
      go(latest.current.step + (e.key === 'ArrowRight' ? 1 : -1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, stop, latest]);

  return { step, playing, go, stop, toggle, toStart };
}
