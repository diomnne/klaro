// @vitest-environment jsdom
import {
  act,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorBody } from '@/lib/errors';
import {
  composer,
  mockChatFetch,
  sendButton,
} from '@/tests/helpers/chat-fetch';
import {
  finish,
  openStream,
  reply,
  start,
  streamError,
  streamResponse,
  text,
  type OpenStream,
} from '@/tests/helpers/ui-message-stream';

import { ChatPanel } from './chat-panel';

const CLIENT_MESSAGE = 'hi po! can you draw my OC?';

/** Some of a reply, then the server reporting that it failed. */
function failingMidReply(): Response {
  return streamResponse(
    reply(text('Your client wants a portrait', { open: true }), streamError('unknown')),
  );
}

function completeReply(words: string): Response {
  return streamResponse(reply(text(words, { id: 'text-2' }), finish()));
}

async function sendMessage(
  user: ReturnType<typeof userEvent.setup>,
  message = CLIENT_MESSAGE,
): Promise<void> {
  await screen.findByRole('textbox', { name: 'Message' });
  await user.type(composer(), message);
  await user.click(sendButton());
}

/**
 * Two clicks before React can re-render the button as busy: the case the retry
 * guard exists for. Both go inside one act(). fireEvent and user-event each
 * flush React's updates after every click, so the second click would land on an
 * already-disabled button and a broken guard would still pass.
 */
function doubleClick(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

// Streams left open by a test are closed afterwards, so nothing keeps reading.
const openStreams: OpenStream[] = [];

function keepOpen(...initial: Parameters<typeof openStream>): OpenStream {
  const stream = openStream(...initial);

  openStreams.push(stream);

  return stream;
}

afterEach(() => {
  openStreams.splice(0).forEach((stream) => stream.close());
});

describe('ChatPanel while waiting for a reply', () => {
  it('shows the thinking indicator and offers Stop, not Send', async () => {
    const user = userEvent.setup();

    mockChatFetch(keepOpen().response);
    render(<ChatPanel />);
    await sendMessage(user);

    expect(await screen.findByText('Thinking…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
  });
});

describe('ChatPanel while a reply is streaming', () => {
  it('shows the partial text, offers Stop, and keeps a draft typed meanwhile when Enter is pressed', async () => {
    const user = userEvent.setup();
    const stream = keepOpen();
    const fetchMock = mockChatFetch(stream.response);

    render(<ChatPanel />);
    await sendMessage(user);

    stream.push([...start(), ...text('Here is how I would start', { open: true })]);

    expect(await screen.findByText(/Here is how I would start/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
    expect(screen.queryByText('Thinking…')).toBeNull();

    await user.type(composer(), 'and the deadline?');
    await user.keyboard('{Enter}');

    // Nothing sent, and the draft is still there to send later.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(composer().value).toBe('and the deadline?');
  });
});

describe('ChatPanel when a request fails', () => {
  it('announces that Klaro could not be reached and retries once on a double click', async () => {
    const user = userEvent.setup();
    const fetchMock = mockChatFetch(
      new TypeError('Failed to fetch'),
      completeReply('Back again. Here is the reply.'),
    );

    render(<ChatPanel />);
    await sendMessage(user);

    const alert = await screen.findByRole('alert');

    expect(within(alert).getByRole('heading', { name: "Can't reach Klaro" })).toBeTruthy();

    doubleClick(screen.getByRole('button', { name: 'Try this message again' }));

    expect(await screen.findByText('Back again. Here is the reply.')).toBeTruthy();
    // One request for the message, one for the retry: the second click did nothing.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps Retry disabled while a rate limit counts down, then enables it', async () => {
    // Timers still advance with real time, so the stream and React keep running.
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockChatFetch(
      new Response(errorBody('rate_limited', 20), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<ChatPanel />);
    await sendMessage(user);

    expect(
      within(await screen.findByRole('alert')).getByRole('heading', {
        name: 'Klaro is busy right now',
      }),
    ).toBeTruthy();

    const waiting = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Retry, available in a moment',
    });

    expect(waiting.disabled).toBe(true);
    expect(screen.getByText(/Retry in \d+s/)).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(waiting.disabled).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(11_000);
    });

    const ready = screen.getByRole<HTMLButtonElement>('button', { name: 'Retry' });

    expect(ready.disabled).toBe(false);
    expect(screen.queryByText(/Retry in \d+s/)).toBeNull();
  });
});

describe('ChatPanel when a reply fails partway', () => {
  it('says the reply was cut off, keeps what arrived, and offers Retry', async () => {
    const user = userEvent.setup();

    mockChatFetch(failingMidReply());
    render(<ChatPanel />);
    await sendMessage(user);

    const alert = await screen.findByRole('alert');

    expect(within(alert).getByRole('heading', { name: 'The reply was cut off' })).toBeTruthy();
    expect(screen.getByText(/Your client wants a portrait/)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Retry' }).disabled).toBe(false);
  });

  it('says there was no reply, rather than showing an empty bubble, when a turn ends with nothing', async () => {
    const user = userEvent.setup();

    // A clean finish with no text and no tool output: a filtered or empty reply.
    mockChatFetch(streamResponse(reply(finish())));
    render(<ChatPanel />);
    await sendMessage(user);

    expect(await screen.findByText('No reply this time')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('retries once on a double click, replacing the partial reply', async () => {
    const user = userEvent.setup();
    const fetchMock = mockChatFetch(
      failingMidReply(),
      completeReply('Here is the full reply.'),
    );

    render(<ChatPanel />);
    await sendMessage(user);
    await screen.findByText('The reply was cut off');

    doubleClick(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Here is the full reply.')).toBeTruthy());

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The partial reply was replaced, not kept beside the new one.
    expect(screen.queryByText(/Your client wants a portrait/)).toBeNull();
    expect(screen.getAllByText('Here is the full reply.')).toHaveLength(1);
    expect(screen.queryByText('The reply was cut off')).toBeNull();
  });
});
