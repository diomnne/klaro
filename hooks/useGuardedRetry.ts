import type { ChatStatus } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';

/** If a retry somehow never settles, let go of the lock rather than leave Retry dead. */
const LOCK_TIMEOUT_MS = 45_000;

type GuardedRetry = {
  /** Safe to call twice in a row: the second call does nothing. */
  retry: () => void;
  /** A retry has been started and hasn't settled yet. */
  pending: boolean;
};

/**
 * Runs a retry at most once at a time. `pending` goes true the instant Retry is
 * pressed, before React re-renders, because the lock is a ref: a double click
 * (two clicks in one tick) reaches `action` once. It lets go when the request
 * has come back to rest, either finished or failed again, so a failure can be
 * retried again.
 */
export function useGuardedRetry({
  status,
  error,
  action,
}: {
  status: ChatStatus;
  error: unknown;
  action: () => void | Promise<void>;
}): GuardedRetry {
  const lockRef = useRef(false);
  const sawBusyRef = useRef(false);
  const errorAtPressRef = useRef<unknown>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [pending, setPending] = useState(false);

  const release = useCallback(() => {
    window.clearTimeout(timerRef.current);
    lockRef.current = false;
    sawBusyRef.current = false;
    setPending(false);
  }, []);

  useEffect(() => {
    if (!lockRef.current) {
      return;
    }

    if (status === 'submitted' || status === 'streaming') {
      sawBusyRef.current = true;
      return;
    }

    // Back at rest. Either the retry ran (busy, then ready or error), or it
    // failed so fast that React never rendered it busy: a different error says so.
    if (sawBusyRef.current || (status === 'error' && error !== errorAtPressRef.current)) {
      release();
    }
  }, [status, error, release]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const retry = useCallback(() => {
    if (lockRef.current) {
      return;
    }

    lockRef.current = true;
    sawBusyRef.current = false;
    errorAtPressRef.current = error;
    timerRef.current = window.setTimeout(release, LOCK_TIMEOUT_MS);
    setPending(true);

    void action();
  }, [action, error, release]);

  return { retry, pending };
}
