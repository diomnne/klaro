// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SAVED_EXCHANGE, seedTranscript } from '@/tests/helpers/chat-fetch';

import { ChatPanel } from './chat-panel';

const FIRST_RUN_HEADING = 'Paste the client’s message';

/** The panel with a saved conversation, and the confirmation dialog open. */
async function openDialog(): Promise<{
  user: ReturnType<typeof userEvent.setup>;
  dialog: HTMLElement;
}> {
  const user = userEvent.setup();

  seedTranscript(SAVED_EXCHANGE);
  render(<ChatPanel />);
  await screen.findByText('Happy to talk it through.');

  await user.click(screen.getByRole('button', { name: 'Start a new draft' }));

  const dialog = await screen.findByRole('alertdialog', { name: 'Start a new draft?' });

  return { user, dialog };
}

describe('Start a new draft', () => {
  it('puts focus on Cancel when the dialog opens', async () => {
    const { dialog } = await openDialog();

    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole('button', { name: 'Cancel' }),
      ),
    );
  });

  it('keeps the conversation when cancelled', async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByText('Can you paint my cat?')).toBeTruthy();
    expect(screen.getByText('Happy to talk it through.')).toBeTruthy();
  });

  it('clears the conversation, including after a reload, when confirmed', async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Start a new draft' }));

    expect(await screen.findByRole('heading', { name: FIRST_RUN_HEADING })).toBeTruthy();
    expect(screen.queryByText('Can you paint my cat?')).toBeNull();

    // Reloading doesn't bring it back.
    cleanup();
    render(<ChatPanel />);

    expect(await screen.findByRole('heading', { name: FIRST_RUN_HEADING })).toBeTruthy();
    expect(screen.queryByText('Happy to talk it through.')).toBeNull();
  });
});
