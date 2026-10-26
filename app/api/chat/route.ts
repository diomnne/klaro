import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  isStepCount,
  smoothStream,
  streamText,
  type UIMessage,
} from 'ai';

import { MODEL_ID, MODEL_OPTIONS, SYSTEM_PROMPT } from '@/lib/ai/klaro';
import {
  createCheckScamSignalsTool,
  paceForReview,
  repairSignalsInput,
} from '@/lib/ai/tools/check-scam-signals';

/** Streaming a conversational turn stays well under this; it bounds a stall. */
export const maxDuration = 30;

type ChatRequestBody = {
  messages: UIMessage[];
  /** Review flag (`?toolError=1`): makes the scam check throw. */
  simulateToolError?: unknown;
  /** Review flag (`?toolSlow=1`): paces the scam check so each card state is visible. */
  simulateSlowTool?: unknown;
};

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
    return Response.json(
      { error: 'The chat is not configured. GOOGLE_GENERATIVE_AI_API_KEY is missing.' },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;

  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { messages } = body;

  if (!Array.isArray(messages)) {
    return Response.json(
      { error: 'Invalid request body: expected a messages array.' },
      { status: 400 },
    );
  }

  const result = streamText({
    model: google(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    ...MODEL_OPTIONS,
    tools: {
      checkScamSignals: createCheckScamSignalsTool({
        clientMessage: latestUserText(messages),
        simulateError: body.simulateToolError === true,
      }),
    },
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
    experimental_repairToolCall: async ({ toolCall }) => {
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
    // Gemini sends 15–20 words per chunk, which lands on screen in visible
    // jumps. Re-chunking into words makes the reply type out evenly.
    experimental_transform:
      body.simulateSlowTool === true
        ? [smoothStream(), paceForReview()]
        : smoothStream(),
    // Gemini's free tier returns "high demand" often enough that the default
    // retries get exhausted in normal use. Logged server-side so a silent
    // failure is diagnosable; the artist only ever sees the generic string.
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

  return result.toUIMessageStreamResponse({
    // Errors thrown mid-stream reach the client through this callback. Return a
    // generic string: the raw error can carry request details and provider
    // internals, and it is rendered straight into the transcript.
    onError: () => 'Something went wrong.',
  });
}
