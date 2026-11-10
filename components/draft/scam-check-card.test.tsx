// @vitest-environment jsdom
import { isInaccessible, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { KlaroUIMessage } from '@/lib/ai/klaro';
import type { ScamCheckResult } from '@/lib/ai/tools/check-scam-signals';
import {
  FEW_RESULT,
  MALFORMED_RESULT,
  MANY_INPUT,
  MANY_RESULT,
  NEVER_REFUND,
  NEVER_SHARE_CODE,
} from '@/tests/helpers/scam-check-fixtures';

import { ScamCheckCard } from './scam-check-card';

type ScamCheckPart = Extract<
  KlaroUIMessage['parts'][number],
  { type: 'tool-checkScamSignals' }
>;

function resultPart(output: ScamCheckResult): ScamCheckPart {
  return {
    type: 'tool-checkScamSignals',
    toolCallId: 'call-1',
    state: 'output-available',
    input: MANY_INPUT,
    output,
  };
}

function errorPart(): ScamCheckPart {
  return {
    type: 'tool-checkScamSignals',
    toolCallId: 'call-1',
    state: 'output-error',
    input: MANY_INPUT,
    errorText: 'The check failed.',
  };
}

/** Whether the artist can see (and a screen reader reach) the element. */
function isShown(element: HTMLElement): boolean {
  return !isInaccessible(element);
}

const ERROR_HEADING = 'Couldn’t finish the check';

describe('ScamCheckCard', () => {
  it('at "few", says nothing major stood out and folds the signals behind a keyboard toggle', async () => {
    const user = userEvent.setup();
    const [signal] = FEW_RESULT.signals;

    render(<ScamCheckCard isLive={false} part={resultPart(FEW_RESULT)} />);

    expect(screen.getByRole('heading', { name: 'Nothing major stood out' })).toBeTruthy();

    const toggle = screen.getByRole('button', { name: '1 minor thing to note' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(isShown(screen.getByText(signal.label))).toBe(false);

    await user.tab();
    expect(document.activeElement).toBe(toggle);

    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(isShown(screen.getByText(signal.label))).toBe(true);

    await user.keyboard(' ');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(isShown(screen.getByText(signal.label))).toBe(false);
  });

  it('at "many", lists every signal and the never-do items', () => {
    render(<ScamCheckCard isLive={false} part={resultPart(MANY_RESULT)} />);

    expect(screen.getByRole('heading', { name: 'Many signals worth checking' })).toBeTruthy();

    for (const signal of MANY_RESULT.signals) {
      expect(isShown(screen.getByText(signal.label))).toBe(true);
    }

    const neverDo = screen.getByRole('heading', { name: 'Never do' });
    const list = within(neverDo.parentElement as HTMLElement).getByRole('list');

    expect(within(list).getByText(NEVER_REFUND)).toBeTruthy();
    expect(within(list).getByText(NEVER_SHARE_CODE)).toBeTruthy();
    // Nothing to fold at this level.
    expect(screen.queryByRole('button', { name: /minor/ })).toBeNull();
  });

  it('when the check failed, shows the manual checklist and Retry calls its handler', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ScamCheckCard isLive={false} onRetry={onRetry} part={errorPart()} />);

    expect(screen.getByRole('heading', { name: ERROR_HEADING })).toBeTruthy();
    expect(screen.getByText(/Pays more than your price/)).toBeTruthy();
    expect(screen.getByText(/Asks for a code, OTP, PIN or login/)).toBeTruthy();
    expect(screen.getByText(/pay a fee to receive their payment/)).toBeTruthy();
    expect(screen.getByText(/payment link or "claim" page/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the error view, not a broken card, for a malformed result', () => {
    render(
      <ScamCheckCard
        isLive={false}
        part={resultPart(MALFORMED_RESULT as unknown as ScamCheckResult)}
      />,
    );

    expect(screen.getByRole('heading', { name: ERROR_HEADING })).toBeTruthy();
    expect(screen.queryByText('catastrophic')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe(
      "Couldn't finish the scam-signal check.",
    );
  });
});
