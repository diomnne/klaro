'use client';

import type { ChatStatus } from 'ai';
import { useMemo, type FocusEvent, type KeyboardEvent } from 'react';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from '@/components/ai-elements/prompt-input';
import { COMPOSER_ID } from '@/components/draft/focus-composer';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { checkMessageLength, MAX_MESSAGE_LENGTH } from '@/lib/errors';
import { redact } from '@/lib/redact';
import { cn } from '@/lib/utils';

/** How long to wait after focus before scrolling: the on-screen keyboard takes a moment to open. */
const KEYBOARD_SETTLE_MS = 300;

const formatCount = new Intl.NumberFormat('en-US');

/** "1 character", "2 characters": the count is read aloud, so it should read right. */
function characters(count: number): string {
  return `${formatCount.format(count)} ${count === 1 ? 'character' : 'characters'}`;
}

/** How much room is left, in words: rounded up while there's plenty, exact near the end. */
function roomLeft(remaining: number): string {
  if (remaining <= 0) {
    return 'No characters left.';
  }

  return remaining <= 100
    ? `${characters(remaining)} left.`
    : `About ${characters(Math.ceil(remaining / 100) * 100)} left.`;
}

type ChatComposerProps = {
  status: ChatStatus;
  /** Called with the artist's text after it has been trimmed and redacted. */
  onSend: (text: string) => void;
  onStop: () => void;
};

/**
 * The message box. Sending is off for an empty or whitespace-only message and
 * for one over the length limit, measured on the text as redacted (what is
 * actually sent). While a reply is streaming, Enter does nothing, so a draft
 * typed in the meantime is kept rather than swallowed.
 */
export function ChatComposer({ status, onSend, onStop }: ChatComposerProps) {
  const { textInput } = usePromptInputController();
  const prefersReducedMotion = usePrefersReducedMotion();

  const text = textInput.value;
  const isGenerating = status === 'submitted' || status === 'streaming';

  const redacted = useMemo(() => redact(text.trim()), [text]);
  const length = checkMessageLength(redacted);

  const cannotSend = text.trim() === '' || length.tooLong;
  const over = -length.remaining;

  // The visible count changes with every key; what a screen reader hears only
  // changes every hundred characters, or when the message goes over.
  const announcement = length.tooLong
    ? `The message is ${characters(over)} over the limit of ${formatCount.format(MAX_MESSAGE_LENGTH)}.`
    : length.nearLimit
      ? roomLeft(length.remaining)
      : '';

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    // The vendored textarea submits on Enter, and an Enter during a reply would
    // reach onSend, which can't send, after which the form clears the draft.
    if (
      isGenerating &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
    }
  }

  function handleFocus(event: FocusEvent<HTMLTextAreaElement>): void {
    const textarea = event.currentTarget;

    // On a phone the keyboard slides up over the lower part of the page; once it
    // has settled, bring the box back into view.
    window.setTimeout(() => {
      textarea.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }, KEYBOARD_SETTLE_MS);
  }

  return (
    <PromptInput
      onSubmit={(message) => {
        const value = message.text?.trim() ?? '';
        const sent = redact(value);

        // Unreachable through the buttons and Enter, which are disabled in these
        // cases. Throwing (rather than returning) tells the form not to clear
        // the box, so a draft is never lost to a guard.
        if (value === '' || isGenerating || checkMessageLength(sent).tooLong) {
          throw new Error('Not sent: the message is empty, too long, or a reply is streaming.');
        }

        onSend(sent);
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          aria-describedby="composer-help"
          aria-invalid={length.tooLong}
          className="text-base md:text-base"
          id={COMPOSER_ID}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Paste the DM, or describe the commission…"
        />
      </PromptInputBody>
      {/* Must be a sibling of PromptInputBody, not inside it: InputGroup only
          switches from a fixed-height row to a growing column via
          `has-[>[data-align=block-end]]`, a direct-child selector. Nested, the
          footer is a grandchild and the textarea gets clipped to a 32px strip. */}
      <PromptInputFooter>
        <div className="flex min-w-0 flex-col gap-0.5" id="composer-help">
          <span className="text-xs text-muted-foreground">
            Klaro never suggests a price.
          </span>
          {length.tooLong ? (
            <span className="text-xs text-destructive">
              {characters(over)} over the {formatCount.format(MAX_MESSAGE_LENGTH)} limit.
              Shorten the message to send it.
            </span>
          ) : length.nearLimit ? (
            <span
              aria-hidden="true"
              className={cn('text-xs text-muted-foreground tabular-nums')}
            >
              {formatCount.format(length.length)} / {formatCount.format(MAX_MESSAGE_LENGTH)}
            </span>
          ) : null}
          <span aria-live="polite" className="sr-only" role="status">
            {announcement}
          </span>
        </div>
        {/* PromptInputSubmit needs onStop explicitly — it does not call stop()
            from `status` alone; without it the stop button just submits the
            empty form. While generating the button is Stop, so it stays enabled. */}
        <PromptInputSubmit
          className="size-11 sm:size-8"
          disabled={!isGenerating && cannotSend}
          onStop={onStop}
          status={status}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
