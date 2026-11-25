import { useState } from 'react';
import { paletteIndex, type DiskThread } from '../../../lib/diskSetup';
import { PALETTE } from '../../../lib/palette';
import { ERASER, type Brush } from '../model';

export interface ThreadPaletteProps {
  readonly threads: readonly DiskThread[];
  readonly brush: Brush;
  readonly onBrush: (c: Brush) => void;
  /** Pointer down on a swatch: it may become a drag onto the disk. */
  readonly onSwatchPointerDown: (c: Brush, e: React.PointerEvent) => void;
  readonly onShuffle: () => void;
  readonly onClear: () => void;
  readonly open: boolean;
  readonly onSummaryClick: (e: React.MouseEvent) => void;
}

/** The color swatches (palette, custom colors in use, a picker, the eraser) and disk-wide tools. */
export function ThreadPalette({ threads, brush, onBrush, onSwatchPointerDown, onShuffle, onClear, open, onSummaryClick }: ThreadPaletteProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const custom = [...new Set(threads.map(t => t.color).filter(c => paletteIndex(c) < 0))];
  const swatch = (c: string, label: string, className?: string) => (
    <button
      key={c}
      className={className}
      aria-label={label}
      title={className ? c : undefined}
      aria-pressed={brush === c}
      style={{ '--c': c } as React.CSSProperties}
      onPointerDown={e => {
        onBrush(c);
        onSwatchPointerDown(c, e);
      }}
    >
      <i />
    </button>
  );
  const pickedNew = !!picked && !custom.includes(picked);
  return (
    <details className="help thr" open={open}>
      <summary onClick={onSummaryClick}>Threads</summary>
      <div className="tools">
        <div className="sw" role="toolbar" aria-label="Thread colors">
          {PALETTE.map((c, i) => swatch(c, `Color ${i + 1}`))}
          {custom.map(c => swatch(c, `Custom color ${c}`, 'custom'))}
          <label
            className={'addc' + (pickedNew ? ' set' : '') + (pickedNew && brush === picked ? ' on' : '')}
            title="Pick a custom color"
            aria-label="Pick a custom color"
            style={picked ? ({ '--pc': picked } as React.CSSProperties) : undefined}
          >
            +
            <input
              type="color"
              value={picked || '#3d7dd8'}
              onChange={e => {
                const c = e.target.value.toLowerCase();
                setPicked(c);
                onBrush(c);
              }}
            />
          </label>
          <button
            className="erase"
            aria-label="Remove threads"
            aria-pressed={brush === ERASER}
            onPointerDown={e => {
              onBrush(ERASER);
              onSwatchPointerDown(ERASER, e);
            }}
          >
            ×
          </button>
        </div>
        <span className="tb2">
          <button className="ghostbtn" title="Give every thread a random color from the palette" onClick={onShuffle}>
            Shuffle colors
          </button>
          <button className="ghostbtn" onClick={onClear}>
            Clear disk
          </button>
        </span>
      </div>
      <p className="cap hint">
        Drag a color onto a slot to add a thread. Drag a thread to another slot to move it (onto a filled slot to swap), or off the disk to remove it. Click a thread to
        give it the selected color; with × selected, a click removes it.
      </p>
    </details>
  );
}
