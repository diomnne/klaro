'use client';

import { Hourglass, TriangleAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { ChatErrorKind } from '@/lib/errors';
import { cn } from '@/lib/utils';

/** The notice kinds: every classified error, plus a reply that is still waiting. */
export type ChatNoticeKind = ChatErrorKind | 'stalled';

type NoticeCopy = {
  title: string;
  body: string;
  /** The retry button's label before it's pressed. Absent when retrying can't help. */
  retryLabel?: string;
  tone: 'muted' | 'destructive';
  icon: ReactNode;
};

const ICON_CLASS = 'size-4 shrink-0';

const NOTICE_COPY: Record<ChatNoticeKind, NoticeCopy> = {
  offline: {
    title: "Can't reach Klaro",
    body: 'Check your connection. Your draft is saved in this browser.',
    retryLabel: 'Try this message again',
    tone: 'muted',
    icon: <WifiOff aria-hidden="true" className={ICON_CLASS} />,
  },
  rate_limited: {
    title: 'Klaro is busy right now',
    body: 'The free AI service hit its limit. Try again in about a minute.',
    retryLabel: 'Retry',
    tone: 'muted',
    icon: <Hourglass aria-hidden="true" className={ICON_CLASS} />,
  },
  overloaded: {
    title: 'The AI service is overloaded',
    body: 'Nothing was lost.',
    retryLabel: 'Retry',
    tone: 'muted',
    icon: <Hourglass aria-hidden="true" className={ICON_CLASS} />,
  },
  interrupted: {
    title: 'The reply was cut off',
    body: 'What arrived is above. Retrying sends your last message again.',
    retryLabel: 'Retry',
    tone: 'destructive',
    icon: <TriangleAlert aria-hidden="true" className={ICON_CLASS} />,
  },
  blocked: {
    title: 'No reply this time',
    body: "The AI service wouldn't answer that message. Try describing the request in your own words.",
    retryLabel: 'Retry',
    tone: 'destructive',
    icon: <TriangleAlert aria-hidden="true" className={ICON_CLASS} />,
  },
  too_long: {
    title: 'That message is too long',
    body: 'Messages can be up to 8,000 characters. Shorten it and send it again.',
    tone: 'destructive',
    icon: <TriangleAlert aria-hidden="true" className={ICON_CLASS} />,
  },
  unknown: {
    title: 'Something went wrong',
    body: 'Your draft is saved.',
    retryLabel: 'Retry',
    tone: 'destructive',
    icon: <TriangleAlert aria-hidden="true" className={ICON_CLASS} />,
  },
  stalled: {
    title: 'This is taking a while',
    body: "The AI service hasn't answered yet. You can keep waiting, or stop and try again.",
    tone: 'muted',
    icon: <Hourglass aria-hidden="true" className={ICON_CLASS} />,
  },
};

/** What a reply restored from a saved draft says: it was cut off by closing the page, not by an error. */
const RESTORED_COPY = {
  title: 'This reply was interrupted',
  body: 'It was cut off before it finished. Retrying sends your last message again.',
};

type ChatErrorNoticeProps = {
  kind: ChatNoticeKind;
  /** The interrupted reply came back from a saved draft rather than from this session. */
  restored?: boolean;
  /** The browser is offline right now. */
  offline?: boolean;
  /** Whole seconds before Retry may be pressed. */
  cooldown?: number;
  /** A retry is in flight. */
  retrying: boolean;
  onRetry: () => void;
  onStop: () => void;
};

/**
 * The one notice under the transcript when something goes wrong. Only the title
 * and body are in the alert region, so they're announced once: the button's
 * state, and any countdown, change without announcing again. Calm on purpose:
 * muted for the failures that fix themselves, a light destructive tint for the
 * rest, and nothing animates under reduced motion.
 */
export function ChatErrorNotice({
  kind,
  restored = false,
  offline = false,
  cooldown = 0,
  retrying,
  onRetry,
  onStop,
}: ChatErrorNoticeProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const copy = NOTICE_COPY[kind];

  const title = restored && kind === 'interrupted' ? RESTORED_COPY.title : copy.title;
  const body = restored && kind === 'interrupted' ? RESTORED_COPY.body : copy.body;
  const alsoOffline = offline && kind === 'interrupted';
  const coolingDown = cooldown > 0;

  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-sheet border p-4',
        copy.tone === 'destructive'
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-border bg-muted/40',
        !prefersReducedMotion && 'animate-in fade-in-0 duration-200',
      )}
      data-notice={kind}
    >
      <div className="flex flex-col gap-1" role="alert">
        <h3
          className={cn(
            'flex items-center gap-2 text-sm font-semibold text-foreground',
          )}
        >
          <span className={copy.tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}>
            {copy.icon}
          </span>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {body}
          {alsoOffline ? ' You also appear to be offline.' : ''}
        </p>
      </div>

      {kind === 'stalled' ? (
        <Button className="h-11 sm:h-8" onClick={onStop} size="default" type="button">
          Stop
        </Button>
      ) : copy.retryLabel ? (
        <Button
          aria-busy={retrying}
          className="h-11 sm:h-8"
          disabled={retrying || coolingDown}
          onClick={onRetry}
          size="default"
          type="button"
          variant="outline"
        >
          {retrying ? (
            <>
              <Spinner aria-hidden="true" role="presentation" />
              Retrying…
            </>
          ) : coolingDown ? (
            <>
              <span aria-hidden="true">Retry in {cooldown}s</span>
              <span className="sr-only">Retry, available in a moment</span>
            </>
          ) : (
            copy.retryLabel
          )}
        </Button>
      ) : null}
    </div>
  );
}
