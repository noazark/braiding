import { useRef } from 'react';
import { StrandChart } from './StrandChart';
import { useElementSize } from '../hooks/useElementSize';
import { useInView } from '../hooks/useInView';
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
   * Draw right away. Otherwise (the default) the chart is drawn only once the card comes near the
   * screen, so a long grid of cards costs nothing until it's scrolled to.
   */
  readonly eager?: boolean;
}

/** A pattern card's strand chart, filling its box. */
export function BraidPreview({ card, eager = false }: BraidPreviewProps) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(box);
  // drawn once within 300px of the screen: ready just before it scrolls into view
  const near = useInView(box, undefined, '300px 0px');
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
          // the chart ends in a few blank pixels, and is shifted up 8px to hide the ones at its top: ask for
          // enough extra that the threads run past the bottom edge (the box clips the rest)
          minHeight={(height || 260) + 40}
        />
      )}
    </div>
  );
}
