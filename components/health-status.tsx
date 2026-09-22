'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Health } from '@/lib/health';

type State =
  | { phase: 'loading' }
  | { phase: 'success'; health: Health }
  | { phase: 'error' };

function formatCheckedAt(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  // Locale-dependent, so it only runs client-side — no hydration mismatch.
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export function HealthStatus() {
  const [state, setState] = useState<State>({ phase: 'loading' });
  // Bumping this re-runs the effect, which builds a fresh AbortController.
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => {
    setState({ phase: 'loading' });
    setAttempt((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch('/api/health', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const health: Health = await response.json();
        setState({ phase: 'success', health });
      } catch {
        // An abort is a cancelled render, not a failure worth reporting.
        if (controller.signal.aborted) {
          return;
        }

        setState({ phase: 'error' });
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [attempt]);

  if (state.phase === 'loading') {
    return (
      <p role="status" className="text-base text-muted-foreground">
        Checking&hellip;
      </p>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-base text-destructive">
          Couldn&rsquo;t reach the health check
        </p>
        <HealthButton onClick={refresh}>Retry</HealthButton>
      </div>
    );
  }

  const { health } = state;

  return (
    <div className="flex flex-col items-start gap-6">
      <dl className="w-full max-w-md rounded-sheet border border-border bg-card">
        <HealthRow label="Status" value={health.status} />
        <HealthRow label="App" value={health.app} />
        <HealthRow label="Version" value={health.version} />
        <HealthRow label="Environment" value={health.environment} />
        <HealthRow label="Checked at" value={formatCheckedAt(health.checkedAt)} />
        <HealthRow
          label="Claude API key configured"
          value={health.checks.anthropicApiKeyConfigured ? 'Yes' : 'No'}
        />
      </dl>
      <HealthButton onClick={refresh}>Refresh</HealthButton>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border px-4 py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-card-foreground">{value}</dd>
    </div>
  );
}

function HealthButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
    >
      {children}
    </button>
  );
}
