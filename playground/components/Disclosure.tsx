'use client';

import { useId, useState, type JSX, type ReactNode } from 'react';

interface DisclosureProps {
  /** Always visible; it is the toggle button's accessible name. */
  summary: ReactNode;
  /** Shown only while expanded. */
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * APG Disclosure (Show/Hide) pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: DisclosureProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="rounded-sheet border border-border bg-card">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-sheet bg-gap px-4 py-3 text-left text-sm font-medium text-gap-foreground"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        type="button"
      >
        <span>{summary}</span>
        {/* Decorative: aria-expanded already tells assistive tech the state. */}
        <svg
          aria-hidden="true"
          className={`size-4 shrink-0 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          focusable="false"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Hidden rather than unmounted, so aria-controls always points at an
          element that exists. `hidden` also drops it from the tab order and
          the accessibility tree while collapsed. */}
      <div
        className="px-4 py-3 text-sm leading-relaxed text-card-foreground"
        hidden={!open}
        id={panelId}
      >
        {children}
      </div>
    </div>
  );
}
