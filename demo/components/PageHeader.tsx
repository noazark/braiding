import type { ReactNode } from 'react';
import './page-header.css';
import { SiteNav, type Page } from './SiteNav';

export interface PageHeaderProps {
  readonly title: string;
  /** Which page this is, so the nav links to the others. */
  readonly current: Page;
  /** A subtitle or anything else to show under the title row. */
  readonly children?: ReactNode;
  /** Extra controls on the title row, before the site nav. */
  readonly actions?: ReactNode;
  /** Stay at the top of the screen while the page scrolls. */
  readonly floating?: boolean;
  /** Pinned at the top with the page scrolling under it: the floating header shows its bottom rule. */
  readonly stuck?: boolean;
  /** Scrolled well down: the floating header slims to a compact bar. */
  readonly compact?: boolean;
}

/**
 * A tool page's header: its title with the site nav beside it, and an optional subtitle below. It can
 * float at the top of the screen while the page scrolls, slimming down once scrolled.
 */
export function PageHeader({ title, current, children, actions, floating, stuck, compact }: PageHeaderProps) {
  return (
    <header className={'top pagehead' + (floating ? ' floating' : '') + (stuck || compact ? ' stuck' : '') + (compact ? ' compact' : '')}>
      <div className="pagehead-row">
        <h1>{title}</h1>
        {actions}
        <SiteNav current={current} />
      </div>
      {children}
    </header>
  );
}
