import { describe, expect, it } from 'vitest';

import {
  PAYMENT_SAFE_STEP,
  SIGNALS,
  SIGNAL_GUARDS,
  createCheckScamSignalsTool,
  isScamCheckResult,
  repairSignalsInput,
  scoreScamSignals,
  type SignalId,
} from './check-scam-signals';

const MESSAGE = [
  "Hello dear! My daughter's birthday is next week and she loves your art so much.",
  "Your work is amazing. I'll pay any price you ask.",
  "I will send a cheque for 20000, please refund the extra to my assistant.",
  'Kindly send me the code sent to your phone.',
  "I'm deaf so I can only text. Please reply ASAP, and talk to me on WhatsApp.",
  'You need to pay the release fee first to receive the funds.',
  'Please log in at [link: gcash-claim.xyz] to release your payment.',
].join('\n');

const EVIDENCE: Record<SignalId, string> = {
  sentimental_hook_no_direction: "My daughter's birthday is next week",
  generic_praise: 'Your work is amazing',
  accepts_any_price: "I'll pay any price you ask",
  overpayment_or_refund: 'please refund the extra',
  unusual_payment_method: 'send a cheque',
  code_or_credentials_request: 'send me the code',
  cannot_talk_normally: 'I can only text',
  urgency: 'reply ASAP',
  move_off_platform: 'talk to me on WhatsApp',
  crypto_or_fee_to_receive: 'pay the release fee first',
  payment_link: 'log in at [link: gcash-claim.xyz] to release your payment',
};

function signals(...ids: SignalId[]) {
  return ids.map((id) => ({ id, evidence: EVIDENCE[id] }));
}

