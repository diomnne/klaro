/**
 * Review flags: URL switches that let a reviewer see failures on a live preview.
 *
 *   ?toolError=1            the scam check throws
 *   ?toolSlow=1             the scam check is paced so each card state is visible
 *   ?fail=rate-limit        the first request gets a 429 with Retry-After
 *   ?fail=server            the first request gets a 503
 *   ?fail=midstream         the first reply streams some text, then errors
 *   ?fail=bad-tool          the first scam check returns a malformed result
 *
 * Only these exact values count. The `fail` modes fail once and then let
 * everything through, so a reviewer who clicks Retry sees it work. Reloading the
 * page re-arms them.
 */

export const FAIL_MODES = [
  'rate-limit',
  'server',
  'midstream',
  'bad-tool',
] as const;

export type FailMode = (typeof FAIL_MODES)[number];

export type ReviewFlags = {
  toolError: boolean;
  toolSlow: boolean;
  fail: FailMode | null;
};

/** The flags as they travel in the request body. */
export type ReviewFlagsBody = {
  simulateToolError: boolean;
  simulateSlowTool: boolean;
  simulateFail?: FailMode;
};

export function isFailMode(value: unknown): value is FailMode {
  return (
    typeof value === 'string' && (FAIL_MODES as readonly string[]).includes(value)
  );
}

/** The one place the URL is read. Anything but an exact match is ignored. */
export function parseReviewFlags(search: string): ReviewFlags {
  const params = new URLSearchParams(search);
  const fail = params.get('fail');

  return {
    toolError: params.get('toolError') === '1',
    toolSlow: params.get('toolSlow') === '1',
    fail: isFailMode(fail) ? fail : null,
  };
}

/**
 * Returns a function that gives the flags for each request. The URL is parsed
 * on the first call. `toolError` and `toolSlow` are sent every time; `fail` is
 * sent once, on the first request, and never again.
 */
export function createReviewFlagSource(
  getSearch: () => string,
): () => ReviewFlagsBody {
  let flags: ReviewFlags | null = null;
  let failSpent = false;

  return () => {
    flags ??= parseReviewFlags(getSearch());

    const simulateFail = failSpent ? null : flags.fail;
    failSpent = true;

    return {
      simulateToolError: flags.toolError,
      simulateSlowTool: flags.toolSlow,
      ...(simulateFail ? { simulateFail } : {}),
    };
  };
}
