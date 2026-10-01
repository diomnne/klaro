'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { MotionConfig } from 'motion/react';
import { Fragment, useEffect, useRef, useState } from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { loadMessages, saveMessages } from '@/lib/chat-storage';

/**
 * Joins a message's text parts. Only used to tell whether the assistant has
 * produced any visible text yet — rendering goes part by part.
 */
function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } => part.type === 'text',
    )
    .map((part) => part.text)
    .join('');
}

/** Stateless, so one instance is shared rather than rebuilt on every render. */
const transport = new DefaultChatTransport({ api: '/api/chat' });

/**
 * How long a stream may produce nothing before it's treated as dead. Generous
 * on purpose: the model can legitimately pause mid-answer, and a false positive
 * here would interrupt a working reply.
 */
const STALL_TIMEOUT_MS = 25_000;

export function ChatPanel() {
  const { messages, sendMessage, status, stop, regenerate, setMessages } =
    useChat({ transport });

  // MotionConfig below only covers transform/size animations, and the
  // scroll-to-bottom spring is JS-driven, so both need the preference directly.
  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollAnimation = prefersReducedMotion ? 'instant' : 'smooth';

  // Restoring in an effect rather than through useChat's `messages` option:
  // localStorage isn't readable during SSR, so seeding initial state from it
  // would make the server and client markup disagree on first paint.
  const hydrated = useRef(false);

  // Gates the first write so the empty initial state can't clobber a saved
  // transcript before the effect below has restored it.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hydrated.current) {
      return;
    }

    hydrated.current = true;

    const saved = loadMessages();

    if (saved) {
      setMessages(saved);
    }

    setReady(true);
  }, [setMessages]);

  useEffect(() => {
    if (ready) {
      saveMessages(messages);
    }
  }, [messages, ready]);

  const isStreaming = status === 'submitted' || status === 'streaming';

  // A provider failure that exhausts its retries can close the stream after the
  // opening chunk and before any text. The SDK treats that as a still-running
  // stream, so without this the composer stays locked behind a shimmer that
  // never resolves. Observed against Gemini's free tier under load.
  // Holds the id of the stalled turn rather than a bare flag, so it clears
  // itself when the next turn starts instead of needing a reset effect.
  const [stalledAt, setStalledAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    const turnId = messages.at(-1)?.id ?? null;
    const timer = setTimeout(() => setStalledAt(turnId), STALL_TIMEOUT_MS);

    return () => clearTimeout(timer);
    // Re-armed on every new chunk: while text is arriving the timer keeps
    // resetting, so only a genuine stall reaches the timeout.
  }, [isStreaming, messages]);

  const stalled = stalledAt !== null && stalledAt === messages.at(-1)?.id;

  const lastMessage = messages.at(-1);

  // The shimmer holds the assistant's slot until there is actually text to show.
  // Checking the text rather than just `status === 'submitted'` covers the gap
  // where the assistant message exists but its first chunk hasn't landed —
  // otherwise the shimmer unmounts into an empty bubble for a frame.
  const awaitingFirstToken =
    isStreaming &&
    (lastMessage?.role !== 'assistant' || messageText(lastMessage) === '');

  return (
    <MotionConfig reducedMotion="user">
      {/* Bounded height at every size: the transcript only scrolls (and pins to
          the bottom) inside a container that can overflow. Unbounded, the panel
          grows with the conversation and pushes the composer off-screen. */}
      <section
        aria-label="Chat"
        className="flex h-[75dvh] min-h-96 flex-col overflow-hidden rounded-sheet border border-border bg-card lg:h-[calc(100vh-12rem)]"
      >
        <Conversation
          className="flex-1"
          initial={scrollAnimation}
          resize={scrollAnimation}
        >
          <ConversationContent className="gap-6">
            {messages.length === 0 && !isStreaming ? (
              <ConversationEmptyState
                title="Paste the client's message"
                description="Or just describe the commission in your own words — Klaro will ask about anything missing."
              />
            ) : null}

            {messages.map((message, index) => {
              // While the shimmer stands in for it, skip the not-yet-filled
              // assistant message so the two don't both occupy the slot.
              const isPlaceholder =
                awaitingFirstToken &&
                index === messages.length - 1 &&
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
                        // Tool parts will render here in the tool-calling
                        // assignment. Until then, step markers and any other part
                        // types are skipped.
                        default:
                          return null;
                      }
                    })}
                  </MessageContent>
                </Message>
              );
            })}

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
                </MessageContent>
              </Message>
            ) : null}

            {stalled ? (
              <div
                className="flex flex-col items-start gap-3 rounded-sheet border border-border bg-muted/40 p-4"
                role="status"
              >
                <p className="text-sm text-foreground">
                  Gemini didn&rsquo;t respond. It&rsquo;s usually just busy — try again.
                </p>
                <Button
                  className="h-11 sm:h-8"
                  onClick={() => {
                    stop();
                    regenerate();
                  }}
                  size="default"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : null}

            {status === 'error' ? (
              <div
                className="flex flex-col items-start gap-3 rounded-sheet border border-destructive/40 bg-destructive/5 p-4"
                role="alert"
              >
                <p className="text-sm text-foreground">Something went wrong.</p>
                <Button
                  className="h-11 sm:h-8"
                  onClick={() => regenerate()}
                  size="default"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </ConversationContent>

          {/* 44px on phones for a comfortable tap, back to 32px from sm up. */}
          <ConversationScrollButton
            aria-label="Scroll to latest message"
            className="size-11 sm:size-8"
          />
        </Conversation>

        <div className="border-t border-border p-4">
          <PromptInput
            onSubmit={(message) => {
              const text = message.text?.trim();

              if (!text || (isStreaming && !stalled)) {
                return;
              }

              // A stalled stream is still nominally open; drop it before
              // starting the next turn so the two don't overlap.
              if (stalled) {
                stop();
              }

              sendMessage({ text });
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Paste the DM, or describe the commission…"
              />
            </PromptInputBody>
            {/* Must be a sibling of PromptInputBody, not inside it: InputGroup
                only switches from a fixed-height row to a growing column via
                `has-[>[data-align=block-end]]`, a direct-child selector. Nested,
                the footer is a grandchild and the textarea gets clipped to a
                32px strip. */}
            <PromptInputFooter>
              <span className="text-xs text-muted-foreground">
                Klaro never suggests a price.
              </span>
              {/* PromptInputSubmit needs onStop explicitly — it does not call
                  stop() from `status` alone; without it the stop button just
                  submits the empty form. */}
              <PromptInputSubmit
                className="size-11 sm:size-8"
                onStop={stop}
                status={stalled ? 'ready' : status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </section>
    </MotionConfig>
  );
}
