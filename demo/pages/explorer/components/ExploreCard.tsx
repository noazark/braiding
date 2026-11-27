import type { ReactNode } from 'react';
import { DiskSelect } from '../../../components/DiskSelect';
import { DEFAULT_SETTINGS, type FamilyChoice, type Settings, type Shape } from '../model';

export interface ExploreCardProps {
  readonly settings: Settings;
  readonly onChange: (s: Settings) => void;
  readonly onExplore: () => void;
  readonly busy: boolean;
  /** The counts, or what the search is doing. */
  readonly status: ReactNode;
}

const FAMILIES: [FamilyChoice, string][] = [
  ['mixed', 'Mixed'],
  ['disk', 'Disk moves'],
  ['swap', 'Neighbor swaps'],
  ['gap', 'Gap braids'],
];
const SHAPES: [Shape, string][] = [
  ['any', 'Round and flat'],
  ['round', 'Round only'],
  ['flat', 'Flat only'],
];

/**
 * The first card in the grid: your disk, what kind of braid to look for, and the button that finds the
 * next one. Same shape as a pattern card, so it reads as part of the deck.
 */
export function ExploreCard({ settings: s, onChange, onExplore, busy, status }: ExploreCardProps) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });
  const isDefault = s.family === DEFAULT_SETTINGS.family && s.shape === DEFAULT_SETTINGS.shape;
  return (
    <div className="card explore-card">
      <h2>Find a new braid</h2>
      <DiskSelect />
      <label>
        Family
        <select value={s.family} onChange={e => set('family', e.target.value as FamilyChoice)}>
          {FAMILIES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Shape
        <select value={s.shape} onChange={e => set('shape', e.target.value as Shape)}>
          {SHAPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button className="pri explore" disabled={busy} onClick={onExplore}>
        {busy ? 'Generating…' : 'Generate'}
      </button>
      <div className="foot">
        <span className="status" aria-live="polite">
          {status}
        </span>
        <button className="link" title="Put the settings back to how they started" disabled={isDefault} onClick={() => onChange(DEFAULT_SETTINGS)}>
          Reset
        </button>
      </div>
    </div>
  );
}
