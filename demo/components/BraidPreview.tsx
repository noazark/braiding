import { useRef } from 'react';
import { StrandChart } from './StrandChart';
import { useElementSize } from '../hooks/useElementSize';
import { useIsVisible } from '../hooks/useIsVisible';
import { runOf } from '../lib/diskSetup';
import { colorsOf, type Card } from '../lib/patternCards';

const STYLE = {
  bg: '#ffffff',
  accent: '#000',
  tw: 5,
  outline: '#000',
  ow: 2.5,
};

export interface BraidPreviewProps {
  readonly card: Card;
  /**
   * Draw right away and keep it. Otherwise (the default) the chart is drawn only while the card is
   * near the screen, and let go again once it's scrolled well away: a long grid holds only the
   * canvases around what's on screen. Drawing one takes about a millisecond, so it's cheap to redraw.
   */
  readonly eager?: boolean;
}

/** A pattern card's strand chart, filling its box. */
export function BraidPreview({ card, eager = false }: BraidPreviewProps) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(box);
  // drawn within 600px of the screen: ready just before it scrolls into view, gone once well past
  const near = useIsVisible(box, '600px 0px');
  // the chart ends in a few blank pixels, and is shifted up 8px to hide the ones at its top: ask for
  // enough extra that the threads run past the bottom edge (the box clips the rest)
  const tall = (height || 260) + 40;
  return (
    <div className="cv" ref={box}>
      {(eager || near) && width > 0 && (
        <StrandChart
          timeline={runOf(card.setup).timeline}
          colors={colorsOf(card)}
          columnWidth={12}
          steepness={0}
          corner={1.5}
          style={STYLE}
          width={width}
          minHeight={tall}
          maxHeight={tall}
        />
      )}
    </div>
  );
}
