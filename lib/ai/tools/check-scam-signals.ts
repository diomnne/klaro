import {
  tool,
  type StreamTextTransform,
  type TextStreamPart,
  type ToolSet,
} from 'ai';
import { z } from 'zod';

/**
 * Patterns common in scams aimed at artists. The check reports which ones a
 * client's message shows. It never decides whether the message is a scam:
 * every one of these also turns up in genuine commissions.
 */
export const SIGNAL_IDS = [
  'sentimental_hook_no_direction',
  'generic_praise',
  'accepts_any_price',
  'overpayment_or_refund',
  'unusual_payment_method',
  'code_or_credentials_request',
  'cannot_talk_normally',
  'urgency',
  'move_off_platform',
  'crypto_or_fee_to_receive',
  'payment_link',
] as const;

export type SignalId = (typeof SIGNAL_IDS)[number];

type SignalDefinition = {
  /**
   * High-weight signals are the ones where acting on the request is what loses
   * the artist money or an account, rather than just being a reason to slow down.
   */
  weight: 'high' | 'low';
  /** What qualifies, written for the model. */
  criteria: string;
  /** What the artist sees. Plain and non-accusatory: it describes the message, not the client. */
  label: string;
  explanation: string;
};

export const SIGNALS: Record<SignalId, SignalDefinition> = {
  sentimental_hook_no_direction: {
    weight: 'low',
    criteria:
      'Only when the whole message tells an emotional story (a birthday, an illness, a late relative, a surprise for a loved one) and gives nothing about the piece itself. If anywhere in the message the client mentions a photo, a picture, a reference, or any specific detail of the piece (who or what it shows, the pose, the style, the format), do not use this signal.',
    label: 'Personal story, few art details',
    explanation:
      'The message leans on a personal story but says little about the piece itself. Clients who know what they want usually share references or details early on.',
  },
  generic_praise: {
    weight: 'low',
    criteria:
      'Only when the evidence quote itself is a compliment about the artist\'s work or style, and one that could be sent to any artist ("your art is amazing", "I love your page"). If the quote does not praise the art, do not use this signal. Saying how or where the client found the artist ("I found you through Instagram", "saw your page") is not praise.',
    label: 'Praise that could fit any artist',
    explanation:
      "Compliments that don't mention anything specific about your work can be copied and sent to many artists at once.",
  },
  accepts_any_price: {
    weight: 'low',
    criteria:
      'Agrees to any price, or to pay "whatever it costs", before a rate or the scope has been discussed.',
    label: 'Agrees to any price',
    explanation:
      'Saying yes to any amount before hearing your rate skips the usual back-and-forth about scope and price.',
  },
  overpayment_or_refund: {
    weight: 'high',
    criteria:
      'Offers or sends more than the agreed amount, or asks the artist to send back, refund, or forward part of a payment.',
    label: 'Overpayment or refund request',
    explanation:
      "Paying more than the price and asking you to send back the difference is a common setup. The original payment can bounce or be reversed after you've sent yours.",
  },
  unusual_payment_method: {
    weight: 'low',
    criteria:
      'Wants to pay in a way that is hard to verify: a cheque, a "pending" or "processing" transfer, or a payment from a third party.',
    label: 'Unusual way to pay',
    explanation:
      'A cheque, a "pending" transfer, or a payment from someone else is harder to verify and easier to reverse than your usual payment method.',
  },
  code_or_credentials_request: {
    weight: 'high',
    criteria:
      'Asks the artist for a code, OTP, PIN, password, or login sent to their phone or email, or for access to any of their accounts.',
    label: 'Asks for a code or login',
    explanation:
      'A client never needs a code, PIN, or password from you to pay you. Those codes unlock your accounts.',
  },
  cannot_talk_normally: {
    weight: 'low',
    criteria:
      'Says they can only communicate one way (only text, only email, no calls or voice notes), often with a reason like being deaf, at sea, or in hospital.',
    label: 'Can only talk one way',
    explanation:
      "Plenty of genuine clients can't take calls. On its own this means little, but alongside other signals it makes their story harder to check.",
  },
  urgency: {
    weight: 'low',
    criteria:
      'Pressure to decide, reply, or start quickly ("ASAP", "today only", "I need an answer now").',
    label: 'Pressure to hurry',
    explanation:
      'Tight deadlines are often real, but pressure to decide quickly also makes it easier to skip checks.',
  },
  move_off_platform: {
    weight: 'low',
    criteria:
      'Asks to continue the conversation somewhere else: email, WhatsApp, or a personal number. Links are not this signal.',
    label: 'Wants to move to another app',
    explanation:
      "Moving to another app or a personal number early leaves the platform's records and reporting tools behind.",
  },
  crypto_or_fee_to_receive: {
    weight: 'high',
    criteria:
      'Says the artist must pay a fee, tax, or charge before they can receive the payment, or wants to pay in crypto.',
    label: 'Fee or crypto to receive payment',
    explanation:
      'Being asked to pay something before you can receive money reverses how payment works. Crypto payments are also hard to trace or reverse.',
  },
  payment_link: {
    weight: 'high',
    criteria:
      'Sends a link to confirm, claim, release, or verify a payment, or asks the artist to log in or enter details to receive money. Not a link to references or their own portfolio.',
    label: 'Link to receive payment',
    explanation:
      'Real payments show up in your account on their own. You never need to click a link or enter details to receive money.',
  },
};

