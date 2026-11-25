import { presetGroupNames, presets, type Pattern } from 'kumihimo';
import { CUSTOM } from '../useDiskSetup';

export interface PatternEditorProps {
  readonly preset: number;
  readonly onPreset: (i: number) => void;
  readonly slots: number;
  readonly onSlots: (n: number) => void;
  readonly draft: string;
  readonly onDraft: (text: string) => void;
  readonly onApply: () => void;
  /** Why the applied pattern couldn't be read, if it couldn't. */
  readonly error: string;
  /** The applied pattern's tokens, the one being played highlighted. */
  readonly pattern: Pattern;
  readonly activeToken: number | null;
}

const groups = [...new Set(presets.map(p => p.group))];

/** Choosing a preset or disk size, and writing the moves. */
export function PatternEditor({ preset, onPreset, slots, onSlots, draft, onDraft, onApply, error, pattern, activeToken }: PatternEditorProps) {
  return (
    <>
      <div className="row">
        <label style={{ flex: '1 1 220px' }}>
          Preset
          <select value={preset} onChange={e => onPreset(Number(e.target.value))}>
            {groups.map(g => (
              <optgroup key={g} label={presetGroupNames[g]}>
                {presets.map((p, i) =>
                  p.group === g ? (
                    <option key={p.id} value={i}>
                      {p.name}
                    </option>
                  ) : null,
                )}
              </optgroup>
            ))}
            <option value={CUSTOM}>Custom</option>
          </select>
        </label>
        <label>
          Slots
          {/* uncontrolled while typing; the clamped value is committed on change (blur or enter) */}
          <input
            key={slots}
            type="number"
            min={3}
            max={64}
            defaultValue={slots}
            style={{ width: 84 }}
            onBlur={e => onSlots(Number(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && onSlots(Number(e.currentTarget.value))}
          />
        </label>
      </div>
      <label htmlFor="pat" style={{ display: 'block' }}>
        Moves <span style={{ fontWeight: 400, color: 'var(--mut)' }}>(repeat forever)</span>
      </label>
      <div className="patrow">
        <textarea
          id="pat"
          rows={2}
          spellCheck={false}
          value={draft}
          onChange={e => onDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onApply();
          }}
        />
        <button className="pri" onClick={onApply}>
          Apply
        </button>
      </div>
      <span className="err" role="alert">
        {error}
      </span>
      <div className="toks">
        {pattern.map((t, i) => (
          <span key={i} className={i === activeToken ? 'on' : undefined}>
            {t.text}
          </span>
        ))}
      </div>
    </>
  );
}
