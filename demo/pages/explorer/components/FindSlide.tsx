import { useRef, useState } from 'react';
import { HEART_PATH, HEART_VIEWBOX, Heart } from '../../../components/Heart';
import { PatternCard } from '../../../components/PatternCard';
import { describe, toLink } from '../../../lib/diskSetup';
import type { Card } from '../model';

export interface FindSlideProps {
  readonly card: Card;
  /** Found during this visit. */
  readonly isNew: boolean;
  readonly liked: boolean;
  /** Double-tap: like (never unlikes). */
  readonly onLike: () => void;
  /** The heart button: like or unlike. */
  readonly onToggleLike: () => void;
  readonly onRecolor: () => void;
}

/** Two taps within this long, close together, make a double-tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;

/**
 * One braid in the full-screen feed (the contents of a slide): its pattern card, scaled up to fill the
 * screen at the card's own proportions, with its setup written out. Double-tap the card to like it
 * (a heart bursts where you tapped); the buttons open it in the simulator (in a new tab, so the
 * explorer's finds stay put), like or unlike it, and recolor it.
 */
export function FindSlide({ card, isNew, liked, onLike, onToggleLike, onRecolor }: FindSlideProps) {
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  const onPointerUp = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button,a,pre')) return;
    const now = performance.now();
    const prev = lastTap.current;
    if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_PX) {
      lastTap.current = null;
      onLike();
      const id = now;
      setBursts(b => [...b, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 900);
    } else lastTap.current = { t: now, x: e.clientX, y: e.clientY };
  };

  return (
    <div className="tap" onPointerUp={onPointerUp}>
      <PatternCard card={card} className="feed-card" eager isNew={isNew} liked={liked}>
        <pre className="setup">{describe(card.setup)}</pre>
        <div className="actions">
          <a className="button pri" href={'../simulator/#' + toLink(card.setup)} target="_blank" rel="noopener">
            Open
          </a>
          <button onClick={onRecolor}>New colors</button>
          <button
            className={'like' + (liked ? ' on' : '')}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
            title={liked ? 'Unlike' : 'Like (or double-tap the card)'}
            onClick={onToggleLike}
          >
            <Heart />
          </button>
        </div>
      </PatternCard>
      {bursts.map(b => (
        <svg key={b.id} className="burst" style={{ left: b.x, top: b.y }} viewBox={HEART_VIEWBOX} aria-hidden="true">
          <path d={HEART_PATH} />
        </svg>
      ))}
    </div>
  );
}
