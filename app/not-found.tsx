import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page not found — Klaro',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center">
      <main className="flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div className="flex flex-col gap-3 rounded-sheet border border-border bg-card p-6">
          <Search aria-hidden="true" className="size-5 text-muted-foreground" />
          <h1 className="text-title font-semibold tracking-tight text-foreground">
            That page doesn&rsquo;t exist
          </h1>
          <p className="text-sm text-muted-foreground">
            The address may have a typo, or the page may have moved. To check a
            client&rsquo;s message, start from the draft page.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="h-11 sm:h-8" size="default">
              <Link href="/draft">Check a client&rsquo;s message</Link>
            </Button>
            <Button asChild className="h-11 sm:h-8" size="default" variant="outline">
              <Link href="/">Go to the home page</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
