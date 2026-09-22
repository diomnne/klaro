import Link from 'next/link';

import { NavLink } from '@/components/nav-link';

const NAV_LINK_CLASS =
  'rounded text-sm font-medium text-muted-foreground aria-[current=page]:text-foreground';

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 sm:px-16"
      >
        <Link
          href="/"
          className="rounded text-base font-semibold tracking-tight text-foreground"
        >
          Klaro
        </Link>
        <div className="flex items-center gap-6">
          <NavLink href="/draft" className={NAV_LINK_CLASS}>
            Draft
          </NavLink>
          <NavLink href="/about" className={NAV_LINK_CLASS}>
            About
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
