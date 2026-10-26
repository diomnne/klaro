'use client';

import {
  Ban,
  Check,
  ChevronDown,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';

import { Shimmer } from '@/components/ai-elements/shimmer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { KlaroUIMessage } from '@/lib/ai/klaro';
import {
  SIGNAL_IDS,
  SIGNALS,
  type ScamCheckLevel,
  type ScamCheckResult,
  type ScamCheckSignal,
  type SignalId,
} from '@/lib/ai/tools/check-scam-signals';
import { cn } from '@/lib/utils';

type ScamCheckPart = Extract<
  KlaroUIMessage['parts'][number],
  { type: 'tool-checkScamSignals' }
>;

/**
 * Mid-stream, the input is the model's raw partial JSON: any field can be
 * missing or cut short, and it arrives before the route repairs a list of
 * quotes into single ones (see `repairSignalsInput`).
 */
type PartialSignal = { id?: unknown; evidence?: unknown } | undefined;

type ViewState =
  | { view: 'reading'; signals: PartialSignal[] }
  | { view: 'checking'; signals: Array<{ id: SignalId; evidence: string }> }
  | { view: 'result'; result: ScamCheckResult }
  | { view: 'error' };

const LEVEL_HEADING: Record<ScamCheckLevel, string> = {
  few: 'Nothing major stood out',
  some: 'Some signals worth checking',
  many: 'Many signals worth checking',
};

/**
 * Shown, and announced, when nothing matched. It must not read as reassurance:
 * a message with none of these patterns can still be a scam.
 */
const NO_PATTERNS_NOTE =
  "No common patterns found. That doesn't mean a message is safe, so still wait for payment to show in your actual account.";

/** Segments filled on the meter, so the level reads from shape as well as text. */
const LEVEL_STEPS: Record<ScamCheckLevel, number> = { few: 1, some: 2, many: 3 };

/** Static, so it still helps when the check itself is what failed. */
const MANUAL_CHECKS = [
  'Pays more than your price and asks you to send back the difference.',
  'Asks for a code, OTP, PIN or login sent to your phone or email.',
  'Says you have to pay a fee to receive their payment.',
  'Sends a payment link or "claim" page instead of paying to your account.',
];

const CROSSFADE_SECONDS = 0.2;

function isSignalId(id: unknown): id is SignalId {
  return typeof id === 'string' && (SIGNAL_IDS as readonly string[]).includes(id);
}

/** The quote to show from partial evidence: the string itself, or the first of a list. */
function quoteOf(evidence: unknown): string | null {
  const quote = Array.isArray(evidence) ? evidence[0] : evidence;

  return typeof quote === 'string' && quote !== '' ? quote : null;
}

/** One entry per signal, so a signal quoted twice isn't counted twice. */
function groupBySignal(
  signals: Array<{ id: SignalId; evidence: string }>,
): Map<SignalId, string[]> {
  const groups = new Map<SignalId, string[]>();

  for (const { id, evidence } of signals) {
    groups.set(id, [...(groups.get(id) ?? []), evidence]);
  }

  return groups;
}

/**
 * Which view a part gets. An input state that is no longer streaming was cut
 * off, e.g. a transcript saved mid-stream and restored on reload. That gets the
 * error view rather than a spinner that never resolves.
 */
function viewStateOf(part: ScamCheckPart, isLive: boolean): ViewState {
  switch (part.state) {
    case 'input-streaming':
      return isLive
        ? { view: 'reading', signals: part.input?.signals ?? [] }
        : { view: 'error' };
    case 'input-available':
      return isLive
        ? { view: 'checking', signals: part.input.signals }
        : { view: 'error' };
    case 'output-available':
      return { view: 'result', result: part.output };
    // output-error, plus the approval states, which this tool never enters
    // because it doesn't ask for approval.
    default:
      return { view: 'error' };
  }
}

function resultHeading(result: ScamCheckResult): string {
  return result.signals.length === 0
    ? 'No signals found'
    : LEVEL_HEADING[result.level];
}

/** One sentence per view, so streamed signals never re-trigger an announcement. */
function announcementFor(state: ViewState): string {
  switch (state.view) {
    case 'reading':
      return 'Checking the message for scam signals.';
    case 'checking':
      return 'Checking signals.';
    case 'result':
      return state.result.signals.length === 0
        ? `Scam-signal check finished. ${NO_PATTERNS_NOTE}`
        : `Scam-signal check finished: ${resultHeading(state.result)}.`;
    case 'error':
      return "Couldn't finish the scam-signal check.";
  }
}

function EvidenceQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-2 border-border pl-3 text-sm italic text-card-foreground">
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

function ReadingView({
  signals,
  prefersReducedMotion,
}: {
  signals: PartialSignal[];
  prefersReducedMotion: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-sheet border border-dashed border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <ScanSearch aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        {/* Shimmer animates background-position, which MotionConfig's
            reducedMotion doesn't cover, so swap in still text. */}
        {prefersReducedMotion ? (
          <h3 className="text-sm font-medium text-muted-foreground">
            Reading the message…
          </h3>
        ) : (
          <Shimmer as="h3" className="text-sm font-medium">
            Reading the message…
          </Shimmer>
        )}
      </div>

      {signals.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {signals.map((signal, index) => {
            const quote = quoteOf(signal?.evidence);

            return (
              // Streaming items have nothing stable to key on yet; they only
              // ever append, so the index is stable.
              <li className="flex flex-col gap-1" key={index}>
                <span className="text-xs font-medium text-muted-foreground">
                  {isSignalId(signal?.id) ? SIGNALS[signal.id].label : '…'}
                </span>
                {quote ? <EvidenceQuote>{quote}</EvidenceQuote> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function CheckingView({
  signals,
}: {
  signals: Array<{ id: SignalId; evidence: string }>;
}) {
  const groups = [...groupBySignal(signals)];

  return (
    <div className="flex flex-col gap-3 rounded-sheet border border-border bg-card p-4 shadow-sheet">
      <h3 className="text-sm font-semibold text-card-foreground">
        {groups.length === 0
          ? 'Nothing stood out on a first read'
          : `${groups.length} possible ${groups.length === 1 ? 'signal' : 'signals'}`}
      </h3>

      {groups.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {groups.map(([id, quotes]) => (
            <li className="flex flex-col gap-1.5" key={id}>
              <p className="text-sm font-medium text-card-foreground">
                {SIGNALS[id].label}
              </p>
              {quotes.map((quote, index) => (
                <EvidenceQuote key={index}>{quote}</EvidenceQuote>
              ))}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center gap-2 rounded-sheet border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        {/* The card's own status line announces this state; the spinner's
            built-in role="status" would announce it a second time. */}
        <Spinner aria-hidden="true" role="presentation" />
        Checking…
      </div>
    </div>
  );
}

function LevelMeter({ level }: { level: ScamCheckLevel }) {
  return (
    // Decorative: the heading next to it already states the level in words.
    <div aria-hidden="true" className="flex gap-1">
      {[1, 2, 3].map((step) => (
        <span
          className={cn(
            'h-2 w-6 rounded-full border',
            step <= LEVEL_STEPS[level]
              ? 'border-primary bg-primary'
              : 'border-border bg-muted',
          )}
          key={step}
        />
      ))}
    </div>
  );
}

function SignalList({ signals }: { signals: ScamCheckSignal[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {signals.map((signal) => (
        <li className="flex flex-col gap-1.5" key={signal.id}>
          <p className="text-sm font-medium text-card-foreground">{signal.label}</p>
          <EvidenceQuote>{signal.evidence}</EvidenceQuote>
          <p className="text-sm text-muted-foreground">{signal.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * At "few", the signals are folded away: a genuine gift commission with some
 * generic praise shouldn't open with a list of warnings. Closed by default,
 * including when a saved transcript is restored.
 */
function MinorSignals({ signals }: { signals: ScamCheckSignal[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div className="flex flex-col gap-3">
      <Button
        aria-controls={listId}
        aria-expanded={open}
        className="-ml-2.5 h-11 self-start text-card-foreground sm:h-8"
        onClick={() => setOpen((current) => !current)}
        size="default"
        variant="ghost"
      >
        {signals.length} minor {signals.length === 1 ? 'thing' : 'things'} to note
        <ChevronDown
          aria-hidden="true"
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </Button>
      {/* Kept in the DOM while closed so aria-controls always points at it. */}
      <div hidden={!open} id={listId}>
        <SignalList signals={signals} />
      </div>
    </div>
  );
}

function ResultView({ result }: { result: ScamCheckResult }) {
  const hasSignals = result.signals.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-sheet border border-border bg-card p-4 shadow-sheet">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Scam-signal check
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {resultHeading(result)}
          </h3>
          {hasSignals ? <LevelMeter level={result.level} /> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {hasSignals
            ? "These patterns often show up in scams aimed at artists, and in genuine messages too. They're worth a closer look, not a verdict."
            : NO_PATTERNS_NOTE}
        </p>
      </div>

      {hasSignals && result.level === 'few' ? (
        <MinorSignals signals={result.signals} />
      ) : null}
      {hasSignals && result.level !== 'few' ? (
        <SignalList signals={result.signals} />
      ) : null}

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-card-foreground">Safe steps</h4>
        <ul className="flex flex-col gap-1.5">
          {result.safeSteps.map((step) => (
            <li className="flex gap-2 text-sm text-card-foreground" key={step}>
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              {step}
            </li>
          ))}
        </ul>
      </div>

      {result.neverDo.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-sheet border border-destructive/40 bg-destructive/5 p-3">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <Ban aria-hidden="true" className="size-4 shrink-0" />
            Never do
          </h4>
          <ul className="flex flex-col gap-1.5">
            {result.neverDo.map((item) => (
              <li className="text-sm font-medium text-foreground" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ErrorView({
  onRetry,
  retryDisabled,
}: {
  onRetry?: () => void;
  retryDisabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-sheet border border-destructive/40 bg-destructive/5 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-destructive" />
        Couldn&rsquo;t finish the check
      </h3>
      <p className="text-sm text-muted-foreground">
        You can still check the message yourself. Take a closer look if the
        client:
      </p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground">
        {MANUAL_CHECKS.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
      {/* Only offered on the latest turn: regenerate() reruns the last
          assistant message, which on an older card would be a different one. */}
      {onRetry ? (
        <Button
          className="h-11 self-start sm:h-8"
          disabled={retryDisabled}
          onClick={onRetry}
          size="default"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function FadeLayer({ children, duration }: { children: ReactNode; duration: number }) {
  // The outgoing view stays mounted while it fades. Inert keeps its Retry
  // button out of the tab order and its text away from screen readers.
  const isPresent = useIsPresent();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="col-start-1 row-start-1"
      exit={{ opacity: 0 }}
      inert={!isPresent}
      initial={{ opacity: 0 }}
      transition={{ duration, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

type ScamCheckCardProps = {
  part: ScamCheckPart;
  /** Whether this part's message is still streaming, so an input state is in progress rather than cut off. */
  isLive: boolean;
  onRetry?: () => void;
  retryDisabled?: boolean;
};

/**
 * The scam-signal check as one card whose content crossfades between states:
 * reading the message, checking the extracted signals, the result, or a
 * fallback when the check couldn't finish.
 */
export function ScamCheckCard({
  part,
  isLive,
  onRetry,
  retryDisabled = false,
}: ScamCheckCardProps) {
  // MotionConfig's reducedMotion only covers transforms, not opacity.
  const prefersReducedMotion = usePrefersReducedMotion();
  const state = viewStateOf(part, isLive);

  let content: ReactNode;

  switch (state.view) {
    case 'reading':
      content = (
        <ReadingView
          prefersReducedMotion={prefersReducedMotion}
          signals={state.signals}
        />
      );
      break;
    case 'checking':
      content = <CheckingView signals={state.signals} />;
      break;
    case 'result':
      content = <ResultView result={state.result} />;
      break;
    case 'error':
      content = <ErrorView onRetry={onRetry} retryDisabled={retryDisabled} />;
      break;
  }

  return (
    <section aria-label="Scam-signal check" className="flex w-full flex-col">
      <p className="sr-only" role="status">
        {announcementFor(state)}
      </p>
      {/* Both views share one grid cell while they crossfade, so the outgoing
          one doesn't push the incoming one down. */}
      <div className="grid">
        <AnimatePresence initial={false}>
          <FadeLayer
            duration={prefersReducedMotion ? 0 : CROSSFADE_SECONDS}
            key={state.view}
          >
            {content}
          </FadeLayer>
        </AnimatePresence>
      </div>
    </section>
  );
}
