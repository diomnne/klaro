/**
 * How Klaro tells failures apart. The server turns whatever went wrong into a
 * short code (the raw error can carry request details and provider internals,
 * so it never leaves the server); the client turns what it received, plus what
 * it knows about the conversation, into the notice the artist sees.
 */

/** The longest message the chat accepts, counted on the text as redacted and sent. */
export const MAX_MESSAGE_LENGTH = 8000;

/** From here the composer starts showing how much room is left. */
export const LENGTH_WARNING_THRESHOLD = 7000;

/** How long Retry stays disabled after a rate limit, when the server didn't say. */
export const DEFAULT_COOLDOWN_SECONDS = 15;

/** The longest cooldown honoured, whatever Retry-After asks for. */
export const MAX_COOLDOWN_SECONDS = 60;

/** What the server sends. `unknown` is the catch-all and carries no information. */
export type ChatErrorCode =
  | 'rate_limited'
  | 'overloaded'
  | 'blocked'
  | 'too_long'
  | 'unknown';

/** What the client shows. */
export type ChatErrorKind =
  | 'offline'
  | 'rate_limited'
  | 'overloaded'
  | 'interrupted'
  | 'blocked'
  | 'too_long'
  | 'unknown';

const CHAT_ERROR_CODES: readonly ChatErrorCode[] = [
  'rate_limited',
  'overloaded',
  'blocked',
  'too_long',
  'unknown',
];

function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return (
    typeof value === 'string' &&
    (CHAT_ERROR_CODES as readonly string[]).includes(value)
  );
}

/** How deep to follow `lastError` / `cause` / `errors` before giving up. */
const MAX_WALK_DEPTH = 5;

type Evidence = { statusCodes: number[]; text: string };

/**
 * Collects the status codes and message text from an error and everything it
 * wraps. Provider failures arrive inside retry errors, so the status code that
 * matters is often on `lastError` rather than on the error itself.
 */
function collectEvidence(error: unknown): Evidence {
  const statusCodes: number[] = [];
  const texts: string[] = [];
  const seen = new Set<unknown>();

  function walk(value: unknown, depth: number): void {
    if (typeof value === 'string') {
      texts.push(value);
      return;
    }

    if (typeof value !== 'object' || value === null) {
      return;
    }

    if (seen.has(value) || depth > MAX_WALK_DEPTH) {
      return;
    }

    seen.add(value);

    const record = value as Record<string, unknown>;

    if (typeof record.statusCode === 'number') {
      statusCodes.push(record.statusCode);
    }

    if (typeof record.message === 'string') {
      texts.push(record.message);
    }

    walk(record.lastError, depth + 1);
    walk(record.cause, depth + 1);

    if (Array.isArray(record.errors)) {
      for (const inner of record.errors) {
        walk(inner, depth + 1);
      }
    }
  }

  walk(error, 0);

  return { statusCodes, text: texts.join('\n').toLowerCase() };
}

/**
 * Maps a server-side error to the short code sent to the client. The real error
 * is logged by the caller and never forwarded.
 */
export function classifyServerError(error: unknown): ChatErrorCode {
  const { statusCodes, text } = collectEvidence(error);

  if (statusCodes.includes(429)) {
    return 'rate_limited';
  }

  if (statusCodes.some((code) => code === 502 || code === 503 || code === 504)) {
    return 'overloaded';
  }

  if (/resource_exhausted|quota|rate.?limit|too many requests/.test(text)) {
    return 'rate_limited';
  }

  if (/unavailable|overloaded|high demand|temporarily/.test(text)) {
    return 'overloaded';
  }

  if (/safety|blocked|prohibited|content.?filter|recitation/.test(text)) {
    return 'blocked';
  }

  if (/too long|context length|maximum context|token limit/.test(text)) {
    return 'too_long';
  }

  return 'unknown';
}

