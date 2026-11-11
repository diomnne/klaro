import { UI_MESSAGE_STREAM_HEADERS, type InferUIMessageChunk } from 'ai';

import type { KlaroUIMessage } from '@/lib/ai/klaro';
import type { ScamCheckResult } from '@/lib/ai/tools/check-scam-signals';

/**
 * Builds the UI message stream /api/chat sends, from a list of parts, so tests
 * can stand in for the AI without reaching it. Free of Vitest so the Playwright
 * spec can use it too. Chunks are typed against Klaro's own message type: if the
 * SDK's stream format changes, these stop compiling instead of quietly drifting.
 */

export type KlaroChunk = InferUIMessageChunk<KlaroUIMessage>;

type ScamCheckInput = { signals: Array<{ id: string; evidence: string }> };

/** The opening chunks of an assistant reply. */
export function start(messageId = 'reply-1'): KlaroChunk[] {
  return [{ type: 'start', messageId }, { type: 'start-step' }];
}

/**
 * A text part, one delta per string. `open` leaves it unfinished, as it is
 * while the reply is still streaming.
 */
export function text(
  deltas: string | string[],
  { id = 'text-1', open = false }: { id?: string; open?: boolean } = {},
): KlaroChunk[] {
  const pieces = Array.isArray(deltas) ? deltas : [deltas];

  return [
    { type: 'text-start', id },
    ...pieces.map((delta): KlaroChunk => ({ type: 'text-delta', id, delta })),
    ...(open ? [] : [{ type: 'text-end', id } as KlaroChunk]),
  ];
}

type ScamCheckOptions = {
  toolCallId?: string;
  input?: ScamCheckInput;
  /** For output-available. Typed loosely so a test can send a malformed one. */
  output?: ScamCheckResult | Record<string, unknown>;
  /** For output-error. */
  errorText?: string;
  /** For input-streaming: the raw partial JSON the model has sent so far. */
  partialInput?: string;
};

const DEFAULT_INPUT: ScamCheckInput = { signals: [] };

/**
 * The scam check's tool part, taken as far as `state`: input-streaming stops
 * mid-JSON, input-available has the complete input, and the output states
 * finish it with a result or an error.
 */
export function scamCheck(
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error',
  {
    toolCallId = 'call-1',
    input = DEFAULT_INPUT,
    output,
    errorText = 'The check failed.',
    partialInput = '{"signals":[',
  }: ScamCheckOptions = {},
): KlaroChunk[] {
  const opened: KlaroChunk[] = [
    { type: 'tool-input-start', toolCallId, toolName: 'checkScamSignals' },
  ];

  if (state === 'input-streaming') {
    return [...opened, { type: 'tool-input-delta', toolCallId, inputTextDelta: partialInput }];
  }

  const available: KlaroChunk[] = [
    ...opened,
    { type: 'tool-input-available', toolCallId, toolName: 'checkScamSignals', input },
  ];

  switch (state) {
    case 'input-available':
      return available;
    case 'output-available':
      return [...available, { type: 'tool-output-available', toolCallId, output }];
    case 'output-error':
      return [...available, { type: 'tool-output-error', toolCallId, errorText }];
  }
}

/** The server reporting a failure mid-stream; the text is the short code the route sends. */
export function streamError(errorText = 'unknown'): KlaroChunk[] {
  return [{ type: 'error', errorText }];
}

/** A clean end to the reply. */
export function finish(): KlaroChunk[] {
  return [{ type: 'finish-step' }, { type: 'finish' }];
}

/** A whole reply: the opening chunks, then each part in order. */
export function reply(...parts: KlaroChunk[][]): KlaroChunk[] {
  return [...start(), ...parts.flat()];
}

/** Server-sent-events framing, as createUIMessageStreamResponse writes it. */
export function toSse(chunks: KlaroChunk[], { done = true } = {}): string {
  const events = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`);

  return events.join('') + (done ? 'data: [DONE]\n\n' : '');
}

/** The response headers the SDK sends with a UI message stream. */
export const STREAM_HEADERS: Record<string, string> = { ...UI_MESSAGE_STREAM_HEADERS };

/** A finished stream response. */
export function streamResponse(chunks: KlaroChunk[]): Response {
  return new Response(toSse(chunks), { status: 200, headers: STREAM_HEADERS });
}

export type OpenStream = {
  response: Response;
  /** Sends more chunks. */
  push: (chunks: KlaroChunk[]) => void;
  /** Ends the stream. Safe to call more than once. */
  close: () => void;
};

/**
 * A stream response that stays open until the test closes it, for the states
 * in between: waiting for the first chunk, or partway through a reply.
 */
export function openStream(initial: KlaroChunk[] = []): OpenStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let closed = false;

  const body = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
    },
  });

  const push = (chunks: KlaroChunk[]): void => {
    if (!closed && chunks.length > 0) {
      controller?.enqueue(encoder.encode(toSse(chunks, { done: false })));
    }
  };

  push(initial);

  return {
    response: new Response(body, { status: 200, headers: STREAM_HEADERS }),
    push,
    close: () => {
      if (!closed) {
        closed = true;
        controller?.close();
      }
    },
  };
}