describe('scoreScamSignals', () => {
  it('reports few signals and only the payment step when nothing was found', () => {
    expect(scoreScamSignals([], MESSAGE)).toEqual({
      level: 'few',
      signals: [],
      safeSteps: [PAYMENT_SAFE_STEP],
      neverDo: [],
    });
  });

  it('treats an empty message as having no evidence at all', () => {
    expect(scoreScamSignals(signals('urgency'), '').signals).toEqual([]);
  });

  it('drops empty or whitespace-only evidence, which would otherwise match anything', () => {
    const result = scoreScamSignals(
      [
        { id: 'urgency', evidence: '' },
        { id: 'generic_praise', evidence: '   ' },
        { id: 'overpayment_or_refund', evidence: '""' },
      ],
      MESSAGE,
    );

    expect(result.signals).toEqual([]);
    expect(result.neverDo).toEqual([]);
  });

  it('drops a signal whose evidence is not in the message', () => {
    const result = scoreScamSignals(
      [{ id: 'overpayment_or_refund', evidence: 'I will pay you double' }],
      MESSAGE,
    );

    expect(result.signals).toEqual([]);
    expect(result.neverDo).toEqual([]);
  });

  it.each([
    ['different case', 'PLEASE REPLY asap'],
    ['different whitespace', "my   daughter's\nbirthday"],
    ['curly quotes', 'my daughter’s birthday'],
    ['wrapping quotes', '"pay any price"'],
  ])('matches evidence with %s', (_, evidence) => {
    const result = scoreScamSignals([{ id: 'urgency', evidence }], MESSAGE);

    expect(result.signals).toHaveLength(1);
  });

  it('matches straight-quoted evidence against a curly-quoted message', () => {
    const result = scoreScamSignals(
      [{ id: 'sentimental_hook_no_direction', evidence: "my daughter's birthday" }],
      'My daughter’s birthday is soon',
    );

    expect(result.signals).toHaveLength(1);
  });

  it('keeps the first of several signals with the same id', () => {
    const result = scoreScamSignals(
      [
        { id: 'urgency', evidence: 'reply ASAP' },
        { id: 'urgency', evidence: 'next week' },
      ],
      MESSAGE,
    );

    expect(result.signals).toEqual([
      {
        id: 'urgency',
        label: SIGNALS.urgency.label,
        evidence: 'reply ASAP',
        explanation: SIGNALS.urgency.explanation,
      },
    ]);
  });

  describe('one quote, one signal', () => {
    it('counts a quote filed under two low signals once, keeping the first', () => {
      const result = scoreScamSignals(
        [
          { id: 'move_off_platform', evidence: 'talk to me on WhatsApp' },
          { id: 'cannot_talk_normally', evidence: 'talk to me on WhatsApp' },
        ],
        MESSAGE,
      );

      expect(result.signals.map(({ id }) => id)).toEqual(['move_off_platform']);
      expect(result.level).toBe('few');
    });

    it('treats quotes that differ only in case or spacing as the same quote', () => {
      const result = scoreScamSignals(
        [
          { id: 'move_off_platform', evidence: 'talk to me on WhatsApp' },
          { id: 'cannot_talk_normally', evidence: 'Talk to  me on whatsapp' },
        ],
        MESSAGE,
      );

      expect(result.signals).toHaveLength(1);
    });

    it.each<[string, SignalId[]]>([
      ['low first', ['unusual_payment_method', 'overpayment_or_refund']],
      ['high first', ['overpayment_or_refund', 'unusual_payment_method']],
    ])('keeps the high signal when it shares a quote with a low one (%s)', (_, ids) => {
      const result = scoreScamSignals(
        ids.map((id) => ({ id, evidence: 'send a cheque for 20000' })),
        MESSAGE,
      );

      expect(result.signals.map(({ id }) => id)).toEqual(['overpayment_or_refund']);
      expect(result.level).toBe('some');
      expect(result.neverDo).toEqual([
        expect.stringContaining('Never refund an overpayment'),
      ]);
    });
  });

  describe('level', () => {
    it.each<[string, SignalId[], 'few' | 'some' | 'many']>([
      ['1 low', ['urgency'], 'few'],
      ['2 low', ['urgency', 'generic_praise'], 'few'],
      ['3 low', ['urgency', 'generic_praise', 'accepts_any_price'], 'some'],
      [
        '4 low',
        ['urgency', 'generic_praise', 'accepts_any_price', 'move_off_platform'],
        'some',
      ],
      [
        '5 low',
        [
          'urgency',
          'generic_praise',
          'accepts_any_price',
          'move_off_platform',
          'cannot_talk_normally',
        ],
        'many',
      ],
      ['1 high', ['overpayment_or_refund'], 'some'],
      ['1 high (payment link)', ['payment_link'], 'some'],
      [
        '1 high + 2 low',
        ['overpayment_or_refund', 'urgency', 'generic_praise'],
        'many',
      ],
      [
        '2 high',
        ['code_or_credentials_request', 'crypto_or_fee_to_receive'],
        'many',
      ],
    ])('%s → %s', (_, ids, level) => {
      expect(scoreScamSignals(signals(...ids), MESSAGE).level).toBe(level);
    });

    it('does not let duplicates inflate the level', () => {
      expect(
        scoreScamSignals(signals('urgency', 'urgency', 'urgency'), MESSAGE)
          .level,
      ).toBe('few');
    });

    it('does not count signals that were dropped for missing evidence', () => {
      const result = scoreScamSignals(
        [
          ...signals('urgency', 'generic_praise'),
          { id: 'accepts_any_price', evidence: 'name your price' },
        ],
        MESSAGE,
      );

      expect(result.level).toBe('few');
    });
  });

  describe('never-do items', () => {
    it.each<[SignalId, string]>([
      ['overpayment_or_refund', 'Never refund an overpayment'],
      ['code_or_credentials_request', 'Never share an OTP, PIN or login code'],
      ['crypto_or_fee_to_receive', 'Never pay a fee to receive money'],
      [
        'payment_link',
        'Never log in or enter details through a link someone sent to pay you',
      ],
    ])('%s triggers exactly its own item', (id, item) => {
      expect(scoreScamSignals(signals(id), MESSAGE).neverDo).toEqual([
        expect.stringContaining(item),
      ]);
    });

    it('stays empty for low-weight signals, even at the "many" level', () => {
      const result = scoreScamSignals(
        signals(
          'urgency',
          'generic_praise',
          'accepts_any_price',
          'move_off_platform',
          'cannot_talk_normally',
          'unusual_payment_method',
          'sentimental_hook_no_direction',
        ),
        MESSAGE,
      );

      expect(result.level).toBe('many');
      expect(result.neverDo).toEqual([]);
    });
  });

  describe('safe steps', () => {
    it('shows only the payment step at "few", even when signals were found', () => {
      const result = scoreScamSignals(
        signals('urgency', 'generic_praise'),
        MESSAGE,
      );

      expect(result.level).toBe('few');
      expect(result.signals).toHaveLength(2);
      expect(result.safeSteps).toEqual([PAYMENT_SAFE_STEP]);
    });

    it('adds the steps for the signals found from "some" up', () => {
      const result = scoreScamSignals(
        signals('urgency', 'generic_praise', 'accepts_any_price'),
        MESSAGE,
      );

      expect(result.level).toBe('some');
      expect(result.safeSteps).toEqual([
        PAYMENT_SAFE_STEP,
        'Ask for references and specific details before you confirm the price.',
        'Take the time you need to check. A genuine client can usually wait a day.',
      ]);
    });

    it('always leads with the payment step, exactly once', () => {
      const allIds = Object.keys(SIGNALS) as SignalId[];
      const result = scoreScamSignals(signals(...allIds), MESSAGE);

      expect(result.safeSteps[0]).toBe(PAYMENT_SAFE_STEP);
      expect(
        result.safeSteps.filter((step) => step === PAYMENT_SAFE_STEP),
      ).toHaveLength(1);
      expect(new Set(result.safeSteps).size).toBe(result.safeSteps.length);
    });
  });
});

