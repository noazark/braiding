const PAGES = [
  { id: 'home', href: '../', label: 'Home' },
  { id: 'simulator', href: '../simulator/', label: 'Braiding simulator' },
  { id: 'explorer', href: '../explorer/', label: 'Braiding patterns' },
] as const;

export type Page = (typeof PAGES)[number]['id'];

/** Links to the other pages of the site. */
export function SiteNav({ current }: { current: Page }) {
  return (
    <nav className="sitenav" aria-label="Site">
      {PAGES.filter(p => p.id !== current).map(p => (
        <a key={p.id} href={p.href} className={p.id === 'home' ? 'home' : undefined}>
          {p.id === 'home' ? 'Home' : p.label}
        </a>
      ))}
    </nav>
  );
}
