import { screen } from '@testing-library/react';
import type { UIMessage } from 'ai';
import { vi, type Mock } from 'vitest';

import { CHAT_STORAGE_KEY } from '@/lib/chat-storage';

import type { OpenStream } from './ui-message-stream';

/**
 * The mocked network for component tests. The chat's transport posts to
 * /api/chat with the global fetch, so stubbing fetch stands in for the server
 * without changing how the app is wired.
 */

export type ChatFetch = Mock<typeof fetch>;

/** What one request gets back: a response, a stream left open, or a network failure. */
export type MockReply = Response | OpenStream | Error;

/**
 * Stubs fetch so each request gets the next reply, in order. A request beyond
 * the list fails the test rather than quietly reaching the network.
 */
export function mockChatFetch(...replies: MockReply[]): ChatFetch {
  const queue = [...replies];

  const mock = vi.fn<typeof fetch>(async (input) => {
    const next = queue.shift();

    if (next === undefined) {
      throw new Error(`Unexpected request to ${String(input)}: no mocked reply left.`);
    }

    if (next instanceof Error) {
      throw next;
    }

    return next instanceof Response ? next : next.response;
  });

  vi.stubGlobal('fetch', mock);

  return mock;
}

/** The text of the artist's latest message, as the transport sent it in request `call`. */
export function sentText(mock: ChatFetch, call = 0): string {
  const init = mock.mock.calls[call]?.[1];
  const body = JSON.parse(String(init?.body)) as { messages: UIMessage[] };
  const latest = body.messages.findLast((message) => message.role === 'user');

  return (latest?.parts ?? [])
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

/** A saved conversation, as if the artist had chatted before and reloaded. */
export function seedTranscript(messages: unknown[]): void {
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}

/** A short finished exchange to seed with. */
export const SAVED_EXCHANGE = [
  {
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Can you paint my cat?' }],
  },
  {
    id: 'reply-1',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Happy to talk it through.', state: 'done' }],
  },
];

/** The message box. */
export function composer(): HTMLTextAreaElement {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' });
}

/** The composer's send button. */
export function sendButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Send message' });
}
