import { memo } from 'react';
import './pattern-card.css';
import { turnsLabel } from '../lib/messages';
import { FAMILY_LABEL, isRound, waste, type Card } from '../lib/patternCards';
import { BraidPreview } from './BraidPreview';
import { Heart } from './Heart';

export interface PatternCardProps {
  readonly card: Card;
  /** Makes the card a button. Without it the card is a static picture (as on the home page). */
  readonly onOpen?: () => void;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  /** Tag it "New": found during this visit (not carried over from an earlier one). */
  readonly isNew?: boolean;
  /** Show a heart: you've liked this braid. */
  readonly liked?: boolean;
  /** Draw the braid right away instead of when the card comes near the screen. */
  readonly eager?: boolean;
  /** Extra footer content under the card's facts (the explorer feed puts its buttons here). */
  readonly children?: React.ReactNode;
}

/** A pattern card: the braid's strand chart, tags, its name and a line of facts. */
export const PatternCard = memo(function PatternCard({ card, onOpen, className, style, eager, isNew, liked, children }: PatternCardProps) {
  const { profile: p, known, family, simplifiedFrom } = card;
  const interactive = onOpen
    ? {
        tabIndex: 0,
        role: 'button',
        'aria-label': `${known || p.name}: details`,
        onClick: onOpen,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          onOpen();
        },
      }
    : {};
  return (
    <div className={'card' + (onOpen ? ' clickable' : '') + (className ? ' ' + className : '')} style={style} {...interactive}>
      <BraidPreview card={card} eager={eager} />
      <div className="meta">
        <div>
          {known ? <span className="tag known">Preset</span> : isNew ? <span className="tag new">New</span> : null}
          <span className="tag shape">{isRound(card) ? 'Round' : 'Flat'}</span>
          {liked && (
            <span className="tag liked" title="Liked" aria-label="Liked">
              <Heart />
            </span>
          )}
          {simplifiedFrom ? <span className="tag simp">Simplified</span> : waste(card) ? <span className="tag simp">Needless moves</span> : null}
        </div>
        <div className="t">{known || p.name}</div>
        <div className="s">
          {known ? `${p.strands} threads · ` : ''}repeats every {p.repeat.length} · {FAMILY_LABEL[family]}
          {p.repeat.turns ? ` · turns ${turnsLabel(p.repeat.turns)}×` : ''}
        </div>
        {children}
      </div>
    </div>
  );
});