describe('signal guards', () => {
  const praise = SIGNAL_GUARDS.generic_praise!;
  const hook = SIGNAL_GUARDS.sentimental_hook_no_direction!;

  describe('generic_praise', () => {
    it.each([
      '',
      'I found you through your Instagram',
      "I'd love a portrait based on an old photo",
      'saw your page and want to commission',
      'Great, thanks for replying',
      'I have an amazing idea for a birthday',
    ])('drops "%s"', (evidence) => {
      expect(praise(evidence, evidence)).toBe(false);
    });

    it.each([
      'I love your art style so much',
      'amazing work',
      'your art is beautiful',
      'ang ganda ng art mo',
      'ang galing mo po',
      'mahusay ang drawings mo',
      'i love ur art',
      'I adore all your illustrations',
      'You are so talented',
      'Your portfolio is STUNNING',
      'I love your art style so much',
    ])('keeps "%s"', (evidence) => {
      expect(praise(evidence, evidence)).toBe(true);
    });

    it('matches curly apostrophes and mixed case', () => {
      expect(praise('I LOVE   your Art', '')).toBe(true);
    });

    it('drops a signal end to end, so nothing is reported', () => {
      const message =
        "Hi, I'd love a portrait based on an old photo. I found you through your Instagram.";
      const result = scoreScamSignals(
        [{ id: 'generic_praise', evidence: 'I found you through your Instagram' }],
        message,
      );

      expect(result.signals).toEqual([]);
      expect(result.level).toBe('few');
    });

    it('keeps a real compliment end to end', () => {
      const result = scoreScamSignals(
        [{ id: 'generic_praise', evidence: 'I love your art style so much' }],
        'hi! I love your art style so much',
      );

      expect(result.signals.map(({ id }) => id)).toEqual(['generic_praise']);
    });
  });

  describe('sentimental_hook_no_direction', () => {
    const story = "I'm planning a surprise for my mom's 60th birthday";

    it('keeps a story that says nothing about the piece', () => {
      expect(hook(story, story)).toBe(true);
      expect(hook(story, `${story}. Her party is in two weeks. What are your rates?`)).toBe(true);
    });

    it.each([
      'I have an old photo of her and my late dad',
      'I can send a picture',
      'here are some pics',
      'I attached a reference',
      'I have a ref sheet',
      'a half-body please',
      'full body drawing',
      'half body',
      'a bust of my dog',
      'just a headshot',
      'a chibi of us',
      'digital is fine',
      'something traditional',
      'in watercolor',
      'in watercolour',
    ])('drops it when the message says "%s"', (detail) => {
      expect(hook(story, `${story}. ${detail}`)).toBe(false);
    });

    it('looks at the whole message, not just the quote', () => {
      expect(hook(story, `${story}. I can send reference photos.`)).toBe(false);
    });

    it('does not match words that merely contain a direction word', () => {
      expect(hook(story, `${story}. She is a busty, digitally minded person`)).toBe(true);
    });

    it('drops it end to end, so nothing is reported', () => {
      const message = `${story} and I'd love a portrait based on an old photo of her.`;
      const result = scoreScamSignals(
        [{ id: 'sentimental_hook_no_direction', evidence: story }],
        message,
      );

      expect(result.signals).toEqual([]);
    });

    it('still flags a story with no direction end to end', () => {
      const result = scoreScamSignals(
        [{ id: 'sentimental_hook_no_direction', evidence: story }],
        `${story}. Please let me know your rates.`,
      );

      expect(result.signals.map(({ id }) => id)).toEqual([
        'sentimental_hook_no_direction',
      ]);
    });
  });

  describe('dropping a signal', () => {
    const message =
      "I found you through your Instagram. Your work is amazing. Please refund the extra to my assistant. Reply ASAP.";

    it('leaves the other signals, the level and the never-do items as they were', () => {
      const others = [
        { id: 'overpayment_or_refund' as const, evidence: 'refund the extra to my assistant' },
        { id: 'urgency' as const, evidence: 'Reply ASAP' },
      ];
      const withoutRejected = scoreScamSignals(others, message);
      const withRejected = scoreScamSignals(
        [{ id: 'generic_praise', evidence: 'I found you through your Instagram' }, ...others],
        message,
      );

      expect(withRejected).toEqual(withoutRejected);
      // 3 + 1 points. Had the rejected signal counted, it would be 5: "many".
      expect(withRejected.level).toBe('some');
    });

    it('does not let a rejected quote block a valid one for the same signal', () => {
      const result = scoreScamSignals(
        [
          { id: 'generic_praise', evidence: 'I found you through your Instagram' },
          { id: 'generic_praise', evidence: 'Your work is amazing' },
        ],
        message,
      );

      expect(result.signals).toEqual([
        expect.objectContaining({ id: 'generic_praise', evidence: 'Your work is amazing' }),
      ]);
    });

    it('is not applied to signals without a guard', () => {
      expect(SIGNAL_GUARDS.urgency).toBeUndefined();
      expect(SIGNAL_GUARDS.overpayment_or_refund).toBeUndefined();
    });
  });
});

