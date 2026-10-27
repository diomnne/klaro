import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  smoothStream,
  streamText,
  toUIMessageStream,
  type StreamTextTransform,
  type UIMessage,
} from 'ai';

import { failMidstream } from '@/lib/ai/fail-midstream';
import { MODEL_ID, MODEL_OPTIONS, SYSTEM_PROMPT } from '@/lib/ai/klaro';
import {
  createCheckScamSignalsTool,
  paceForReview,
  repairSignalsInput,
} from '@/lib/ai/tools/check-scam-signals';
import {
  checkMessageLength,
  classifyServerError,
  errorBody,
  type ChatErrorCode,
} from '@/lib/errors';
import { isFailMode } from '@/lib/review-flags';

/** Streaming a conversational turn stays well under this; it bounds a stall. */
export const maxDuration = 30;

/** What `?fail=rate-limit` asks the client to wait, in seconds. */
const SIMULATED_RETRY_AFTER_SECONDS = 20;

type ChatRequestBody = {
  messages: UIMessage[];
  /** Review flag (`?toolError=1`): makes the scam check throw. */
  simulateToolError?: unknown;
  /** Review flag (`?toolSlow=1`): paces the scam check so each card state is visible. */
  simulateSlowTool?: unknown;
  /** Review flag (`?fail=…`): one of the exact modes in `FAIL_MODES`; anything else is ignored. */
  simulateFail?: unknown;
};

/**
 * A failed response. The body is only ever a short code: the client turns it
 * into a notice, and nothing about the request, the provider or the server's
 * configuration travels with it.
 */
function failure(
  status: number,
  code: ChatErrorCode,
  headers?: Record<string, string>,
  retryAfter?: number,
): Response {
  return new Response(errorBody(code, retryAfter), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * The text of the most recent user message. The scam check verifies the
 * model's quotes against this, so it has to be what the artist actually sent,
 * not anything earlier in the conversation.
 */
function latestUserText(messages: UIMessage[]): string {
  const latest = messages.findLast((message) => message.role === 'user');

  return (latest?.parts ?? [])
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n');
}

export async function POST(req: Request): Promise<Response> {
  // Checked explicitly: the provider would otherwise throw deep in the stream,
  // after headers are sent, which surfaces to the artist as a dead UI.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('[chat] GOOGLE_GENERATIVE_AI_API_KEY is missing.');

    return failure(500, 'unknown');
  }

  let body: ChatRequestBody;

  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return failure(400, 'unknown');
  }

  const { messages } = body;

  if (!Array.isArray(messages)) {
    return failure(400, 'unknown');
  }

  const simulateFail = isFailMode(body.simulateFail) ? body.simulateFail : null;

  // Both of these fail before any streaming starts, the way a provider-side
  // 429 or 503 would reach the client as an HTTP error.
  if (simulateFail === 'rate-limit') {
    return failure(
      429,
      'rate_limited',
      { 'Retry-After': String(SIMULATED_RETRY_AFTER_SECONDS) },
      SIMULATED_RETRY_AFTER_SECONDS,
    );
  }

  if (simulateFail === 'server') {
    return failure(503, 'overloaded');
  }

  const clientMessage = latestUserText(messages);

  // The same rule the composer applies, on the text as it was redacted and
  // sent. Checked here too because the composer is only a convenience.
  if (checkMessageLength(clientMessage).tooLong) {
    return failure(400, 'too_long');
  }

  const tools = {
    checkScamSignals: createCheckScamSignalsTool({
      clientMessage,
      simulateError: body.simulateToolError === true,
      simulateBadResult: simulateFail === 'bad-tool',
    }),
  };

  // Gemini sends 15–20 words per chunk, which lands on screen in visible
  // jumps. Re-chunking into words makes the reply type out evenly. The review
  // flags add their own transforms after it.
  const transforms: Array<StreamTextTransform<typeof tools>> = [
    smoothStream(),
    ...(body.simulateSlowTool === true ? [paceForReview<typeof tools>()] : []),
    ...(simulateFail === 'midstream' ? [failMidstream<typeof tools>()] : []),
  ];

  const result = streamText({
    model: google(MODEL_ID),
    instructions: SYSTEM_PROMPT,
    // Incomplete tool calls are left out. Stopping a reply while the scam check
    // is running, or closing the page mid-check, leaves a tool call with no
    // result in the transcript; sent as it is, the model call fails on the
    // artist's next message ("Tool result is missing for tool call").
    messages: await convertToModelMessages(messages, {
      ignoreIncompleteToolCalls: true,
    }),
    ...MODEL_OPTIONS,
    tools,
    // Two steps: the check, then the reply. The second step forbids tool calls
    // so the model can't run the check twice and always ends the turn with
    // words, not a second card. `toolChoice: 'none'` rather than removing the
    // tools: with a function call already in the history, Gemini still tries
    // to call the tool even when none are declared.
    stopWhen: isStepCount(2),
    prepareStep: ({ stepNumber }) =>
      stepNumber > 0 ? { toolChoice: 'none' } : {},
    // Returning null leaves the call failed as it was; onStepEnd logs it and
    // the card shows its fallback.
    repairToolCall: async ({ toolCall }) => {
      if (toolCall.toolName !== 'checkScamSignals') {
        return null;
      }

      try {
        const input: unknown = JSON.parse(toolCall.input);

        return {
          ...toolCall,
          input: JSON.stringify(repairSignalsInput(input)),
        };
      } catch (error) {
        console.error('[chat] could not repair tool input:', error);

        return null;
      }
    },
    experimental_transform: transforms,
    // Gemini's free tier returns "high demand" often enough that the default
    // retries get exhausted in normal use. Logged server-side so a silent
    // failure is diagnosable; the artist only ever sees a short code.
    onError: ({ error }) => {
      console.error('[chat] stream failed:', error);
    },
    // A failed tool call (including a model input that fails the schema) is
    // part of the stream, not a stream error, so onError never sees it. The
    // artist gets the card's fallback; this keeps the cause on the server.
    onStepEnd: ({ content }) => {
      for (const part of content) {
        if (part.type === 'tool-error') {
          console.error(`[chat] tool ${part.toolName} failed:`, part.error);
        }
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      // Errors thrown mid-stream reach the client through this callback. Return
      // a short code and nothing else: the raw error can carry request details
      // and provider internals, and the real one is logged above. The code is
      // also what the client reads to choose a notice.
      onError: classifyServerError,
    }),
  });
}
