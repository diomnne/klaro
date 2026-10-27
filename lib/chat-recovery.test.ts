import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import {
  hasReplyContent,
  hasVisibleContent,
  isInterruptedTranscript,
} from './chat-recovery';

function message(role: UIMessage['role'], parts: unknown[]): UIMessage {
  return { id: `${role}-${Math.random()}`, role, parts } as UIMessage;
}

const user = message('user', [{ type: 'text', text: 'hi' }]);
const done = (text: string) => message('assistant', [{ type: 'text', text, state: 'done' }]);
const tool = (state: string) =>
  message('assistant', [{ type: 'tool-checkScamSignals', toolCallId: 't', state }]);

describe('hasVisibleContent', () => {
  it('is false for a message with no parts or only a step marker', () => {
    expect(hasVisibleContent(message('assistant', []))).toBe(false);
    expect(hasVisibleContent(message('assistant', [{ type: 'step-start' }]))).toBe(false);
  });

  it('is false for empty text', () => {
    expect(hasVisibleContent(message('assistant', [{ type: 'text', text: '' }]))).toBe(false);
  });

  it('is true for text', () => {
    expect(hasVisibleContent(done('hello'))).toBe(true);
  });

  it.each(['input-streaming', 'input-available', 'output-available', 'output-error'])(
    'is true for a tool part in state %s',
    (state) => {
      expect(hasVisibleContent(tool(state))).toBe(true);
    },
  );
});

describe('hasReplyContent', () => {
  it('is false for nothing, a step marker, or whitespace', () => {
    expect(hasReplyContent(message('assistant', []))).toBe(false);
    expect(hasReplyContent(message('assistant', [{ type: 'step-start' }]))).toBe(false);
    expect(hasReplyContent(done('   \n'))).toBe(false);
  });

  it('is true for text', () => {
    expect(hasReplyContent(done('Hello'))).toBe(true);
  });

  it.each(['output-available', 'output-error'])('is true for a tool in state %s', (state) => {
    expect(hasReplyContent(tool(state))).toBe(true);
  });

  it.each(['input-streaming', 'input-available'])(
    'is false for a tool still waiting on its result (%s)',
    (state) => {
      expect(hasReplyContent(tool(state))).toBe(false);
    },
  );
});

describe('isInterruptedTranscript', () => {
  it('is false for no messages', () => {
    expect(isInterruptedTranscript([])).toBe(false);
  });

  it('is false for a finished exchange', () => {
    expect(isInterruptedTranscript([user, done('Here you go.')])).toBe(false);
  });

  it('is false for a finished exchange that includes a scam card', () => {
    const reply = message('assistant', [
      { type: 'tool-checkScamSignals', toolCallId: 't', state: 'output-available' },
      { type: 'text', text: 'Done.', state: 'done' },
    ]);

    expect(isInterruptedTranscript([user, reply])).toBe(false);
  });

  it('is true when the artist’s message never got a reply', () => {
    expect(isInterruptedTranscript([user])).toBe(true);
  });

  it('is true for text saved mid-stream', () => {
    const partial = message('assistant', [{ type: 'text', text: 'The cheque', state: 'streaming' }]);

    expect(isInterruptedTranscript([user, partial])).toBe(true);
  });

  it('is true for reasoning saved mid-stream', () => {
    const partial = message('assistant', [{ type: 'reasoning', text: '…', state: 'streaming' }]);

    expect(isInterruptedTranscript([user, partial])).toBe(true);
  });

  it.each(['input-streaming', 'input-available'])(
    'is true for a tool that never finished (%s)',
    (state) => {
      expect(isInterruptedTranscript([user, tool(state)])).toBe(true);
    },
  );

  it('is true for a reply that never got any content', () => {
    expect(isInterruptedTranscript([user, message('assistant', [{ type: 'step-start' }])])).toBe(true);
    expect(isInterruptedTranscript([user, message('assistant', [])])).toBe(true);
  });

  it('only looks at the last message', () => {
    const old = message('assistant', [{ type: 'text', text: 'old', state: 'streaming' }]);

    expect(isInterruptedTranscript([user, old, user, done('Fine.')])).toBe(false);
  });

  it('treats text with no state as finished', () => {
    expect(
      isInterruptedTranscript([user, message('assistant', [{ type: 'text', text: 'Saved by an older version' }])]),
    ).toBe(false);
  });
});
