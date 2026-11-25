import { useMemo } from 'react';
import { presets, seeded } from 'kumihimo';
import { PatternCard } from '../../components/PatternCard';
import { colorize, presetCard } from '../../lib/patternCards';

/** Three presets that look different from each other: a round cord, a weave and a card braid. */
const PICKS: [id: string, seed: number][] = [
  ['maru-yotsu-round-4-threads', 4],
  ['basket-weave-8-threads', 11],
  ['7-strand-over-2', 2],
];

/** The explorer's card on the home page: three pattern cards fanned out like a hand, each giving a little shimmy now and then. */
export function ExplorerPreview() {
  const entries = useMemo(
    () =>
      PICKS.flatMap(([id, seed]) => {
        const p = presets.find(x => x.id === id);
        const base = p && presetCard(p);
        const card = base && presetCard(p, colorize(base.profile.strands, seeded(seed)));
        return card ? [card] : [];
      }),
    [],
  );
  return (
    <div className="explorer-preview" aria-hidden="true">
      {entries.map((e, i) => (
        <PatternCard key={e.setup.pattern} card={e} className="fanned" style={{ '--i': i - (entries.length - 1) / 2 } as React.CSSProperties} />
      ))}
    </div>
  );
}