const POINTS = { high: 3, low: 1 } as const;

/** Always the first safe step: a screenshot or a "payment sent" email proves nothing. */
export const PAYMENT_SAFE_STEP =
  "Don't start until payment shows in your actual account balance, not a screenshot or email.";

/**
 * Added after the payment step when any of their signals were found, in this
 * order. Only at "some" and "many": at "few" the card stays quiet.
 */
const SAFE_STEPS: Array<{ step: string; when: SignalId[] }> = [
  {
    step: 'Ask to be paid the exact amount you quoted, through a method you already use.',
    when: ['overpayment_or_refund', 'unusual_payment_method'],
  },
  {
    step: 'Ask for references and specific details before you confirm the price.',
    when: [
      'sentimental_hook_no_direction',
      'generic_praise',
      'accepts_any_price',
    ],
  },
  {
    step: 'Keep the conversation on the platform where it started until payment is settled.',
    when: ['move_off_platform'],
  },
  {
    step: 'Take the time you need to check. A genuine client can usually wait a day.',
    when: ['urgency'],
  },
  {
    step: "If you already shared a code, change that account's password and contact the provider right away.",
    when: ['code_or_credentials_request'],
  },
];

/** Shown whenever their signal is found, whatever the level: these are the moves that lose money. */
const NEVER_DO: Array<{ item: string; when: SignalId }> = [
  {
    item: 'Never refund an overpayment, even if the extra money seems to have arrived.',
    when: 'overpayment_or_refund',
  },
  {
    item: 'Never share an OTP, PIN or login code, with anyone, for any reason.',
    when: 'code_or_credentials_request',
  },
  {
    item: 'Never pay a fee to receive money.',
    when: 'crypto_or_fee_to_receive',
  },
  {
    item: 'Never log in or enter details through a link someone sent to pay you.',
    when: 'payment_link',
  },
];

export type ScamCheckLevel = 'few' | 'some' | 'many';

export type ScamCheckSignal = {
  id: SignalId;
  label: string;
  evidence: string;
  explanation: string;
};

