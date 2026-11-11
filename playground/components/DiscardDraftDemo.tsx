'use client';

import { useRef, useState, type JSX } from 'react';

import { Modal } from '@/playground/components/Modal';

/**
 * Demo wiring for <Modal>. It's a separate client component because the
 * playground page must stay a server component to export `metadata`, and the
 * dialog's open state needs the client.
 */
export function DiscardDraftDemo(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = (): void => setOpen(false);

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        className="flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
        onClick={() => {
          setStatus('');
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        Start a new agreement
      </button>

      {/* Present from the start (even when empty) so screen readers are
          already watching it when the message appears. */}
      <p className="min-h-5 text-sm text-muted-foreground" role="status">
        {status}
      </p>

      <Modal
        description="Your current draft will be discarded."
        // Cancel, not Discard: the pattern says to start on the least
        // destructive action when the other one can't be undone.
        initialFocusRef={cancelRef}
        onClose={close}
        open={open}
        returnFocusRef={triggerRef}
        title="Start a new agreement?"
      >
        <button
          className="h-10 rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-muted"
          onClick={close}
          ref={cancelRef}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-10 rounded-full bg-destructive px-5 text-sm font-medium text-destructive-foreground hover:opacity-90"
          onClick={() => {
            setStatus('Draft discarded. You’re starting a new agreement.');
            close();
          }}
          type="button"
        >
          Discard
        </button>
      </Modal>
    </div>
  );
}
