// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatPanel } from './chat-panel';

/** A server-sent-events response carrying UI message chunks, as /api/chat sends them. */
function streamResponse(chunks: object[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }

        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
}

/** Some of a reply, then the server reporting that it failed. */
function failingMidReply(): Response {
  return streamResponse([
    { type: 'start', messageId: 'reply-1' },
    { type: 'start-step' },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: 'Your client wants a portrait' },
    { type: 'error', errorText: 'unknown' },
  ]);
}

function completeReply(text: string): Response {
  return streamResponse([
    { type: 'start', messageId: 'reply-2' },
    { type: 'start-step' },
    { type: 'text-start', id: 'text-2' },
    { type: 'text-delta', id: 'text-2', delta: text },
    { type: 'text-end', id: 'text-2' },
    { type: 'finish-step' },
    { type: 'finish' },
  ]);
}

async function sendMessage(text: string): Promise<void> {
  const box = await screen.findByPlaceholderText(/Paste the DM/);

  fireEvent.change(box, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
}

describe('ChatPanel when a reply fails partway', () => {
  beforeEach(() => {
    // jsdom has no layout engine or media queries; these stand in for the
    // browser features the panel relies on.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    Element.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('says the reply was cut off, keeps what arrived, and offers Retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failingMidReply()));

    render(<ChatPanel />);
    await sendMessage('hi po! can you draw my OC?');

    expect(await screen.findByText('The reply was cut off')).toBeTruthy();
    expect(screen.getByText(/Your client wants a portrait/)).toBeTruthy();

    const retry = screen.getByRole('button', { name: 'Retry' });

    expect((retry as HTMLButtonElement).disabled).toBe(false);
  });

  it('says there was no reply, rather than showing an empty bubble, when a turn ends with nothing', async () => {
    // A clean finish with no text and no tool output: a filtered or empty reply.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamResponse([
          { type: 'start', messageId: 'reply-empty' },
          { type: 'start-step' },
          { type: 'finish-step' },
          { type: 'finish' },
        ]),
      ),
    );

    render(<ChatPanel />);
    await sendMessage('hi po! can you draw my OC?');

    expect(await screen.findByText('No reply this time')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('retries once on a double click, replacing the partial reply', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failingMidReply())
      .mockResolvedValue(completeReply('Here is the full reply.'));

    vi.stubGlobal('fetch', fetchMock);

    render(<ChatPanel />);
    await sendMessage('hi po! can you draw my OC?');
    await screen.findByText('The reply was cut off');

    const retry = screen.getByRole('button', { name: 'Retry' });

    fireEvent.click(retry);
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByText('Here is the full reply.')).toBeTruthy());

    // One request for the message, one for the retry: the second click did nothing.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The partial reply was replaced, not kept beside the new one.
    expect(screen.queryByText(/Your client wants a portrait/)).toBeNull();
    expect(screen.getAllByText('Here is the full reply.')).toHaveLength(1);

    // And the notice is gone.
    expect(screen.queryByText('The reply was cut off')).toBeNull();
  });
});
