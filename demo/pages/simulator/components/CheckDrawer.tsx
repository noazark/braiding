import type { CheckSummary } from '../../../hooks/usePatternCheck';

const ICON = { ok: '✓', info: 'i', warn: '!', err: '✕' } as const;

export interface CheckDrawerProps {
  readonly check: CheckSummary;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onJump: (step: number) => void;
}

/** The pattern check: a tab on the chart's bottom edge that slides a drawer of findings up over it. */
export function CheckDrawer({ check, open, onToggle, onJump }: CheckDrawerProps) {
  const { lines, issues, broken } = check;
  const tone = broken ? 'err' : issues ? 'warn' : 'ok';
  const s = issues > 1 ? 's' : '';
  return (
    <>
      <div className={'drawer' + (issues ? ' bad' : '')} id="checkBox" aria-hidden={!open} inert={!open}>
        <div className="drawer-b">
          <h3>{issues ? `Pattern check: ${issues} issue${s}` : 'Pattern check: looks good'}</h3>
          <ul className="checklist">
            {lines.map((l, i) => (
              <li key={i} className={l.tone}>
                <span className="ic">{ICON[l.tone]}</span>
                <span>
                  {l.text}
                  {l.step != null && (
                    <>
                      {' '}
                      <button className="jump" onClick={() => onJump(l.step!)}>
                        Show step {l.step}
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button className={'tab ' + tone} type="button" aria-expanded={open} aria-controls="checkBox" onClick={onToggle}>
        <span>{broken ? '✕ Pattern broken' : issues ? `${issues} issue${s}` : '✓ Pattern OK'}</span>
        <span className="chev" aria-hidden="true" />
      </button>
    </>
  );
}
