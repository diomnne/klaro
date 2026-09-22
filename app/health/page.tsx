import type { Metadata } from 'next';

import { HealthStatus } from '@/components/health-status';

export const metadata: Metadata = {
  title: 'System health — Klaro',
  robots: { index: false, follow: false },
};

export default function Health() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-16">
        <h1 className="text-title font-semibold tracking-tight text-foreground">
          System health
        </h1>

        <HealthStatus />
      </main>
    </div>
  );
}
