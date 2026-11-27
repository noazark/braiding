import type { Step } from 'kumihimo';
import type { Speed } from '../usePlayhead';

export interface TransportProps {
  readonly step: Step;
  readonly playing: boolean;
  readonly speed: Speed;
  readonly onSpeed: (s: Speed) => void;
  readonly onGo: (n: number) => void;
  readonly onToggle: () => void;
}

export interface StepStatusProps {
  readonly step: Step;
  readonly threads: number;
  readonly slots: number;
  /** Why the pattern stopped, shown when the playhead reaches that point. */
  readonly error: string;
  readonly atEnd: boolean;
}

const icon = (children: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
    {children}
  </svg>
);

/** The faster speed on offer; turning it off goes back to normal speed. */
const FAST = 3;

/** Play, pause, step, and play faster. */
export function Transport({ step, playing, speed, onSpeed, onGo, onToggle }: TransportProps) {
  const n = step.index;
  return (
    <div className="ctl transport">
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
      <button className="icon speed" title={`Play at ${FAST}× speed`} aria-pressed={speed === FAST} onClick={() => onSpeed(speed === FAST ? 1 : FAST)}>
        {FAST}×
      </button>
    </div>
  );
}

/** A line under the disk saying what the current step did. */
export function StepStatus({ step, threads, slots, error, atEnd }: StepStatusProps) {
  const mv = step.move;
  const n = step.index;
  return (
    <div className="status stepline" aria-live="polite">
      {error && atEnd ? (
        <span className="err">{error}</span>
      ) : mv ? (
        <>
          Move <b>{n}</b>:{' '}
          {mv.partner != null ? `the threads in slots ${mv.from + 1} and ${mv.to + 1} swap places` : `the thread in slot ${mv.from + 1} moves to slot ${mv.to + 1}`}
        </>
      ) : threads ? (
        `Ready to braid: ${threads} ${threads === 1 ? 'thread' : 'threads'} on a ${slots}-slot disk`
      ) : (
        `An empty ${slots}-slot disk`
      )}
    </div>
  );
}