describe('repairSignalsInput', () => {
  it.each([null, undefined, 'signals', 42, {}, { signals: 'none' }])(
    'returns %j unchanged',
    (input) => {
      expect(repairSignalsInput(input)).toBe(input);
    },
  );

  it('leaves an empty signal list empty', () => {
    expect(repairSignalsInput({ signals: [] })).toEqual({ signals: [] });
  });

  it('leaves valid input as it is', () => {
    const input = { signals: signals('urgency') };

    expect(repairSignalsInput(input)).toEqual(input);
  });

  it('drops a signal whose id is not in the enum', () => {
    expect(
      repairSignalsInput({
        signals: [
          { id: 'unusual_pay_method', evidence: 'send a cheque' },
          { id: 'urgency', evidence: 'reply ASAP' },
        ],
      }),
    ).toEqual({ signals: [{ id: 'urgency', evidence: 'reply ASAP' }] });
  });

  it('splits a list of quotes into one entry per quote', () => {
    expect(
      repairSignalsInput({
        signals: [
          { id: 'urgency', evidence: ['reply ASAP', 'next week'] },
          { id: 'generic_praise', evidence: 'Your work is amazing' },
        ],
      }),
    ).toEqual({
      signals: [
        { id: 'urgency', evidence: 'reply ASAP' },
        { id: 'urgency', evidence: 'next week' },
        { id: 'generic_praise', evidence: 'Your work is amazing' },
      ],
    });
  });

  it('lets scoring keep the first quote that is actually in the message', () => {
    const split = repairSignalsInput({
      signals: [
        { id: 'urgency', evidence: ['need it by tonight', 'reply ASAP'] },
      ],
    }) as { signals: Array<{ id: SignalId; evidence: string }> };

    expect(scoreScamSignals(split.signals, MESSAGE).signals).toEqual([
      expect.objectContaining({ id: 'urgency', evidence: 'reply ASAP' }),
    ]);
  });

  it('drops an empty list of quotes, which carries no evidence', () => {
    expect(
      repairSignalsInput({ signals: [{ id: 'urgency', evidence: [] }] }),
    ).toEqual({ signals: [] });
  });
});