/** The JSON body of a failed chat response. Only ever a code, never an error message. */
export function errorBody(code: ChatErrorCode, retryAfter?: number): string {
  return JSON.stringify(retryAfter === undefined ? { code } : { code, retryAfter });
}

/**
 * Reads what the server sent. A failed HTTP response arrives as its JSON body;
 * a failure inside the stream arrives as the bare code. Anything else yields
 * nothing, so an unexpected message is never mistaken for a code.
 */
export function parseErrorBody(message: unknown): {
  code?: ChatErrorCode;
  retryAfter?: number;
} {
  if (typeof message !== 'string') {
    return {};
  }

  const trimmed = message.trim();

  if (isChatErrorCode(trimmed)) {
    return { code: trimmed };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    const { code, retryAfter } = parsed as Record<string, unknown>;

    return {
      ...(isChatErrorCode(code) ? { code } : {}),
      ...(typeof retryAfter === 'number' && Number.isFinite(retryAfter)
        ? { retryAfter }
        : {}),
    };
  } catch {
    return {};
  }
}

/** Safari says "Load failed", Firefox "NetworkError when attempting to fetch…", Chrome "Failed to fetch". */
const NETWORK_ERROR_MESSAGE =
  /failed to fetch|load failed|networkerror|network request failed|network error|fetch failed|terminated/i;

function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { name, message } = error as { name?: unknown; message?: unknown };

  return (
    typeof message === 'string' &&
    NETWORK_ERROR_MESSAGE.test(message) &&
    (name === 'TypeError' || error instanceof TypeError || !('statusCode' in error))
  );
}

export type ChatErrorContext = {
  /** The assistant message already has text or a tool result when the error hit. */
  hasPartialReply?: boolean;
  /** `navigator.onLine`; unknown is treated as online. */
  online?: boolean;
};

/**
 * Decides which notice a chat error gets. The server's word comes first (a rate
 * limit is a rate limit however much of the reply arrived). After that, a
 * partial reply means the reply was cut off even if the connection is the
 * reason: the text on screen stays the focus. Only with nothing received does
 * a lost connection read as "can't reach Klaro".
 */
export function classifyChatError(
  error: unknown,
  context: ChatErrorContext = {},
): ChatErrorKind {
  if (error === null || error === undefined) {
    return 'unknown';
  }

  const { code } = parseErrorBody((error as { message?: unknown }).message);
  const statusCode = (error as { statusCode?: unknown }).statusCode;

  if (code === 'rate_limited' || statusCode === 429) {
    return 'rate_limited';
  }

  if (
    code === 'overloaded' ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  ) {
    return 'overloaded';
  }

  if (code === 'blocked') {
    return 'blocked';
  }

  if (code === 'too_long') {
    return 'too_long';
  }

  if (context.hasPartialReply) {
    return 'interrupted';
  }

  if (context.online === false || isNetworkError(error)) {
    return 'offline';
  }

  return 'unknown';
}

/**
 * How many seconds Retry stays disabled after a rate limit: what the server
 * asked for, capped, else a default. The server's number is seconds.
 */
export function cooldownSeconds(retryAfter?: number): number {
  if (retryAfter === undefined || !Number.isFinite(retryAfter) || retryAfter <= 0) {
    return DEFAULT_COOLDOWN_SECONDS;
  }

  return Math.min(Math.ceil(retryAfter), MAX_COOLDOWN_SECONDS);
}

export type MessageLength = {
  length: number;
  /** Over the limit: the message can't be sent. */
  tooLong: boolean;
  /** Close enough to the limit to start showing the count. */
  nearLimit: boolean;
  /** Characters left; negative when over. */
  remaining: number;
};

/** The one place the length rule lives, shared by the composer and the route. */
export function checkMessageLength(text: string): MessageLength {
  const length = text.length;

  return {
    length,
    tooLong: length > MAX_MESSAGE_LENGTH,
    nearLimit: length >= LENGTH_WARNING_THRESHOLD,
    remaining: MAX_MESSAGE_LENGTH - length,
  };
}
