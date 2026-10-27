'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MotionConfig } from 'motion/react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { PromptInputProvider } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { ChatComposer } from '@/components/draft/chat-composer';
import { ChatEmptyState } from '@/components/draft/chat-empty-state';
import {
  ChatErrorNotice,
  type ChatNoticeKind,
} from '@/components/draft/chat-error-notice';
import { ChatSkeleton } from '@/components/draft/chat-skeleton';
import { NewDraftButton } from '@/components/draft/new-draft-button';
import { ScamCheckCard } from '@/components/draft/scam-check-card';
import { useGuardedRetry } from '@/hooks/useGuardedRetry';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';
import type { KlaroUIMessage } from '@/lib/ai/klaro';
import {
  hasReplyContent,
  hasVisibleContent,
  isInterruptedTranscript,
} from '@/lib/chat-recovery';
import { clearMessages, loadMessages, saveMessages } from '@/lib/chat-storage';
import {
  classifyChatError,
  cooldownSeconds,
  DEFAULT_COOLDOWN_SECONDS,
  parseErrorBody,
} from '@/lib/errors';
import { createReviewFlagSource } from '@/lib/review-flags';

/**
 * Stateless apart from the review flags, which fail once per page load: the
 * source is created with the page, so a reload re-arms them. One instance is
 * shared rather than rebuilt on every render.
 */
const transport = new DefaultChatTransport<KlaroUIMessage>({
  api: '/api/chat',
  body: createReviewFlagSource(() => window.location.search),
});

/**
 * How long a reply may go without a first chunk before the thinking indicator
 * says it's taking a while.
 */
const SLOW_RESPONSE_MS = 10_000;

/**
 * How long a stream may produce nothing before it's treated as dead. Generous
 * on purpose: the model can legitimately pause mid-answer, and a false positive
 * here would interrupt a working reply.
 */
const STALL_TIMEOUT_MS = 25_000;

/** What a rate limit has set up: when Retry opens again, and for which error. */
type Cooldown = { until: number; remaining: number; forError: Error };

export function ChatPanel() {
  // The provider lets the examples and the composer share one text box.
  return (
    <PromptInputProvider>
      <ChatPanelContent />
    </PromptInputProvider>
  );
}