describe('isScamCheckResult', () => {
  const valid = {
    level: 'some',
    signals: [
      {
        id: 'urgency',
        label: 'Pressure to hurry',
        evidence: 'reply ASAP',
        explanation: 'Tight deadlines are often real.',
      },
    ],
    safeSteps: [PAYMENT_SAFE_STEP],
    neverDo: [],
  };

  it('accepts a well-formed result, and ignores extra fields', () => {
    expect(isScamCheckResult(valid)).toBe(true);
    expect(isScamCheckResult({ ...valid, extra: 1 })).toBe(true);
  });

  it('accepts the empty result', () => {
    expect(
      isScamCheckResult({ level: 'few', signals: [], safeSteps: [], neverDo: [] }),
    ).toBe(true);
  });

  it.each([null, undefined, 'few', 42, true, [], () => 1])(
    'rejects a non-object (%s)',
    (value) => {
      expect(isScamCheckResult(value)).toBe(false);
    },
  );

  it.each<[string, unknown]>([
    ['a missing level', { ...valid, level: undefined }],
    ['an unknown level', { ...valid, level: 'catastrophic' }],
    ['a wrong-case level', { ...valid, level: 'Few' }],
    ['signals that is not an array', { ...valid, signals: 'none found' }],
    ['missing signals', { ...valid, signals: undefined }],
    ['a null signal', { ...valid, signals: [null] }],
    ['a signal with an unknown id', { ...valid, signals: [{ ...valid.signals[0], id: 'vibes' }] }],
    ['a signal with no label', { ...valid, signals: [{ ...valid.signals[0], label: undefined }] }],
    ['a signal with numeric evidence', { ...valid, signals: [{ ...valid.signals[0], evidence: 7 }] }],
    ['a signal with no explanation', { ...valid, signals: [{ ...valid.signals[0], explanation: null }] }],
    ['safeSteps that is not an array', { ...valid, safeSteps: 'wait' }],
    ['a non-string safe step', { ...valid, safeSteps: [PAYMENT_SAFE_STEP, 3] }],
    ['neverDo that is not an array', { ...valid, neverDo: null }],
    ['a non-string never-do item', { ...valid, neverDo: [{}] }],
  ])('rejects %s', (_, value) => {
    expect(isScamCheckResult(value)).toBe(false);
  });

  describe('stays in step with what scoreScamSignals returns', () => {
    const allIds = Object.keys(SIGNALS) as SignalId[];

    it.each<[string, SignalId[]]>([
      ['no signals', []],
      ['one low signal', ['urgency']],
      ['two low signals', ['urgency', 'generic_praise']],
      ['one high signal', ['overpayment_or_refund']],
      ['the overpayment never-do', ['overpayment_or_refund']],
      ['the code-request never-do', ['code_or_credentials_request']],
      ['the fee never-do', ['crypto_or_fee_to_receive']],
      ['the payment-link never-do', ['payment_link']],
      ['a mix reaching "many"', ['overpayment_or_refund', 'urgency', 'generic_praise']],
      ['every signal at once', allIds],
    ])('for %s', (_, ids) => {
      const result = scoreScamSignals(signals(...ids), MESSAGE);

      expect(isScamCheckResult(result)).toBe(true);
    });

    it('for signals the model invented and evidence that is not in the message', () => {
      const result = scoreScamSignals(
        [{ id: 'urgency', evidence: 'not in the message' }],
        MESSAGE,
      );

      expect(isScamCheckResult(result)).toBe(true);
    });

    it('for an empty message', () => {
      expect(isScamCheckResult(scoreScamSignals(signals('urgency'), ''))).toBe(true);
    });
  });
});

describe('createCheckScamSignalsTool', () => {
  const options = { toolCallId: 'test-call', messages: [], context: {} };

  it('scores against the client message passed in through the closure', async () => {
    const checkScamSignals = createCheckScamSignalsTool({
      clientMessage: MESSAGE,
    });

    const result = await checkScamSignals.execute?.(
      { signals: signals('overpayment_or_refund') },
      options,
    );

    expect(result).toEqual(
      scoreScamSignals(signals('overpayment_or_refund'), MESSAGE),
    );
  });

  it('returns a result the card must reject when the review flag asks for one', async () => {
    const checkScamSignals = createCheckScamSignalsTool({
      clientMessage: MESSAGE,
      simulateBadResult: true,
    });

    const result = await checkScamSignals.execute?.(
      { signals: signals('urgency') },
      options,
    );

    expect(isScamCheckResult(result)).toBe(false);
  });

  it('throws a clear error when the review flag asks it to fail', async () => {
    const checkScamSignals = createCheckScamSignalsTool({
      clientMessage: MESSAGE,
      simulateError: true,
    });

    await expect(
      Promise.resolve(checkScamSignals.execute?.({ signals: [] }, options)),
    ).rejects.toThrow(/simulateToolError/);
  });
});
