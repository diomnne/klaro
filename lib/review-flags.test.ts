import { describe, expect, it } from 'vitest';

import {
  FAIL_MODES,
  createReviewFlagSource,
  isFailMode,
  parseReviewFlags,
} from './review-flags';

describe('parseReviewFlags', () => {
  it('reads nothing from an empty query', () => {
    expect(parseReviewFlags('')).toEqual({
      toolError: false,
      toolSlow: false,
      fail: null,
    });
  });

  it('reads the two tool flags', () => {
    expect(parseReviewFlags('?toolError=1&toolSlow=1')).toMatchObject({
      toolError: true,
      toolSlow: true,
    });
  });

  it.each(FAIL_MODES)('reads ?fail=%s', (mode) => {
    expect(parseReviewFlags(`?fail=${mode}`).fail).toBe(mode);
  });

  it.each([
    '?toolError=true',
    '?toolError=0',
    '?toolError=',
    '?toolError=11',
    '?toolError=1 ',
    '?TOOLERROR=1',
    '?toolSlow=yes',
  ])('ignores %s', (query) => {
    expect(parseReviewFlags(query)).toEqual({
      toolError: false,
      toolSlow: false,
      fail: null,
    });
  });

  it.each([
    '?fail=',
    '?fail=1',
    '?fail=rate_limit',
    '?fail=Server',
    '?fail=rate-limit%20',
    '?fail=midstream-x&fail=server',
    '?fail=constructor',
    '?fail=__proto__',
  ])('ignores %s', (query) => {
    expect(parseReviewFlags(query).fail).toBeNull();
  });

  it('uses the first ?fail when it is repeated', () => {
    expect(parseReviewFlags('?fail=server&fail=midstream').fail).toBe('server');
  });

  it('works with or without the leading question mark', () => {
    expect(parseReviewFlags('fail=server').fail).toBe('server');
  });
});

describe('isFailMode', () => {
  it.each(FAIL_MODES)('accepts %s', (mode) => {
    expect(isFailMode(mode)).toBe(true);
  });

  it.each([null, undefined, 1, {}, [], '', 'toString', 'rate_limit'])(
    'rejects %j',
    (value) => {
      expect(isFailMode(value)).toBe(false);
    },
  );
});

describe('createReviewFlagSource', () => {
  it('sends no failure when none was asked for', () => {
    const next = createReviewFlagSource(() => '');

    expect(next()).toEqual({ simulateToolError: false, simulateSlowTool: false });
  });

  it('sends the failure on the first request only', () => {
    const next = createReviewFlagSource(() => '?fail=rate-limit');

    expect(next()).toMatchObject({ simulateFail: 'rate-limit' });
    expect(next()).not.toHaveProperty('simulateFail');
    expect(next()).not.toHaveProperty('simulateFail');
  });

  it('keeps sending the tool flags on every request', () => {
    const next = createReviewFlagSource(() => '?toolError=1&toolSlow=1&fail=server');

    for (let i = 0; i < 3; i += 1) {
      expect(next()).toMatchObject({ simulateToolError: true, simulateSlowTool: true });
    }
  });

  it('spends the failure on the first request even when it carries no flag', () => {
    const next = createReviewFlagSource(() => '?toolError=1');

    next();

    expect(next()).not.toHaveProperty('simulateFail');
  });

  it('re-arms with a new source, which is what a page reload creates', () => {
    const search = () => '?fail=midstream';

    const first = createReviewFlagSource(search);
    first();
    expect(first()).not.toHaveProperty('simulateFail');

    expect(createReviewFlagSource(search)()).toMatchObject({
      simulateFail: 'midstream',
    });
  });

  it('reads the URL once, on the first request', () => {
    let reads = 0;
    const next = createReviewFlagSource(() => {
      reads += 1;
      return '?toolSlow=1';
    });

    next();
    next();
    next();

    expect(reads).toBe(1);
  });
});