function ChatPanelContent() {
  // Sizes the panel from the visible area, so the composer clears the keyboard.
  useVisualViewportHeight();

  const online = useOnlineStatus();

  // MotionConfig below only covers transform/size animations, and the
  // scroll-to-bottom spring is JS-driven, so both need the preference directly.
  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollAnimation = prefersReducedMotion ? 'instant' : 'smooth';

  // A finished turn that said nothing (a filtered or empty reply).
  const [emptyTurn, setEmptyTurn] = useState(false);

  const [cooldown, setCooldown] = useState<Cooldown | null>(null);

  // What the notice was about when Retry was pressed, so it can stay on screen,
  // as "Retrying…", while the error that raised it is cleared.
  const [retryKind, setRetryKind] = useState<ChatNoticeKind | null>(null);

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    clearError,
    setMessages,
  } = useChat<KlaroUIMessage>({
    transport,
    onError: (failure) => {
      if (classifyChatError(failure) === 'rate_limited') {
        const seconds = cooldownSeconds(parseErrorBody(failure.message).retryAfter);

        setCooldown({
          until: Date.now() + seconds * 1000,
          remaining: seconds,
          forError: failure,
        });
      }
    },
    // A turn that ends cleanly with nothing in it would otherwise show as an
    // empty bubble. Errors and Stop are their own cases.
    onFinish: ({ message, isAbort, isDisconnect, isError }) => {
      if (!isAbort && !isDisconnect && !isError && !hasReplyContent(message)) {
        setEmptyTurn(true);
      }
    },
  });

  // Restoring in an effect rather than through useChat's `messages` option:
  // localStorage isn't readable during SSR, so seeding initial state from it
  // would make the server and client markup disagree on first paint.
  const hydrated = useRef(false);

  // `ready`: until the saved draft is read, a skeleton stands in for the
  // transcript, so neither the empty state nor an empty transcript flashes
  // before it appears. It also gates the first write, so the empty initial state
  // can't clobber a saved transcript before the effect below has restored it.
  // `interrupted`: the page can close mid-reply, and the draft is saved as it
  // streams, so a draft that ends that way mustn't pass for a finished one.
  // One state, set once, so both arrive in the same render.
  const [restore, setRestore] = useState({ ready: false, interrupted: false });
  const { ready } = restore;
  const restoredInterrupted = restore.interrupted;

  useEffect(() => {
    if (hydrated.current) {
      return;
    }

    hydrated.current = true;

    const saved = loadMessages();

    if (saved) {
      // loadMessages shape-checks the transcript but can't know Klaro's tool
      // types; this is the trust boundary for what localStorage hands back.
      setMessages(saved as KlaroUIMessage[]);
    }

    setRestore({
      ready: true,
      interrupted: saved ? isInterruptedTranscript(saved) : false,
    });
  }, [setMessages]);

  useEffect(() => {
    if (ready) {
      saveMessages(messages);
    }
  }, [messages, ready]);

  const isStreaming = status === 'submitted' || status === 'streaming';

  // Counts down a rate limit's cooldown. The first value is set with the error;
  // this only brings it down, once a second, from the interval.
  const cooldownUntil = cooldown?.until;

  useEffect(() => {
    if (cooldownUntil === undefined) {
      return;
    }

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

      setCooldown((current) =>
        current && current.until === cooldownUntil ? { ...current, remaining } : current,
      );

      if (remaining === 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  // A provider failure that exhausts its retries can close the stream after the
  // opening chunk and before any text. The SDK treats that as a still-running
  // stream, so without this the composer stays locked behind a shimmer that
  // never resolves. Observed against Gemini's free tier under load.
  // Each holds a key for the request that went quiet rather than a bare flag, so
  // it clears itself when the next request starts instead of needing a reset
  // effect. The key is the request number plus the last message's id: the id
  // alone isn't enough, because a retry re-sends the same last message, and a
  // stall from the attempt before would still match it.
  const [requestSeq, setRequestSeq] = useState(0);
  const [slowAt, setSlowAt] = useState<string | null>(null);
  const [stalledAt, setStalledAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    const turnKey = `${requestSeq}:${messages.at(-1)?.id ?? ''}`;
    const slowTimer = setTimeout(() => setSlowAt(turnKey), SLOW_RESPONSE_MS);
    const stallTimer = setTimeout(() => setStalledAt(turnKey), STALL_TIMEOUT_MS);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(stallTimer);
    };
    // Re-armed on every new chunk: while text is arriving the timers keep
    // resetting, so only a genuine stall reaches them.
  }, [isStreaming, messages, requestSeq]);

  const lastMessage = messages.at(-1);
  const currentTurnKey = `${requestSeq}:${lastMessage?.id ?? ''}`;
  const slow = isStreaming && slowAt === currentTurnKey;
  const stalled = isStreaming && stalledAt === currentTurnKey;

  // The shimmer holds the assistant's slot until there is actually something to
  // show: text, or the scam check's card. Checking the parts rather than just
  // `status === 'submitted'` covers the gap where the assistant message exists
  // but its first chunk hasn't landed — otherwise the shimmer unmounts into an
  // empty bubble for a frame.
  const awaitingFirstToken =
    isStreaming &&
    (lastMessage?.role !== 'assistant' || !hasVisibleContent(lastMessage));

  // Which notice, if any. An error outranks the quieter states.
  const hasPartialReply =
    lastMessage?.role === 'assistant' && hasVisibleContent(lastMessage);

  const errorKind =
    status === 'error' && error
      ? classifyChatError(error, { hasPartialReply, online })
      : null;

  let liveKind: ChatNoticeKind | null = errorKind;

  if (!liveKind && emptyTurn && !isStreaming) {
    liveKind = 'blocked';
  }

  if (!liveKind && restoredInterrupted && !isStreaming) {
    liveKind = 'interrupted';
  }

  if (!liveKind && stalled) {
    liveKind = 'stalled';
  }

  const { retry, pending: retryPending } = useGuardedRetry({
    status,
    error,
    action: () => {
      setEmptyTurn(false);
      setRestore((current) => ({ ...current, interrupted: false }));
      setRequestSeq((current) => current + 1);

      return regenerate();
    },
  });

  const noticeKind = liveKind ?? (retryPending ? retryKind : null);

  // Retry only reruns the failed message; the card's own Retry and the notice's
  // share one guard, so a double click on either sends one request.
  function handleRetry(): void {
    setRetryKind(liveKind);
    retry();
  }

  const handleSend = useCallback(
    (text: string) => {
      // Sending clears the error itself; these are this panel's own notices.
      setEmptyTurn(false);
      setRestore((current) => ({ ...current, interrupted: false }));
      setRetryKind(null);
      setRequestSeq((current) => current + 1);
      void sendMessage({ text });
    },
    [sendMessage],
  );

  function startNewDraft(): void {
    stop();
    clearError();
    setMessages([]);
    clearMessages();
    setEmptyTurn(false);
    setRestore((current) => ({ ...current, interrupted: false }));
    setRetryKind(null);
    setCooldown(null);
  }

  // The cooldown applies to the error it was set for. Until it's set (a frame),
  // assume the default, so Retry never flashes open.
  const noticeCooldown =
    noticeKind === 'rate_limited'
      ? cooldown && cooldown.forError === error
        ? cooldown.remaining
        : DEFAULT_COOLDOWN_SECONDS
      : 0;

  return (
    <MotionConfig reducedMotion="user">
      {/* Sized from the visible area (--vvh), never from vh: on a phone the
          keyboard shrinks the visible area but not the layout viewport, which
          would leave the composer underneath it. The max keeps the whole panel
          inside what's visible. */}
      <section
        aria-label="Chat"
        className="flex h-[calc(var(--vvh,100dvh)*0.75)] max-h-[calc(var(--vvh,100dvh)-1rem)] min-h-[min(24rem,calc(var(--vvh,100dvh)-1rem))] flex-col overflow-hidden rounded-sheet border border-border bg-card lg:h-[calc(var(--vvh,100dvh)-12rem)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-1">
          <span className="text-xs text-muted-foreground">Saved in this browser</span>
          <NewDraftButton
            disabled={!ready || (messages.length === 0 && !isStreaming)}
            onConfirm={startNewDraft}
          />
        </div>

        <Conversation
          className="flex-1"
          initial={scrollAnimation}
          resize={scrollAnimation}
        >
          <ConversationContent className="gap-6" scrollClassName="overscroll-contain">
            {!ready ? <ChatSkeleton /> : null}

            {ready && messages.length === 0 && !isStreaming ? (
              <ChatEmptyState />
            ) : null}

            {ready
              ? messages.map((message, index) => {
                  const isLastMessage = index === messages.length - 1;

                  // While the shimmer stands in for it, skip the not-yet-filled
                  // assistant message so the two don't both occupy the slot.
                  const isPlaceholder =
                    awaitingFirstToken &&
                    isLastMessage &&
                    message.role === 'assistant';

                  if (isPlaceholder) {
                    return null;
                  }

                  return (
                    <Message from={message.role} key={message.id}>
                      <MessageContent
                        className={
                          message.role === 'assistant'
                            ? 'border-l-2 border-primary pl-4 leading-relaxed group-[.is-assistant]:text-card-foreground'
                            : 'group-[.is-user]:rounded-bubble group-[.is-user]:bg-muted group-[.is-user]:text-card-foreground'
                        }
                      >
                        {message.parts.map((part, i) => {
                          const key = `${message.id}-${i}`;

                          switch (part.type) {
                            case 'text':
                              // The artist's own text is often a pasted DM, so it's
                              // shown exactly as typed rather than parsed as markdown
                              // (a client's *word* shouldn't turn italic).
                              return message.role === 'assistant' ? (
                                <MessageResponse key={key}>{part.text}</MessageResponse>
                              ) : (
                                <Fragment key={key}>{part.text}</Fragment>
                              );
                            case 'tool-checkScamSignals':
                              return (
                                <ScamCheckCard
                                  isLive={isStreaming && isLastMessage}
                                  key={key}
                                  onRetry={isLastMessage ? handleRetry : undefined}
                                  part={part}
                                  retryDisabled={isStreaming || retryPending}
                                />
                              );
                            // Step markers and any other part types are skipped.
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  );
                })
              : null}

            {awaitingFirstToken && !stalled ? (
              <Message from="assistant">
                <MessageContent className="border-l-2 border-primary pl-4 leading-relaxed">
                  {/* Shimmer animates background-position, which MotionConfig's
                      reducedMotion doesn't cover, so swap in still text. */}
                  {prefersReducedMotion ? (
                    <p className="text-muted-foreground">Thinking…</p>
                  ) : (
                    <Shimmer>Thinking…</Shimmer>
                  )}
                  {slow ? (
                    <p className="text-xs text-muted-foreground" role="status">
                      Taking longer than usual…
                    </p>
                  ) : null}
                </MessageContent>
              </Message>
            ) : null}

            {noticeKind ? (
              <ChatErrorNotice
                cooldown={noticeCooldown}
                kind={noticeKind}
                offline={!online}
                onRetry={handleRetry}
                onStop={stop}
                restored={errorKind === null && restoredInterrupted}
                retrying={retryPending}
              />
            ) : null}
          </ConversationContent>

          {/* 44px on phones for a comfortable tap, back to 32px from sm up. */}
          <ConversationScrollButton
            aria-label="Scroll to latest message"
            className="size-11 sm:size-8"
          />
        </Conversation>

        {/* Safe-area padding keeps the composer clear of a phone's home bar. */}
        <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ChatComposer onSend={handleSend} onStop={stop} status={status} />
        </div>
      </section>
    </MotionConfig>
  );
}
