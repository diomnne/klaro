'use client';

import {
  useId,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

interface TabItem {
  /** Stable, unique within this tab set; used to build element ids. */
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  /** Accessible name for the tab list, e.g. "Agreement". */
  label: string;
  tabs: TabItem[];
  /** Index of the tab selected on first render. */
  defaultIndex?: number;
}

/**
 * APG Tabs pattern, automatic activation (selection follows focus):
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export function Tabs({ label, tabs, defaultIndex = 0 }: TabsProps): JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (tab: TabItem): string => `${baseId}-tab-${tab.id}`;
  const panelId = (tab: TabItem): string => `${baseId}-panel-${tab.id}`;

  const selectAndFocus = (index: number): void => {
    setSelectedIndex(index);
    tabRefs.current[index]?.focus();
  };

  // Arrow keys move between tabs instead of Tab, so the whole tab list is a
  // single stop in the page's tab order (roving tabindex).
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const last = tabs.length - 1;
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = selectedIndex === last ? 0 : selectedIndex + 1;
        break;
      case 'ArrowLeft':
        next = selectedIndex === 0 ? last : selectedIndex - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    // Home/End would otherwise also scroll the page.
    event.preventDefault();
    selectAndFocus(next);
  };

  return (
    <div className="rounded-sheet border border-border bg-card">
      <div
        aria-label={label}
        // Wraps on narrow screens rather than scrolling: a scroll container
        // would clip each tab's focus ring and show a stray scrollbar.
        className="flex flex-wrap gap-x-1 border-b border-border px-2"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const selected = index === selectedIndex;

          return (
            <button
              aria-controls={panelId(tab)}
              aria-selected={selected}
              className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${
                selected
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              id={tabId(tab)}
              key={tab.id}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={handleKeyDown}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Every panel stays in the DOM so each tab's aria-controls resolves;
          `hidden` removes the inactive ones from view and from assistive tech.
          tabIndex={0} because these panels hold plain text with nothing
          focusable, so without it Tab would skip straight past the content. */}
      {tabs.map((tab, index) => (
        <div
          aria-labelledby={tabId(tab)}
          className="px-4 py-4 text-sm leading-relaxed text-card-foreground"
          hidden={index !== selectedIndex}
          id={panelId(tab)}
          key={tab.id}
          role="tabpanel"
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
