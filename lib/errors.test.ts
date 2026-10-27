import { APICallError } from 'ai';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COOLDOWN_SECONDS,
  LENGTH_WARNING_THRESHOLD,
  MAX_COOLDOWN_SECONDS,
  MAX_MESSAGE_LENGTH,
  checkMessageLength,
  classifyChatError,
  classifyServerError,
  cooldownSeconds,
  errorBody,
  parseErrorBody,
} from './errors';

function httpError(statusCode: number, body: string): APICallError {
  return new APICallError({
    message: body,
    url: '/api/chat',
    requestBodyValues: undefined,
    statusCode,
    responseBody: body,
  });
}

describe('classifyChatError', () => {
  it.each([null, undefined])('treats %s as unknown', (error) => {
    expect(classifyChatError(error)).toBe('unknown');
  });

  it.each([
    ['a string', 'boom'],
    ['a number', 42],
    ['an empty object', {}],
    ['an array', []],
    ['an Error with no useful message', new Error('')],
  ])('treats %s as unknown', (_, error) => {
    expect(classifyChatError(error)).toBe('unknown');
  });

  describe('what the server sent', () => {
    it.each<[string, ReturnType<typeof classifyChatError>]>([
      ['rate_limited', 'rate_limited'],
      ['overloaded', 'overloaded'],
      ['blocked', 'blocked'],
      ['too_long', 'too_long'],
      ['unknown', 'unknown'],
    ])('reads the bare code "%s" from an in-stream error', (code, kind) => {
      expect(classifyChatError(new Error(code))).toBe(kind);
    });

    it('reads a code from the JSON body of a failed response', () => {
      expect(
        classifyChatError(httpError(400, JSON.stringify({ code: 'too_long' }))),
      ).toBe('too_long');
    });

    it('classifies a 429 APICallError as rate limited, with or without a body', () => {
      expect(classifyChatError(httpError(429, ''))).toBe('rate_limited');
      expect(
        classifyChatError(httpError(429, errorBody('rate_limited', 20))),
      ).toBe('rate_limited');
    });

    it.each([502, 503, 504])('classifies a %i as overloaded', (status) => {
      expect(classifyChatError(httpError(status, ''))).toBe('overloaded');
    });

    it('classifies a 500 as unknown', () => {
      expect(classifyChatError(httpError(500, errorBody('unknown')))).toBe(
        'unknown',
      );
      expect(classifyChatError(httpError(500, ''))).toBe('unknown');
    });

    it('never mistakes a raw provider message for a code', () => {
      expect(
        classifyChatError(new Error('The model is rate_limited by Google')),
      ).toBe('unknown');
    });

    it('lets a rate limit win even when part of the reply arrived', () => {
      expect(
        classifyChatError(new Error('rate_limited'), { hasPartialReply: true }),
      ).toBe('rate_limited');
    });
  });

  describe('a dropped connection', () => {
    it.each([
      ['Chrome', new TypeError('Failed to fetch')],
      ['Safari', new TypeError('Load failed')],
      [
        'Firefox',
        new TypeError('NetworkError when attempting to fetch resource.'),
      ],
    ])('is offline with nothing received (%s)', (_, error) => {
      expect(classifyChatError(error)).toBe('offline');
    });

    it('is offline when the browser says so, whatever the error', () => {
      expect(classifyChatError(new Error('anything'), { online: false })).toBe(
        'offline',
      );
    });

    it('is interrupted when part of the reply arrived', () => {
      expect(
        classifyChatError(new TypeError('Load failed'), { hasPartialReply: true }),
      ).toBe('interrupted');
    });

    it('is interrupted, not offline, when the browser is offline mid-reply', () => {
      expect(
        classifyChatError(new TypeError('Failed to fetch'), {
          hasPartialReply: true,
          online: false,
        }),
      ).toBe('interrupted');
    });

    it('does not call an HTTP error a network error', () => {
      expect(classifyChatError(httpError(418, 'failed to fetch'))).toBe(
        'unknown',
      );
    });
  });

  it('is interrupted when any other error hits after part of the reply', () => {
    expect(
      classifyChatError(new Error('unknown'), { hasPartialReply: true }),
    ).toBe('interrupted');
  });

  it('is unknown for an unfamiliar error with nothing received', () => {
    expect(classifyChatError(new Error('something odd'), { online: true })).toBe(
      'unknown',
    );
  });
});

