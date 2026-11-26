import { useRef, useState } from 'react';
import { HelpButton, HelpDialog } from './HelpDialog';
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
}

/**
 * The disk's toolbar, under the disk: the eraser and color swatches (palette, custom colors in use, a
 * picker), shuffling the colors, and a (?) that explains how to use them on the disk.
 */
export function ThreadPalette({ threads, brush, onBrush, onSwatchPointerDown, onShuffle }: ThreadPaletteProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const help = useRef<HTMLDialogElement>(null);
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
    <section className="thr" aria-label="Threads">
      <div className="tools">
        <div className="sw" role="toolbar" aria-label="Thread colors">
          <button
            className="erase"
            aria-label="Remove threads"
            title="Remove threads: click or drag onto a thread"
            aria-pressed={brush === ERASER}
            onPointerDown={e => {
              onBrush(ERASER);
              onSwatchPointerDown(ERASER, e);
            }}
          >
            ×
          </button>
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
          <button className="icon shuffle" title="Shuffle colors: give every thread a random color" aria-label="Shuffle colors" onClick={onShuffle}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5h3.5c3 0 4 8 7 8H16M13.5 10.5 16 13l-2.5 2.5M2 13h3.5c1.2 0 2-1.2 2.7-2.6M10.3 7.6C11 6.2 11.8 5 13 5h3M13.5 2.5 16 5l-2.5 2.5" />
            </svg>
          </button>
          <HelpButton label="How to add and move threads" onClick={() => help.current?.showModal()} />
        </div>
      </div>
      <HelpDialog ref={help} title="Threads on the disk">
        <p>Drag a color onto a slot to add a thread. Drag a thread to another slot to move it (onto a filled slot to swap), or off the disk to remove it.</p>
        <p>Click a thread to give it the selected color; with × selected, a click removes it.</p>
      </HelpDialog>
    </section>
  );
}