export type ScamCheckResult = {
  level: ScamCheckLevel;
  signals: ScamCheckSignal[];
  safeSteps: string[];
  neverDo: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Whether a value really is a scam-check result. The card trusts this instead
 * of the type: a result can come from a saved transcript, an older version of
 * the app, or a tool that misbehaved, and rendering a malformed one would crash
 * the chat. Extra fields are allowed; a missing or mistyped one is not.
 */
export function isScamCheckResult(value: unknown): value is ScamCheckResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { level, signals, safeSteps, neverDo } = value as Record<string, unknown>;

  return (
    (level === 'few' || level === 'some' || level === 'many') &&
    Array.isArray(signals) &&
    signals.every((signal) => {
      if (typeof signal !== 'object' || signal === null) {
        return false;
      }

      const { id, label, evidence, explanation } = signal as Record<
        string,
        unknown
      >;

      return (
        typeof id === 'string' &&
        (SIGNAL_IDS as readonly string[]).includes(id) &&
        typeof label === 'string' &&
        typeof evidence === 'string' &&
        typeof explanation === 'string'
      );
    }) &&
    isStringArray(safeSteps) &&
    isStringArray(neverDo)
  );
}

/**
 * Two low signals stay "few": gift commissions with generic praise are common
 * and shouldn't be flagged. One high signal alone is "some".
 */
function levelFor(score: number): ScamCheckLevel {
  if (score <= 2) {
    return 'few';
  }

  return score <= 4 ? 'some' : 'many';
}