describe('classifyServerError', () => {
  it.each([null, undefined, 'x', 7, {}])('returns unknown for %j', (error) => {
    expect(classifyServerError(error)).toBe('unknown');
  });

  it('reads a 429 on the error itself', () => {
    expect(classifyServerError(httpError(429, 'slow down'))).toBe('rate_limited');
  });

  it.each([502, 503, 504])('reads a %i as overloaded', (status) => {
    expect(classifyServerError(httpError(status, ''))).toBe('overloaded');
  });

  it('finds a 429 inside a retry error, as the provider SDK wraps it', () => {
    const retryError = {
      name: 'AI_RetryError',
      message: 'Failed after 3 attempts. Last error: you exceeded your quota',
      lastError: httpError(429, 'quota'),
      errors: [httpError(429, 'quota')],
    };

    expect(classifyServerError(retryError)).toBe('rate_limited');
  });

  it('finds a status code in a cause', () => {
    expect(
      classifyServerError(new Error('wrapped', { cause: httpError(503, '') })),
    ).toBe('overloaded');
  });

  it.each([
    ['RESOURCE_EXHAUSTED: quota exceeded', 'rate_limited'],
    ['The model is overloaded. Please try again later.', 'overloaded'],
    ['This model is currently experiencing high demand', 'overloaded'],
    ['Response was blocked due to SAFETY', 'blocked'],
    ['The prompt contains prohibited content', 'blocked'],
    ['Request exceeds the maximum context length', 'too_long'],
    ['something else entirely', 'unknown'],
  ])('reads "%s" as %s', (message, code) => {
    expect(classifyServerError(new Error(message))).toBe(code);
  });

  it('survives a cycle in the cause chain', () => {
    const a: { message: string; cause?: unknown } = { message: 'a' };
    a.cause = { message: 'b', cause: a };

    expect(classifyServerError(a)).toBe('unknown');
  });
});

describe('parseErrorBody', () => {
  it('reads a code and a retry-after from JSON', () => {
    expect(parseErrorBody('{"code":"rate_limited","retryAfter":20}')).toEqual({
      code: 'rate_limited',
      retryAfter: 20,
    });
  });

  it('reads a bare code', () => {
    expect(parseErrorBody('overloaded')).toEqual({ code: 'overloaded' });
  });

  it.each([
    ['not JSON', 'Something went wrong.'],
    ['an unknown code', '{"code":"melted"}'],
    ['a non-object', '42'],
    ['null', 'null'],
    ['an empty string', ''],
    ['not a string', undefined],
  ])('returns nothing for %s', (_, input) => {
    expect(parseErrorBody(input)).toEqual({});
  });

  it('ignores a retry-after that is not a number', () => {
    expect(parseErrorBody('{"code":"rate_limited","retryAfter":"soon"}')).toEqual(
      { code: 'rate_limited' },
    );
  });

  it('round-trips with errorBody', () => {
    expect(parseErrorBody(errorBody('rate_limited', 20))).toEqual({
      code: 'rate_limited',
      retryAfter: 20,
    });
    expect(parseErrorBody(errorBody('blocked'))).toEqual({ code: 'blocked' });
  });
});

describe('cooldownSeconds', () => {
  it('uses the default when the server sent nothing', () => {
    expect(cooldownSeconds()).toBe(DEFAULT_COOLDOWN_SECONDS);
    expect(DEFAULT_COOLDOWN_SECONDS).toBe(15);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'uses the default for %s',
    (value) => {
      expect(cooldownSeconds(value)).toBe(DEFAULT_COOLDOWN_SECONDS);
    },
  );

  it('honours what the server asked for, rounded up', () => {
    expect(cooldownSeconds(20)).toBe(20);
    expect(cooldownSeconds(7.2)).toBe(8);
  });

  it('caps a long request at 60 seconds', () => {
    expect(cooldownSeconds(3600)).toBe(MAX_COOLDOWN_SECONDS);
    expect(MAX_COOLDOWN_SECONDS).toBe(60);
  });
});

describe('checkMessageLength', () => {
  it('accepts an empty message without complaint', () => {
    expect(checkMessageLength('')).toEqual({
      length: 0,
      tooLong: false,
      nearLimit: false,
      remaining: MAX_MESSAGE_LENGTH,
    });
  });

  it('accepts exactly the limit', () => {
    const result = checkMessageLength('a'.repeat(MAX_MESSAGE_LENGTH));

    expect(result.tooLong).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('rejects one character over', () => {
    const result = checkMessageLength('a'.repeat(MAX_MESSAGE_LENGTH + 1));

    expect(result.tooLong).toBe(true);
    expect(result.remaining).toBe(-1);
  });

  it('starts warning at the threshold, not before', () => {
    expect(checkMessageLength('a'.repeat(LENGTH_WARNING_THRESHOLD - 1)).nearLimit).toBe(
      false,
    );
    expect(checkMessageLength('a'.repeat(LENGTH_WARNING_THRESHOLD)).nearLimit).toBe(
      true,
    );
  });

  it('is 8,000 characters with the warning at 7,000', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(8000);
    expect(LENGTH_WARNING_THRESHOLD).toBe(7000);
  });
});
