'use client';

import { RouteError } from '@/components/route-error';

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError error={error} onRetry={unstable_retry} title="Something went wrong on this page">
      <p>This page didn&rsquo;t load properly. Nothing was lost.</p>
      <p>Trying again often fixes it.</p>
    </RouteError>
  );
}
