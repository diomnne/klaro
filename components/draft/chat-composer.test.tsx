// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { EXAMPLE_MESSAGES } from '@/lib/example-messages';
import {
  composer,
  mockChatFetch,
  sendButton,
  sentText,
} from '@/tests/helpers/chat-fetch';
import { finish, reply, streamResponse, text } from '@/tests/helpers/ui-message-stream';

import { ChatPanel } from './chat-panel';

/** The composer inside the panel, as the artist meets it on /draft. */
async function renderPanel(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();

  render(<ChatPanel />);
  await screen.findByRole('textbox', { name: 'Message' });

  return user;
}

describe('ChatComposer', () => {
  it('keeps Send disabled for an empty or whitespace-only message', async () => {
    const user = await renderPanel();

    expect(sendButton().disabled).toBe(true);

    await user.type(composer(), '   ');
    expect(sendButton().disabled).toBe(true);

    await user.type(composer(), 'hi');
    expect(sendButton().disabled).toBe(false);
  });

  it('blocks a message one character over the limit and says why', async () => {
    const user = await renderPanel();
    const fetchMock = mockChatFetch();

    await user.click(composer());
    await user.paste('a'.repeat(8001));

    expect(sendButton().disabled).toBe(true);
    expect(composer().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/1 character over the 8,000 limit\. Shorten the message to send it\./)).toBeTruthy();

    // Enter can't send it either.
    await user.keyboard('{Enter}');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fills the composer from an example without sending it', async () => {
    const user = await renderPanel();
    const fetchMock = mockChatFetch();
    const [example] = EXAMPLE_MESSAGES;

    await user.click(screen.getByRole('button', { name: example.label }));

    expect(composer().value).toBe(example.text);
    expect(document.activeElement).toBe(composer());
    expect(fetchMock).not.toHaveBeenCalled();
    // Still the first-run state: nothing has been said yet.
    expect(screen.getByRole('heading', { name: 'Paste the client’s message' })).toBeTruthy();
  });

  it('sends the message redacted, so a phone number leaves as [phone]', async () => {
    const user = await renderPanel();
    const fetchMock = mockChatFetch(streamResponse(reply(text('Got it.'), finish())));

    await user.type(composer(), 'text me at 0917 123 4567 po');
    await user.click(sendButton());

    expect(await screen.findByText('Got it.')).toBeTruthy();
    expect(sentText(fetchMock)).toBe('text me at [phone] po');
    // The transcript shows what was sent, not what was typed.
    expect(screen.getByText('text me at [phone] po')).toBeTruthy();
    expect(screen.queryByText(/0917/)).toBeNull();
  });
});
