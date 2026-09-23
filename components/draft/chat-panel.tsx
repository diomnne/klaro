'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';

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
import { loadMessages, saveMessages } from '@/lib/chat-storage';

/** Joins a message's text parts; non-text parts aren't produced in this step. */
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

export function ChatPanel() {
  const { messages, sendMessage, status, stop, regenerate, setMessages } =
    useChat({ transport });

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

  const lastMessage = messages.at(-1);

  // The shimmer holds the assistant's slot until there is actually text to show.
  // Checking the text rather than just `status === 'submitted'` covers the gap
  // where the assistant message exists but its first chunk hasn't landed —
  // otherwise the shimmer unmounts into an empty bubble for a frame.
  const awaitingFirstToken =
    isStreaming &&
    (lastMessage?.role !== 'assistant' || messageText(lastMessage) === '');

  return (
    <section
      aria-label="Chat"
      className="flex min-h-128 flex-col overflow-hidden rounded-sheet border border-border bg-card lg:h-[calc(100vh-12rem)]"
    >
      <Conversation className="flex-1">
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
                {message.role === 'assistant' ? (
                  <MessageResponse>{messageText(message)}</MessageResponse>
                ) : (
                  messageText(message)
                )}
              </MessageContent>
            </Message>
            );
          })}

          {awaitingFirstToken ? (
            <Message from="assistant">
              <MessageContent className="border-l-2 border-primary pl-4 leading-relaxed">
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}

          {status === 'error' ? (
            <div
              className="flex flex-col items-start gap-3 rounded-sheet border border-destructive/40 bg-destructive/5 p-4"
              role="alert"
            >
              <p className="text-sm text-foreground">Something went wrong.</p>
              <Button onClick={() => regenerate()} size="sm" variant="outline">
                Retry
              </Button>
            </div>
          ) : null}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-4">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim();

            if (!text || isStreaming) {
              return;
            }

            sendMessage({ text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Paste the DM, or describe the commission…"
            />
            <PromptInputFooter>
              <span className="text-xs text-muted-foreground">
                Klaro never suggests a price.
              </span>
              {/* PromptInputSubmit needs onStop explicitly — it does not call
                  stop() from `status` alone; without it the stop button just
                  submits the empty form. */}
              <PromptInputSubmit onStop={stop} status={status} />
            </PromptInputFooter>
          </PromptInputBody>
        </PromptInput>
      </div>
    </section>
  );
}
