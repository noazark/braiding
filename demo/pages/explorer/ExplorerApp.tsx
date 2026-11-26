import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { PageHeader } from '../../components/PageHeader';
import { PatternCard, type PatternCardProps } from '../../components/PatternCard';
import { useScrolledPast } from '../../hooks/useScrolledPast';
import { ExploreCard } from './components/ExploreCard';
import { FeedOverlay } from './components/FeedOverlay';
import { FilterBar } from './components/FilterBar';
import { DEFAULT_SETTINGS, NO_FILTERS, TRAITS, fitsTraits, inFilters, matches, randomSettings, traitOf, type Filters, type Settings, type TraitKey } from './model';
import { useLikes } from './likes';
import { useExplorer } from './useExplorer';

/** A card in the grid. Takes its place and a stable `onOpenAt`, so it re-renders only when it changes. */
const GridCard = memo(function GridCard({ index, onOpenAt, ...rest }: Omit<PatternCardProps, 'onOpen'> & { index: number; onOpenAt: (i: number) => void }) {
  return <PatternCard {...rest} onOpen={useCallback(() => onOpenAt(index), [onOpenAt, index])} />;
});

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
  /** Which braids the grid shows, by their traits, from the filter bar. */
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
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

  const feedOpen = open != null;
  // the likes the Liked filter goes by: held while the feed is open, so unliking there doesn't pull cards out from under it
  const [viewLikes, setViewLikes] = useState(likes);
  useEffect(() => {
    if (!feedOpen) setViewLikes(likes);
  }, [feedOpen, likes]);

  // the cards that pass the Shape setting and the filter bar, in the order they arrived (presets first), keyed by signature;
  // and each chip's count: the cards it would show alongside the other filters that are on (its own trait's other chips aside)
  const { list, keys, options, nLiked } = useMemo(() => {
    const rows = [...ex.entries].filter(([, e]) => matches(settings.shape)(e));
    const options = Object.fromEntries(
      TRAITS.map(([k]) => {
        const others = inFilters({ ...filters, [k]: new Set() }, viewLikes);
        const n = new Map<string | number, number>();
        // every value under the Shape setting gets a chip, even when the other filters leave it none
        for (const [, e] of rows) {
          const v = traitOf(e, k);
          n.set(v, (n.get(v) ?? 0) + (others(e) ? 1 : 0));
        }
        return [k, [...n].sort(([a], [b]) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))))];
      }),
    ) as Record<TraitKey, [string | number, number][]>;
    const shown = rows.filter(([, e]) => inFilters(filters, viewLikes)(e));
    const traits = fitsTraits(filters);
    return {
      list: shown.map(r => r[1]),
      keys: shown.map(r => r[0]),
      options,
      nLiked: rows.filter(([k, e]) => viewLikes.has(k) && traits(e)).length,
    };
    // `version` says when the entries changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.version, ex.entries, settings.shape, filters, viewLikes]);

  // stable, so the grid's cards (memoized) don't all re-render while a search ticks
  const openAt = useCallback((i: number) => {
    setAt(i);
    setOpen(i);
  }, []);

  // in the feed, near the end: find the next card from fully random settings, with the traits picked in the filter bar
  // (not while showing liked braids only: a find is never liked yet)
  useEffect(() => {
    if (feedOpen && !filters.liked && ex.searching == null && at >= list.length - 1 - AHEAD) {
      ex.findOne(randomSettings(Math.random, settings.shape), undefined, fitsTraits(filters));
      setLimit(l => Math.max(l, list.length + 1));
    }
  }, [feedOpen, at, list.length, ex, settings.shape, filters]);

  // the end of the grid near the screen: show the next few cards
  const hasMore = list.length > limit;
  useEffect(() => {
    const el = more.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(es => es.some(e => e.isIntersecting) && setLimit(l => l + PAGE), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit]);

  // closing the feed stops any search it was waiting on
  const cancelSearch = ex.cancel;
  // The card on screen shrinks back into its place in the grid (a view transition between the two),
  // the grid scrolled to bring that place into view; it then takes the focus, so it's clear where you
  // are and why. Without view transitions (or with reduced motion), it just
  // closes onto the same place.
  const close = useCallback(() => {
    cancelSearch();
    // the grid's cards come after the settings card
    const gridCard = () => grid.current?.children[at + 1] as HTMLElement | undefined;
    const update = () => {
      flushSync(() => {
        setOpen(null);
        setLimit(l => Math.max(l, at + 1));
      });
      const el = gridCard();
      if (el) {
        el.scrollIntoView({ block: 'center' });
        el.style.viewTransitionName = 'opened-card';
      }
    };
    const land = () => {
      const el = gridCard();
      if (!el) return;
      el.style.viewTransitionName = '';
      el.focus({ preventScroll: true });
    };
    const shown = document.querySelector<HTMLElement>(`.feed > .slide:nth-child(${at + 1}) .feed-card`);
    if (!document.startViewTransition || !shown || matchMedia('(prefers-reduced-motion:reduce)').matches) {
      update();
      land();
      return;
    }
    shown.style.viewTransitionName = 'opened-card';
    document.startViewTransition(update).finished.finally(land);
  }, [at, cancelSearch]);

  const toTop = () => {
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
    // the button hides once at the top: leave the focus at the start of the page, not lost
    const h1 = document.querySelector<HTMLElement>('.pagehead h1');
    h1?.setAttribute('tabindex', '-1');
    h1?.focus({ preventScroll: true });
  };

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
      >
        <FilterBar
          filters={filters}
          options={options}
          nLiked={nLiked}
          onChange={f => {
            setLimit(PAGE);
            setFilters(f);
          }}
        />
      </PageHeader>
      <div className="grid" ref={grid}>
        <ExploreCard
          settings={settings}
          onChange={s => {
            if (s.shape !== settings.shape) setLimit(PAGE);
            setSettings(s);
          }}
          onExplore={() => {
            // a find is never liked yet: stop showing liked braids only, so it can show
            if (filters.liked) setFilters({ ...filters, liked: false });
            // open the feed on its loading slide straight away: the find lands there when it's ready
            ex.findOne(settings, undefined, fitsTraits(filters));
            setLimit(l => Math.max(l, list.length + 1));
            openAt(list.length);
          }}
          busy={ex.searching != null}
          status={status}
        />
        {shown.map((e, i) => (
          <GridCard
            key={keys[i]}
            index={i}
            card={e}
            isNew={ex.fresh.has(keys[i]!)}
            liked={likes.has(keys[i]!)}
            className={keys[i] === ex.latest ? 'fresh' : undefined}
            onOpenAt={openAt}
          />
        ))}
        {hasMore && <div className="more" ref={more} aria-hidden="true" />}
      </div>
      {/* floats at the bottom of the screen once scrolled down; out of reach (inert) while hidden */}
      <button className="totop" data-show={scrolled || undefined} inert={!scrolled} onClick={toTop}>
        ↑ Top
      </button>
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
