'use client';

import { useEffect } from 'react';

// This file replaces the root layout when it renders, so the layout's styles
// aren't there. The tokens and base styles come from here.
import './globals.css';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    // The app's own layout (and its font setup) is what failed, so this page
    // carries its own document and uses plain elements and the system fonts.
    <html lang="en">
      {/* The same safe-area padding as the app's own layout, added to the p-6. */}
      <body className="flex min-h-screen items-center justify-center bg-background p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[calc(1.5rem+env(safe-area-inset-left))] text-foreground">
        <main className="flex w-full max-w-xl flex-col gap-3 rounded-sheet border border-border bg-card p-6">
          <h1 className="text-title font-semibold tracking-tight">
            Klaro hit a problem
          </h1>
          <p className="text-sm text-muted-foreground">
            The app couldn&rsquo;t load properly. Nothing was lost: a draft you
            were working on is saved in this browser.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">
              If you contact us, mention this reference: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:h-8"
              onClick={() => unstable_retry()}
              type="button"
            >
              Try again
            </button>
            {/* A plain link on purpose: the router may be what failed, and a full
                page load is the most reliable way out. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium sm:h-8"
              href="/"
            >
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
