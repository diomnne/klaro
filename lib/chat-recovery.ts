import type { UIMessage } from 'ai';

/**
 * Questions about a transcript that the chat has to answer after a failure or a
 * reload. Kept free of React so they can be tested on plain data. They read
 * messages loosely (parts are checked by `type` and `state`, not by tool name),
 * since a transcript restored from storage can come from any version of the app.
 */

type Part = UIMessage['parts'][number];

function isToolPart(part: Part): boolean {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
}

function toolState(part: Part): string | undefined {
  return (part as { state?: string }).state;
}

/**
 * Whether there is anything to look at in a message: text, or a tool card in any
 * state. Decides when the "thinking" placeholder can step aside, and whether an
 * error left a partial reply on screen.
 */
export function hasVisibleContent(message: UIMessage): boolean {
  return message.parts.some(
    (part) =>
      (part.type === 'text' && part.text !== '') || isToolPart(part),
  );
}

/**
 * Whether a finished reply said anything: some text, or a tool that produced
 * output (or failed visibly). A reply with neither is the model returning
 * nothing, which the artist should be told rather than shown as an empty bubble.
 */
export function hasReplyContent(message: UIMessage): boolean {
  return message.parts.some(
    (part) =>
      (part.type === 'text' && part.text.trim() !== '') ||
      (isToolPart(part) &&
        (toolState(part) === 'output-available' ||
          toolState(part) === 'output-error')),
  );
}

/**
 * Whether a transcript read back from storage ends in the middle of a turn: the
 * last message is the artist's with no reply, or a reply that was still
 * streaming (a text or reasoning part not marked done, a tool still taking its
 * input) or that never got any content, when the page was closed.
 */
export function isInterruptedTranscript(messages: readonly UIMessage[]): boolean {
  const last = messages.at(-1);

  if (!last) {
    return false;
  }

  if (last.role === 'user') {
    return true;
  }

  if (last.role !== 'assistant') {
    return false;
  }

  const unfinished = last.parts.some((part) => {
    if (part.type === 'text' || part.type === 'reasoning') {
      return part.state === 'streaming';
    }

    return (
      isToolPart(part) &&
      (toolState(part) === 'input-streaming' ||
        toolState(part) === 'input-available')
    );
  });

  return unfinished || !hasVisibleContent(last);
}
