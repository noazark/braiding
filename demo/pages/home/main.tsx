/**
 * The home page is static HTML. These two small React islands bring its tool cards to life: the
 * simulator preview playing a pattern on the simulator's card, and the explorer preview (a fan of
 * pattern cards) on the explorer's.
 */
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { presets } from 'kumihimo';
import { fromPreset } from '../../lib/diskSetup';
import { ExplorerPreview } from './ExplorerPreview';
import { PlayingSimulatorPreview } from './PlayingSimulatorPreview';

const mount = (id: string, node: ReactNode) => {
  const el = document.getElementById(id);
  if (el) createRoot(el).render(<StrictMode>{node}</StrictMode>);
};

// the square braid: twelve moves around a 32-slot disk, then the disk turns (R8)
mount('simulator-preview', <PlayingSimulatorPreview setup={fromPreset(presets.find(p => p.id === 'square-braid-16-threads') ?? presets[0]!)} />);
mount('explorer-preview', <ExplorerPreview />);
