import { useRef, useState } from 'react';
import { presetGroupNames, presets } from 'kumihimo';
import { HelpButton, openHelp } from './HelpDialog';
import { NotationHelp } from './NotationHelp';
import { DiskSelect } from '../../../components/DiskSelect';
import { CUSTOM, presetFits } from '../useDiskSetup';
import { MAX_SLOTS, type MyDisk } from '../../../lib/myDisk';

export interface PatternEditorProps {
  readonly preset: number;
  readonly onPreset: (i: number) => void;
  readonly slots: number;
  /** Your disk: on a fixed one the slot count is the disk's, so there's no Slots field. */
  readonly disk: MyDisk;
  /** False when the braid can't go on your disk, and is shown on one of its own size. */
  readonly fits: boolean;
  /** The fewest slots allowed: one per thread on the disk (and never under 3). */
  readonly minSlots: number;
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

/** Your disk, then a preset (only those that go on it), then the moves, with Apply and Reset under them. */
export function PatternEditor({ preset, onPreset, slots, disk, fits, minSlots, onSlots, draft, onDraft, onApply, onReset, error }: PatternEditorProps) {
  const help = useRef<HTMLDialogElement>(null);
  // the size can come out other than typed (clamped, or skipping sizes the braid breaks on), even the
  // size the disk already is: redraw the field on every commit so it always shows the real size
  const [commits, setCommits] = useState(0);
  const commitSlots = (input: HTMLInputElement) => {
    onSlots(Number(input.value));
    setCommits(c => c + 1);
  };
  return (
    <>
      <div className="diskrow">
        <DiskSelect />
        {disk === 'any' && (
          <label className="slots">
            Slots
            {/* uncontrolled while typing; the clamped value is committed on change (blur or enter) */}
            <input
              key={`${slots}:${commits}`}
              type="number"
              min={minSlots}
              max={MAX_SLOTS}
              defaultValue={slots}
              onBlur={e => commitSlots(e.currentTarget)}
              onKeyDown={e => e.key === 'Enter' && commitSlots(e.currentTarget)}
            />
          </label>
        )}
      </div>
      <label className="preset">
        Preset
        <select value={preset} onChange={e => onPreset(Number(e.target.value))}>
          {groups.map(g => (
            <optgroup key={g} label={presetGroupNames[g]}>
              {presets.map((p, i) =>
                p.group === g ? (
                  // a preset that can't go on your disk can't be picked
                  <option key={p.id} value={i} disabled={!presetFits(i, disk)}>
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
        <legend className="vh">Moves</legend>
        {!fits && (
          <p className="nofit" role="status">
            {disk === 'any'
              ? `This braid needs ${slots} slots, more than any disk here.`
              : `This braid doesn't fit ${disk === 8 ? 'an' : 'a'} ${disk}-slot disk. It's shown on ${slots} slots.`}
          </p>
        )}
        <div className="moves">
          <span className="moves-head">
            <label htmlFor="pat">Moves</label>
            <HelpButton label="How to write moves" onClick={() => openHelp(help.current)} />
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
