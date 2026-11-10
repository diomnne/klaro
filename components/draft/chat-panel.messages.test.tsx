// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import {
  composer,
  mockChatFetch,
  seedTranscript,
  sendButton,
} from '@/tests/helpers/chat-fetch';
import { MANY_INPUT, MANY_RESULT } from '@/tests/helpers/scam-check-fixtures';
import {
  finish,
  openStream,
  reply,
  scamCheck,
  streamResponse,
  text,
  type KlaroChunk,
  type OpenStream,
} from '@/tests/helpers/ui-message-stream';

import { ChatPanel } from './chat-panel';

/**
 * How the transcript renders each kind of message part. The renderer lives
 * inside ChatPanel, so these drive it the way the app does: send a message, let
 * the mocked stream answer.
 */

const openStreams: OpenStream[] = [];

afterEach(() => {
  openStreams.splice(0).forEach((stream) => stream.close());
});

async function send(message: string): Promise<void> {
  const user = userEvent.setup();

  await screen.findByRole('textbox', { name: 'Message' });
  await user.type(composer(), message);
  await user.click(sendButton());
}

describe('message text', () => {
  it("shows the artist's text exactly as typed, without turning *word* italic", async () => {
    mockChatFetch(streamResponse(reply(text('Noted.'), finish())));
    render(<ChatPanel />);

    await send('client said *urgent* and **asap**');

    expect(await screen.findByText('client said *urgent* and **asap**')).toBeTruthy();
    expect(screen.queryByRole('emphasis')).toBeNull();
  });

  it("renders Klaro's reply as markdown", async () => {
    mockChatFetch(
      streamResponse(
        reply(text('Ask for *references* first.\n\n- **Deadline**\n- Revisions'), finish()),
      ),
    );
    render(<ChatPanel />);

    await send('what should I ask?');

    // Formatted: italic text and a real list, not literal asterisks and dashes.
    expect((await screen.findByRole('emphasis')).textContent).toBe('references');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Deadline',
      'Revisions',
    ]);
    expect(screen.queryByText(/\*/)).toBeNull();
  });
});

describe('the scam check part', () => {
  const HEADINGS = {
    reading: 'Reading the message…',
    checking: '3 possible signals',
    result: 'Many signals worth checking',
    error: 'Couldn’t finish the check',
  };

  const cases: Array<{
    state: string;
    chunks: KlaroChunk[];
    /** Input states only render as in progress while the reply is still streaming. */
    live: boolean;
    heading: string;
    announcement: string;
  }> = [
    {
      state: 'input-streaming',
      chunks: scamCheck('input-streaming', {
        partialInput: '{"signals":[{"id":"urgency","evidence":"I need it',
      }),
      live: true,
      heading: HEADINGS.reading,
      announcement: 'Checking the message for scam signals.',
    },
    {
      state: 'input-available',
      chunks: scamCheck('input-available', { input: MANY_INPUT }),
      live: true,
      heading: HEADINGS.checking,
      announcement: 'Checking signals.',
    },
    {
      state: 'output-available',
      chunks: [
        ...scamCheck('output-available', { input: MANY_INPUT, output: MANY_RESULT }),
        ...finish(),
      ],
      live: false,
      heading: HEADINGS.result,
      announcement: 'Scam-signal check finished: Many signals worth checking.',
    },
    {
      state: 'output-error',
      chunks: [...scamCheck('output-error', { input: MANY_INPUT }), ...finish()],
      live: false,
      heading: HEADINGS.error,
      announcement: "Couldn't finish the scam-signal check.",
    },
  ];

  it.each(cases)(
    'renders $state as its own view',
    async ({ chunks, live, heading, announcement }) => {
      if (live) {
        const stream = openStream(reply(chunks));

        openStreams.push(stream);
        mockChatFetch(stream.response);
      } else {
        mockChatFetch(streamResponse(reply(chunks)));
      }

      render(<ChatPanel />);
      await send('please check this DM');

      const card = await screen.findByRole('region', { name: 'Scam-signal check' });

      expect(
        await within(card).findByRole('heading', { name: heading, level: 3 }),
      ).toBeTruthy();
      expect(within(card).getByRole('status').textContent).toBe(announcement);

      // Only the one view: once the crossfade from the previous state is done,
      // none of the other states' headings are left.
      await waitFor(() => {
        for (const other of Object.values(HEADINGS).filter((h) => h !== heading)) {
          expect(within(card).queryByRole('heading', { name: other })).toBeNull();
        }
      });
    },
  );
});

describe('parts the chat does not know', () => {
  it('renders nothing for them and keeps the rest of the conversation', async () => {
    seedTranscript([
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Can you paint my cat?' }],
      },
      {
        id: 'reply-1',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          { type: 'reasoning', text: 'PRIVATE REASONING', state: 'done' },
          { type: 'data-weather', data: { text: 'DATA PART' } },
          { type: 'some-future-part', text: 'FUTURE PART' },
          { type: 'text', text: 'Happy to talk it through.', state: 'done' },
        ],
      },
    ]);

    render(<ChatPanel />);

    expect(await screen.findByText('Happy to talk it through.')).toBeTruthy();
    expect(screen.getByText('Can you paint my cat?')).toBeTruthy();
    expect(screen.queryByText(/PRIVATE REASONING|DATA PART|FUTURE PART/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
