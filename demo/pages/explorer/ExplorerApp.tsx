import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { PatternCard } from '../../components/PatternCard';
import { useScrolledPast } from '../../hooks/useScrolledPast';
import { ExploreCard } from './components/ExploreCard';
import { FeedOverlay } from './components/FeedOverlay';
import { DEFAULT_SETTINGS, matches, randomSettings, type Settings } from './model';
import { useLikes } from './likes';
import { useExplorer } from './useExplorer';

/** Cards added to the grid at a time, as its end comes near the screen. */
const PAGE = 24;
/** While a card is open, keep this many cards found past the one on screen, so a swipe lands on one that's ready. */
const AHEAD = 1;

/**
 * The explorer: a grid of pattern cards led by the settings card, shown a few at a time as you scroll. Opening a card (or a new find)
 * goes full screen, one card per swipe; swiping past the last card keeps finding new braids from fully
 * random settings, which join the grid too.
 */
export function ExplorerApp() {
  const { likes, like, toggle } = useLikes();
  const ex = useExplorer(likes);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [limit, setLimit] = useState(PAGE);
  /** The card the full-screen feed opened on, or null when it's closed. */
  const [open, setOpen] = useState<number | null>(null);
  /** The card on screen in the feed. */
  const [at, setAt] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  /** Scrolled down the grid: the floating header slims down and offers a way back to the top. */
  const scrolled = useScrolledPast(240);
  /** Scrolled past the header's own starting place: it's pinned, with the grid running under it. */
  const stuck = useScrolledPast(18);
  /** Sits after the last card shown: when it nears the screen, show more. */
  const more = useRef<HTMLDivElement>(null);
  /** Set by Explore: open the feed on the find when it arrives. */
  const openNext = useRef(false);

  // the cards that pass the Shape setting, in the order they arrived (presets first), keyed by signature
  const { list, keys } = useMemo(() => {
    const rows = [...ex.entries].filter(([, e]) => matches(settings.shape)(e));
    return { list: rows.map(r => r[1]), keys: rows.map(r => r[0]) };
    // `version` says when the entries changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.version, ex.entries, settings.shape]);

  const openAt = (i: number) => {
    setAt(i);
    setOpen(i);
  };

  // Explore's find opens straight into the feed (and the grid shows enough cards to include it)
  useEffect(() => {
    if (!openNext.current || !ex.latest) return;
    openNext.current = false;
    const i = keys.indexOf(ex.latest);
    if (i < 0) return;
    setLimit(l => Math.max(l, i + 1));
    openAt(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.latest, ex.version]);

  // in the feed, near the end: find the next card from fully random settings
  const feedOpen = open != null;
  useEffect(() => {
    if (feedOpen && ex.searching == null && at >= list.length - 1 - AHEAD) {
      ex.findOne(randomSettings(Math.random, settings.shape));
      setLimit(l => Math.max(l, list.length + 1));
    }
  }, [feedOpen, at, list.length, ex, settings.shape]);

  // the end of the grid near the screen: show the next few cards
  const hasMore = list.length > limit;
  useEffect(() => {
    const el = more.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(es => es.some(e => e.isIntersecting) && setLimit(l => l + PAGE), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit]);

  const close = useCallback(() => {
    setOpen(null);
    setLimit(l => Math.max(l, at + 1));
    // leave the grid showing the card that was last on screen
    requestAnimationFrame(() => (grid.current?.children[at + 1] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' }));
  }, [at]);

  const nPresets = [...ex.entries.values()].filter(c => c.known).length;
  const nFound = ex.entries.size - nPresets;
  const status =
    ex.searching != null ? (
      <>
        <b>{ex.searching.toLocaleString()}</b> patterns tried…
      </>
    ) : (
      <>
        <b>{nPresets}</b> presets · <b>{nFound}</b> found{ex.note}
      </>
    );
  const shown = list.slice(0, limit);

  return (
    <div className="band">
      <PageHeader
        title="Braiding patterns"
        current="explorer"
        floating
        stuck={stuck}
        compact={scrolled}
        actions={
          scrolled && (
            <button
              className="pagehead-actions totop"
              onClick={() =>
                scrollTo({
                  top: 0,
                  behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
                })
              }
            >
              ↑ Top
            </button>
          )
        }
      />
      <div className="grid" ref={grid}>
        <ExploreCard
          settings={settings}
          onChange={s => {
            if (s.shape !== settings.shape) setLimit(PAGE);
            setSettings(s);
          }}
          onExplore={() => {
            openNext.current = true;
            ex.findOne(settings);
          }}
          busy={ex.searching != null}
          status={status}
        />
        {shown.map((e, i) => (
          <PatternCard
            key={keys[i]}
            card={e}
            isNew={ex.fresh.has(keys[i]!)}
            liked={likes.has(keys[i]!)}
            className={keys[i] === ex.latest ? 'fresh' : undefined}
            onOpen={() => openAt(i)}
          />
        ))}
        {hasMore && <div className="more" ref={more} aria-hidden="true" />}
      </div>
      {open != null && (
        <FeedOverlay
          list={list}
          keys={keys}
          start={open}
          loading={ex.searching != null}
          tried={ex.searching ?? 0}
          onIndex={setAt}
          likes={likes}
          fresh={ex.fresh}
          onLike={like}
          onToggleLike={toggle}
          onRecolor={ex.recolor}
          onClose={close}
        />
      )}
    </div>
  );
}
