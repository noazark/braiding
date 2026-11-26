import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card } from '../model';
import { FindSlide } from './FindSlide';
import { LoadingSlide } from './LoadingSlide';

export interface FeedOverlayProps {
  readonly list: readonly Card[];
  readonly keys: readonly string[];
  /** The card to open on. */
  readonly start: number;
  /** Show a loading slide after the last card (the next one is being found). */
  readonly loading: boolean;
  readonly tried: number;
  /** End in a slide that generates the next braid when you get to it. */
  readonly end: boolean;
  /** The last search gave up without finding one. */
  readonly failed: boolean;
  readonly onGenerate: () => void;
  /** Which card is on screen, as the reader swipes. */
  readonly onIndex: (i: number) => void;
  readonly likes: ReadonlySet<string>;
  /** Braids found during this visit, tagged New. */
  readonly fresh: ReadonlySet<string>;
  readonly onLike: (key: string) => void;
  readonly onToggleLike: (key: string) => void;
  readonly onRecolor: (key: string) => void;
  readonly onClose: () => void;
}

/**
 * A card, opened: the cards full screen, one per swipe, in the grid's order. Only the card on screen
 * and its neighbors are drawn. Past the last card the
 * feed ends in a slide that generates the next braid when you get there (the loading slide shows
 * while it's found). Escape, Close, or a click
 * outside the card goes back to the grid.
 */
export function FeedOverlay({ list, keys, start, loading, tried, end, failed, onGenerate, onIndex, likes, fresh, onLike, onToggleLike, onRecolor, onClose }: FeedOverlayProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  /** The slide on screen: only it and its neighbors are drawn. */
  const [cur, setCur] = useState(start);

  useLayoutEffect(() => {
    const s = scroller.current!;
    s.scrollTop = start * s.clientHeight;
    close.current?.focus({ preventScroll: true });
    // only on opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      const d = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const s = scroller.current!;
      const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
      s.scrollTo({
        top: (Math.round(s.scrollTop / s.clientHeight) + d) * s.clientHeight,
        behavior: reduce ? 'auto' : 'smooth',
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onScroll = () => {
    const s = scroller.current!;
    const i = Math.round(s.scrollTop / s.clientHeight);
    setCur(i);
    onIndex(i);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Pattern cards">
      <button className="close" ref={close} onClick={onClose}>
        Close
      </button>
      <div className="feed" ref={scroller} onScroll={onScroll}>
        {/* slides are keyed by position, so the loading slide at the end becomes the card that arrives in
            it (the same element): whoever is looking at it sees the card appear, instead of the scroller
            following the loading slide down to the next position */}
        {Array.from({ length: list.length + (loading || end ? 1 : 0) }, (_, i) => {
          const e = list[i];
          // slides further away stay empty (but full height, so scrolling and snapping are unchanged)
          const near = Math.abs(i - cur) <= 1;
          return (
            <section className="slide" key={i} onClick={ev => ev.target === ev.currentTarget && onClose()}>
              {!e ? (
                loading ? (
                  <LoadingSlide tried={tried} />
                ) : near ? (
                  <EndSlide failed={failed} onGenerate={onGenerate} />
                ) : null
              ) : near ? (
                <FindSlide
                  card={e}
                  isNew={fresh.has(keys[i]!)}
                  liked={likes.has(keys[i]!)}
                  onLike={() => onLike(keys[i]!)}
                  onToggleLike={() => onToggleLike(keys[i]!)}
                  onRecolor={() => onRecolor(keys[i]!)}
                />
              ) : null}
            </section>
          );
        })}
      </div>
      <div className="hint" aria-hidden="true">
        Swipe or scroll for more ↓
      </div>
    </div>
  );
}

/**
 * The slide after the last card, while nothing is being found: getting here starts a search (so it's
 * seen only for a moment), or, after one gave up, offers to try again.
 */
function EndSlide({ failed, onGenerate }: { failed: boolean; onGenerate: () => void }) {
  return (
    <div className="loadingbox" role="status">
      <b>{failed ? 'Nothing new this time' : 'That’s all of them'}</b>
      <span className="tried">{failed ? 'No new braid turned up this time. Try again, or loosen the filters.' : 'Generate a new braid to keep going.'}</span>
      <button className="pri" onClick={onGenerate}>
        Generate
      </button>
    </div>
  );
}
