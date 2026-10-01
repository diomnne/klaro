import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  smoothStream,
  streamText,
  type UIMessage,
} from 'ai';

import { MODEL_ID, MODEL_OPTIONS, SYSTEM_PROMPT } from '@/lib/ai/klaro';

/** Streaming a conversational turn stays well under this; it bounds a stall. */
export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  // Checked explicitly: the provider would otherwise throw deep in the stream,
  // after headers are sent, which surfaces to the artist as a dead UI.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: 'The chat is not configured. GOOGLE_GENERATIVE_AI_API_KEY is missing.' },
      { status: 500 },
    );
  }

  let messages: UIMessage[];

  try {
    ({ messages } = (await req.json()) as { messages: UIMessage[] });
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

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
    // Gemini sends 15–20 words per chunk, which lands on screen in visible
    // jumps. Re-chunking into words makes the reply type out evenly.
    experimental_transform: smoothStream(),
    // Gemini's free tier returns "high demand" often enough that the default
    // retries get exhausted in normal use. Logged server-side so a silent
    // failure is diagnosable; the artist only ever sees the generic string.
    onError: ({ error }) => {
      console.error('[chat] stream failed:', error);
    },
  });

  return result.toUIMessageStreamResponse({
    // Errors thrown mid-stream reach the client through this callback. Return a
    // generic string: the raw error can carry request details and provider
    // internals, and it is rendered straight into the transcript.
    onError: () => 'Something went wrong.',
  });
}
