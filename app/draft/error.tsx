'use client';

import { RouteError } from '@/components/route-error';
import { Button } from '@/components/ui/button';
import { clearMessages } from '@/lib/chat-storage';

export default function DraftError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      extraAction={
        // If the saved draft is what breaks the page, a plain retry would fail
        // the same way every time. This is the way out, and it says what it costs.
        <Button
          className="h-11 sm:h-8"
          onClick={() => {
            clearMessages();
            unstable_retry();
          }}
          size="default"
          type="button"
          variant="outline"
        >
          Discard the saved draft and try again
        </Button>
      }
      onRetry={unstable_retry}
      title="The draft page hit a problem"
    >
      <p>Your draft is saved in this browser, so trying again keeps it.</p>
      <p>
        If the page fails again every time, the saved draft may be the cause.
        Discarding it starts a fresh draft.
      </p>
    </RouteError>
  );
}
