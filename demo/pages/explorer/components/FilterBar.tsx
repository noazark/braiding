import { Heart } from '../../../components/Heart';
import { NO_FILTERS, TRAITS, isUnfiltered, toggleTrait, type Filters, type TraitKey } from '../model';

export interface FilterBarProps {
  readonly filters: Filters;
  readonly onChange: (f: Filters) => void;
  /** Each trait's values among the cards on offer, in order, with how many cards each chip would show given the other filters. */
  readonly options: Readonly<Record<TraitKey, readonly [string | number, number][]>>;
  readonly nLiked: number;
}

/**
 * The row of chips above the grid: narrow it to braids with the traits you pick. Chips within a
 * trait widen the choice (diamond or regular); chips in different traits narrow it (regular, 8 threads).
 */
export function FilterBar({ filters: f, onChange, options, nLiked }: FilterBarProps) {
  return (
    <div className="filters" role="group" aria-label="Filter the braids">
      <button className={'chip' + (nLiked ? '' : ' empty')} aria-pressed={f.liked} onClick={() => onChange({ ...f, liked: !f.liked })}>
        <Heart /> Liked <span className="n">{nLiked}</span>
      </button>
      {TRAITS.map(([k, label]) => {
        const on = f[k] as ReadonlySet<string | number>;
        // the values on offer, plus any chip that's on but has no cards right now (so it can be turned off)
        const vals = [...options[k], ...[...on].filter(v => !options[k].some(([o]) => o === v)).map(v => [v, 0] as const)];
        if (!vals.length) return null;
        return (
          <div className="trait" role="group" aria-label={label} key={k}>
            <span className="trait-label">{label}</span>
            {vals.map(([v, n]) => (
              <button
                key={v}
                className={'chip' + (n ? '' : ' empty')}
                aria-pressed={on.has(v)}
                onClick={() => onChange(toggleTrait(f, k, v))}
              >
                {v} <span className="n">{n}</span>
              </button>
            ))}
          </div>
        );
      })}
      {!isUnfiltered(f) && (
        <button className="link clear" onClick={() => onChange(NO_FILTERS)}>
          Clear
        </button>
      )}
    </div>
  );
}
