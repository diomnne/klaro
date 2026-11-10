import { expect, test, type Route } from '@playwright/test';

import { MANY_INPUT, MANY_RESULT } from '../tests/helpers/scam-check-fixtures';
import {
  finish,
  reply,
  scamCheck,
  STREAM_HEADERS,
  text,
  toSse,
} from '../tests/helpers/ui-message-stream';

const FIRST_RUN_HEADING = 'Paste the client’s message';
const EXAMPLE_LABEL = 'A message with warning signs';
const REPLY_TEXT =
  'This message has several patterns common in overpayment scams. Before anything else, what price did you quote?';

/** What the real route sends for one turn: the scam check, then a short reply. */
const CANNED_REPLY = toSse(
  reply(
    scamCheck('output-available', { input: MANY_INPUT, output: MANY_RESULT }),
    [{ type: 'finish-step' }, { type: 'start-step' }],
    text(REPLY_TEXT),
    finish(),
  ),
);

test('an artist checks an example message, reads the reply, and starts over', async ({
  page,
}) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // Every request to the chat route is answered here; none reaches the server,
  // so the test needs no API key and never calls Google.
  const sentBodies: string[] = [];

  await page.route('**/api/chat', async (route: Route) => {
    const request = route.request();

    if (request.method() !== 'POST') {
      await route.abort();
      return;
    }

    sentBodies.push(request.postData() ?? '');
    await route.fulfill({ status: 200, headers: STREAM_HEADERS, body: CANNED_REPLY });
  });

  await page.goto('/draft');

  // First run.
  await expect(page.getByRole('heading', { name: FIRST_RUN_HEADING })).toBeVisible();

  // An example fills the composer; nothing is sent until Send.
  await page.getByRole('button', { name: EXAMPLE_LABEL }).click();

  const composer = page.getByRole('textbox', { name: 'Message' });

  await expect(composer).toHaveValue(/refund the difference to my shipper/);
  expect(sentBodies).toHaveLength(0);

  await page.getByRole('button', { name: 'Send message' }).click();

  // The scam check reaches its result, then the reply follows.
  const card = page.getByRole('region', { name: 'Scam-signal check' });

  await expect(card.getByRole('heading', { name: 'Many signals worth checking' })).toBeVisible();
  await expect(card.getByText(MANY_RESULT.neverDo[0])).toBeVisible();
  await expect(page.getByText(REPLY_TEXT)).toBeVisible();
  await expect(page.getByRole('heading', { name: FIRST_RUN_HEADING })).toHaveCount(0);

  // One request, carrying the example redacted: no phone number or email left.
  expect(sentBodies).toHaveLength(1);
  expect(sentBodies[0]).toContain('[phone]');
  expect(sentBodies[0]).toContain('[email]');
  expect(sentBodies[0]).not.toContain('0917 000 0000');

  // Start over.
  await page.getByRole('button', { name: 'Start a new draft' }).click();

  const dialog = page.getByRole('alertdialog', { name: 'Start a new draft?' });

  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Start a new draft' }).click();

  await expect(page.getByRole('heading', { name: FIRST_RUN_HEADING })).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(page.getByText(REPLY_TEXT)).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});
