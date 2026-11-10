import {
  PAYMENT_SAFE_STEP,
  SIGNALS,
  type ScamCheckResult,
  type ScamCheckSignal,
  type SignalId,
} from '@/lib/ai/tools/check-scam-signals';

/**
 * Hand-written scam-check results. They only have to be the shape the card
 * reads, so the card's tests don't move when the scoring rules change.
 */

function signal(id: SignalId, evidence: string): ScamCheckSignal {
  return {
    id,
    label: SIGNALS[id].label,
    evidence,
    explanation: SIGNALS[id].explanation,
  };
}

/** One low-weight signal: the card folds it away. */
export const FEW_RESULT: ScamCheckResult = {
  level: 'few',
  signals: [signal('generic_praise', 'your art is amazing')],
  safeSteps: [PAYMENT_SAFE_STEP],
  neverDo: [],
};

export const NEVER_REFUND = 'Never refund an overpayment, even if the extra money seems to have arrived.';
export const NEVER_SHARE_CODE = 'Never share an OTP, PIN or login code, with anyone, for any reason.';

/** The overpayment example's kind of message. */
export const MANY_RESULT: ScamCheckResult = {
  level: 'many',
  signals: [
    signal('overpayment_or_refund', 'you can refund the difference to my shipper'),
    signal('code_or_credentials_request', 'send me the code you receive'),
    signal('urgency', 'I need it within 3 days'),
  ],
  safeSteps: [
    PAYMENT_SAFE_STEP,
    'Ask to be paid the exact amount you quoted, through a method you already use.',
  ],
  neverDo: [NEVER_REFUND, NEVER_SHARE_CODE],
};

/** The tool input that goes with MANY_RESULT. */
export const MANY_INPUT = {
  signals: MANY_RESULT.signals.map(({ id, evidence }) => ({ id, evidence })),
};

/** Not a ScamCheckResult: the shape `?fail=bad-tool` produces. */
export const MALFORMED_RESULT = { level: 'catastrophic', signals: 'none found' };
