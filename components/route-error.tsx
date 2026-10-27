'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type RouteErrorProps = {
  /** The error the boundary caught. Logged in the console, never shown. */
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment. */
  onRetry: () => void;
  title: string;
  children: ReactNode;
  /** An extra way out, for errors a plain retry can't fix. */
  extraAction?: ReactNode;
};

/**
 * The calm page a failed route shows. It says what happened and what is safe,
 * and offers a retry and a way home. The error itself goes to the console for
 * whoever is debugging; the message is never rendered, since in production it
 * is a generic string and in development it can carry internals.
 */
export function RouteError({
  error,
  onRetry,
  title,
  children,
  extraAction,
}: RouteErrorProps) {
  useEffect(() => {
    console.error('[route error]', error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center">
      <main className="flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div className="flex flex-col gap-3 rounded-sheet border border-border bg-card p-6">
          <TriangleAlert aria-hidden="true" className="size-5 text-muted-foreground" />
          <h1 className="text-title font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {children}
          </div>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">
              If you contact us, mention this reference: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button className="h-11 sm:h-8" onClick={onRetry} size="default" type="button">
              Try again
            </Button>
            {extraAction}
            <Button asChild className="h-11 sm:h-8" size="default" variant="outline">
              <Link href="/">Go to the home page</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
