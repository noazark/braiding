import { useRef } from 'react';
import { presetGroupNames, presets } from 'kumihimo';
import { HelpButton } from './HelpDialog';
import { NotationHelp } from './NotationHelp';
import { CUSTOM } from '../useDiskSetup';

export interface PatternEditorProps {
  readonly preset: number;
  readonly onPreset: (i: number) => void;
  readonly slots: number;
  readonly onSlots: (n: number) => void;
  readonly draft: string;
  readonly onDraft: (text: string) => void;
  readonly onApply: () => void;
  /** Start over: take every thread off the disk and clear the moves. */
  readonly onReset: () => void;
  /** Why the applied pattern couldn't be read, if it couldn't. */
  readonly error: string;
}

const groups = [...new Set(presets.map(p => p.group))];

/** Choosing a preset, then the disk's size and moves as one group, with Apply and Reset under them. */
export function PatternEditor({ preset, onPreset, slots, onSlots, draft, onDraft, onApply, onReset, error }: PatternEditorProps) {
  const help = useRef<HTMLDialogElement>(null);
  return (
    <>
      <label className="preset">
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
      <fieldset className="patgroup">
        <legend className="vh">Disk and moves</legend>
        <label className="slots">
          Slots
          {/* uncontrolled while typing; the clamped value is committed on change (blur or enter) */}
          <input
            key={slots}
            type="number"
            min={3}
            max={64}
            defaultValue={slots}
            onBlur={e => onSlots(Number(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && onSlots(Number(e.currentTarget.value))}
          />
        </label>
        <div className="moves">
          <span className="moves-head">
            <label htmlFor="pat">Moves</label>
            <HelpButton label="How to write moves" onClick={() => help.current?.showModal()} />
          </span>
          <textarea
            id="pat"
            rows={3}
            spellCheck={false}
            value={draft}
            onChange={e => onDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onApply();
            }}
          />
        </div>
        <div className="patbtns">
          <button className="pri" onClick={onApply}>
            Apply
          </button>
          <button title="Take every thread off the disk and clear the moves" onClick={onReset}>
            Reset
          </button>
        </div>
        <span className="err" role="alert">
          {error}
        </span>
      </fieldset>
      <NotationHelp ref={help} />
    </>
  );
}
