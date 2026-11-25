import type { Step } from 'kumihimo';

export interface TransportProps {
  readonly step: Step;
  /** The furthest step the slider reaches. */
  readonly max: number;
  readonly playing: boolean;
  readonly threads: number;
  readonly slots: number;
  /** Why the pattern stopped, shown when the playhead reaches that point. */
  readonly error: string;
  readonly atEnd: boolean;
  readonly onGo: (n: number) => void;
  readonly onToggle: () => void;
}

const icon = (children: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
    {children}
  </svg>
);

/** Play, pause, step and scrub, with a line saying what the current step did. */
export function Transport({ step, max, playing, threads, slots, error, atEnd, onGo, onToggle }: TransportProps) {
  const mv = step.move;
  const n = step.index;
  return (
    <>
      <div className="ctl">
        <button className="icon" title="Back to start" aria-label="Back to start" onClick={() => onGo(0)}>
          {icon(
            <>
              <rect x="2" y="3" width="2.5" height="12" rx="1" />
              <path d="M16 3v12L9.5 9zM9.5 3v12L3 9z" transform="translate(-.5 0)" />
            </>,
          )}
        </button>
        <button className="icon" title="Step back" aria-label="Step back" onClick={() => onGo(n - 1)}>
          {icon(
            <>
              <rect x="3" y="3" width="2.5" height="12" rx="1" />
              <path d="M15 3v12L6.5 9z" />
            </>,
          )}
        </button>
        <button className={'play' + (playing ? ' on' : '')} title="Play / pause" aria-label={playing ? 'Pause' : 'Play'} onClick={onToggle}>
          {playing
            ? icon(
                <>
                  <rect x="4" y="3" width="3.5" height="12" rx="1" />
                  <rect x="10.5" y="3" width="3.5" height="12" rx="1" />
                </>,
              )
            : icon(<path d="M5 3v12l10-6z" />)}
        </button>
        <button className="icon" title="Step forward" aria-label="Step forward" onClick={() => onGo(n + 1)}>
          {icon(
            <>
              <path d="M3 3v12l8.5-6z" />
              <rect x="12.5" y="3" width="2.5" height="12" rx="1" />
            </>,
          )}
        </button>
        <input type="range" min={0} max={max} value={n} aria-label="Step" onChange={e => onGo(Number(e.target.value))} />
      </div>
      <div className="status" aria-live="polite">
        {error && atEnd ? (
          <span className="err">{error}</span>
        ) : mv ? (
          <>
            Step <b>{n}</b>: slot {mv.from + 1} {mv.partner != null ? '⨯' : '→'} slot {mv.to + 1}
          </>
        ) : (
          `Step 0: loaded, ${threads} threads in ${slots} slots`
        )}
      </div>
    </>
  );
}
