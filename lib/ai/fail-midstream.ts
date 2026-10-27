import type { StreamTextTransform, ToolSet } from 'ai';

/** Words of the reply that get through before the failure. */
const WORDS_BEFORE_FAILURE = 4;

/**
 * For the `?fail=midstream` review flag: lets the start of the reply stream, then
 * raises an error part and ends the stream, as a provider that drops the
 * connection would. Put after `smoothStream()` so the cut falls between words.
 * The error is only ever logged on the server; the client gets a short code.
 */
export function failMidstream<
  TOOLS extends ToolSet,
>(): StreamTextTransform<TOOLS> {
  return ({ stopStream }) => {
    let words = 0;
    let failed = false;

    return new TransformStream({
      transform(part, controller) {
        if (failed) {
          return;
        }

        controller.enqueue(part);

        if (part.type === 'text-delta') {
          words += 1;
        }

        if (words >= WORDS_BEFORE_FAILURE) {
          failed = true;
          controller.enqueue({
            type: 'error',
            error: new Error('Simulated mid-stream failure (?fail=midstream).'),
          });
          stopStream();
        }
      },
    });
  };
}