const QUOTE_MARKS = /^["'‘’“”]+|["'‘’“”]+$/g;

/** Models often wrap a quote in quote marks or pad it; neither is part of the evidence. */
function cleanEvidence(evidence: string): string {
  return evidence.trim().replace(QUOTE_MARKS, '').trim();
}

/** Copying a quote can change case, spacing and quote style without changing what was said. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const PRAISE_ADJECTIVES = new Set([
  'amazing',
  'beautiful',
  'gorgeous',
  'stunning',
  'talented',
  'incredible',
  'awesome',
  'fantastic',
  'impressive',
  'wonderful',
  'great',
]);

/** What a compliment is about: the art, or the artist. */
const PRAISE_SUBJECTS = new Set([
  'art',
  'artwork',
  'work',
  'works',
  'style',
  'drawing',
  'drawings',
  'illustration',
  'illustrations',
  'portfolio',
  'you',
  'artist',
]);

/** How far apart (in words) a praise adjective and its subject may be: "your art is beautiful". */
const PRAISE_WINDOW = 4;

/** love/like/adore/admire, then "your" or "ur" within two words: "I love your art style". */
const PRAISE_VERB_YOUR =
  /\b(?:love|loved|like|liked|adore|adored|admire|admired)\b(?:\s+\S+){0,2}?\s+(?:your|ur)\b/;

/** ganda, galing and husay, also with the ma- prefix (maganda, magaling, mahusay). */
const TAGALOG_PRAISE = /\b(?:ma)?(?:ganda|galing|husay)\b/;

/**
 * Whether a quote is a compliment about the artist or their work. How the
 * client found the artist ("I found you through your Instagram") and what they
 * want ("I'd love a portrait based on an old photo") are not.
 */
function isCompliment(evidence: string): boolean {
  const text = normalize(evidence);

  if (PRAISE_VERB_YOUR.test(text) || TAGALOG_PRAISE.test(text)) {
    return true;
  }

  const words = text.split(/[^a-z']+/).filter(Boolean);

  return words.some(
    (word, i) =>
      PRAISE_ADJECTIVES.has(word) &&
      words.some(
        (other, j) =>
          PRAISE_SUBJECTS.has(other) && Math.abs(i - j) <= PRAISE_WINDOW,
      ),
  );
}

/**
 * Words that show the client has said something about the piece itself: a
 * photo or reference, a framing, or a medium.
 */
const PIECE_DIRECTION =
  /\b(?:photos?|pictures?|pics?|references?|refs?|ref sheets?|half[- ]?body|full[- ]?body|bust|headshot|chibi|digital|traditional|watercolou?r)\b/;

/**
 * Extra checks run in code on top of the model's judgement. Each one gets the
 * model's quote and the whole client message, and returns false to drop the
 * signal. They only ever drop: nothing here adds a signal or changes a weight.
 */
export const SIGNAL_GUARDS: Partial<
  Record<SignalId, (evidence: string, clientMessage: string) => boolean>
> = {
  generic_praise: (evidence) => isCompliment(evidence),
  // Judged on the whole message, not just the quote: a story that also says
  // what to draw isn't a story with no direction.
  sentimental_hook_no_direction: (_evidence, clientMessage) =>
    !PIECE_DIRECTION.test(normalize(clientMessage)),
};

/**
 * Turns the model's extracted signals into the result the artist sees. Every
 * signal must quote the client's message: one whose evidence isn't found there
 * is dropped, so the model can't report a pattern it imagined. Signals with a
 * guard must also pass it.
 */
export function scoreScamSignals(
  signals: ReadonlyArray<{ id: SignalId; evidence: string }>,
  clientMessage: string,
): ScamCheckResult {
  const message = normalize(clientMessage);
  const verified = new Map<SignalId, string>();

  for (const { id, evidence } of signals) {
    const quote = cleanEvidence(evidence);

    // An empty quote is "found" in any message, so it proves nothing.
    if (quote === '' || !message.includes(normalize(quote))) {
      continue;
    }

    // Before the id dedupe: a rejected quote mustn't use up the id, or it
    // would block a later valid quote for the same signal.
    if (SIGNAL_GUARDS[id]?.(quote, clientMessage) === false) {
      continue;
    }

    if (verified.has(id)) {
      continue;
    }

    verified.set(id, quote);
  }

  // One quote, one signal: the same words filed under two patterns would be
  // counted twice. The higher-weight pattern keeps the quote, since it's the
  // one that carries a never-do warning; on a tie, the first one does.
  const byQuote = new Map<string, { id: SignalId; quote: string }>();

  for (const [id, quote] of verified) {
    const key = normalize(quote);
    const kept = byQuote.get(key);

    if (!kept || POINTS[SIGNALS[id].weight] > POINTS[SIGNALS[kept.id].weight]) {
      byQuote.set(key, { id, quote });
    }
  }

  const found = [...byQuote.values()];
  const foundIds = new Set(found.map(({ id }) => id));
  const level = levelFor(
    found.reduce((total, { id }) => total + POINTS[SIGNALS[id].weight], 0),
  );

  return {
    level,
    signals: found.map(({ id, quote }) => ({
      id,
      label: SIGNALS[id].label,
      evidence: quote,
      explanation: SIGNALS[id].explanation,
    })),
    safeSteps: [
      PAYMENT_SAFE_STEP,
      ...(level === 'few'
        ? []
        : SAFE_STEPS.filter(({ when }) => when.some((id) => foundIds.has(id))).map(
            ({ step }) => step,
          )),
    ],
    // Never filtered by level: these are the moves that lose money.
    neverDo: NEVER_DO.filter(({ when }) => foundIds.has(when)).map(
      ({ item }) => item,
    ),
  };
}

/**
 * Fixes the two ways Gemini has broken this schema, either of which fails
 * validation and loses the whole check. `strict` mode should prevent both;
 * this is the fallback if a model update stops honoring it.
 *
 * - `evidence` sent as a list of quotes: split into one entry per quote. The
 *   evidence check and dedupe in `scoreScamSignals` then keep the first quote
 *   that is actually in the message.
 * - An `id` outside the enum (e.g. `unusual_pay_method`): dropped, the same as
 *   the model not reporting it.
 *
 * Any other shape comes back unchanged, so it still fails validation as before.
 */
export function repairSignalsInput(input: unknown): unknown {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('signals' in input) ||
    !Array.isArray(input.signals)
  ) {
    return input;
  }

  return {
    ...input,
    signals: input.signals
      .flatMap((signal: unknown) =>
        typeof signal === 'object' &&
        signal !== null &&
        'evidence' in signal &&
        Array.isArray(signal.evidence)
          ? signal.evidence.map((evidence: unknown) => ({ ...signal, evidence }))
          : [signal],
      )
      .filter(
        (signal: unknown) =>
          typeof signal !== 'object' ||
          signal === null ||
          !('id' in signal) ||
          (SIGNAL_IDS as readonly unknown[]).includes(signal.id),
      ),
  };
}

const inputSchema = z.object({
  signals: z
    .array(
      z.object({
        id: z
          .enum(SIGNAL_IDS)
          .describe(
            `Which pattern this is:\n${SIGNAL_IDS.map((id) => `- ${id}: ${SIGNALS[id].criteria}`).join('\n')}`,
          ),
        evidence: z
          .string()
          .describe(
            "One short quote as a single string, a few words long, copied exactly from the client's message, that shows this pattern on its own. Read the quote back before using it: for generic_praise it must be a compliment about the art (a quote about how the client found the artist is not), and for sentimental_hook_no_direction the message must not mention a photo, reference or any detail of the piece. Copy placeholders like [phone] or [link: example.com] exactly as they appear.",
          ),
      }),
    )
    .describe(
      "Each pattern the client's message clearly shows, at most once each. Use an empty list when none apply. Don't infer a pattern from tone alone, and when in doubt leave a pattern out: a message that mentions how the client found the artist, a photo, or other details of the piece is an ordinary request, not a pattern.",
    ),
});

/**
 * Built per request so `execute` can check evidence against the message that
 * was actually sent, rather than trusting the model's account of it.
 */
export function createCheckScamSignalsTool({
  clientMessage,
  simulateError = false,
  simulateBadResult = false,
}: {
  /** The text of the most recent user message: the client's DM as the artist pasted it. */
  clientMessage: string;
  /** Set by the `?toolError=1` review flag so the error state can be seen on a live preview. */
  simulateError?: boolean;
  /** Set by `?fail=bad-tool`: returns a result that isn't a ScamCheckResult, so the card's shape check can be seen. */
  simulateBadResult?: boolean;
}) {
  return tool({
    description:
      "Checks a client's message, as pasted by the artist, for patterns common in scams aimed at artists. Reports signals with quoted evidence; it doesn't decide whether the message is a scam. Call it once for each newly pasted client message, before replying.",
    inputSchema,
    // On Gemini this sends function-calling mode VALIDATED, which holds the
    // model to the schema. Without it Gemini Flash-Lite has sent evidence as a
    // list and invented ids outside the enum, failing the whole check.
    strict: true,
    execute: async ({ signals }): Promise<ScamCheckResult> => {
      if (simulateError) {
        throw new Error(
          'Simulated scam-check failure (simulateToolError flag).',
        );
      }

      if (simulateBadResult) {
        // Deliberately the wrong shape in several ways at once.
        return { level: 'catastrophic', signals: 'none found' } as unknown as ScamCheckResult;
      }

      return scoreScamSignals(signals, clientMessage);
    },
  });
}

export type CheckScamSignalsTool = ReturnType<typeof createCheckScamSignalsTool>;

/**
 * Small enough pieces, and long enough pauses, to watch each state of the card
 * by eye.
 */
const REVIEW_PACE = {
  pieceLength: 10,
  pieceDelayMs: 40,
  resultDelayMs: 1500,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * For the `?toolSlow=1` review flag. Gemini sends a tool call's input in one
 * piece and `execute` returns at once, so without this the card's reading and
 * checking states are never on screen long enough to see. This re-chunks the
 * input and holds the result back. Transforms run after tool execution, so the
 * result itself is unchanged.
 */
export function paceForReview<
  TOOLS extends ToolSet,
>(): StreamTextTransform<TOOLS> {
  return () =>
    new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      async transform(part, controller) {
        if (part.type === 'tool-input-delta') {
          for (
            let start = 0;
            start < part.delta.length;
            start += REVIEW_PACE.pieceLength
          ) {
            controller.enqueue({
              ...part,
              delta: part.delta.slice(start, start + REVIEW_PACE.pieceLength),
            });
            await sleep(REVIEW_PACE.pieceDelayMs);
          }

          return;
        }

        if (part.type === 'tool-result' || part.type === 'tool-error') {
          await sleep(REVIEW_PACE.resultDelayMs);
        }

        controller.enqueue(part);
      },
    });
}
