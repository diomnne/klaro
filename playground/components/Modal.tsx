'use client';

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useSyncExternalStore,
  type JSX,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  /** Called on Escape. The caller owns `open`, so it decides what closing means. */
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title: string;
  /** Visible message; also the dialog's accessible description. */
  description?: ReactNode;
  /** Usually the action buttons. */
  children: ReactNode;
  /** Focused on open. Defaults to the first focusable element in the dialog. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Focused on close. Defaults to whatever had focus when the dialog opened. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const TABBABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Elements Tab can reach inside `container`, in document order. */
function getTabbable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    // tabIndex < 0 is focusable by script but skipped by Tab; no client rects
    // means it isn't rendered (display: none, or inside `hidden`).
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
}

const subscribeToNothing = (): (() => void) => () => {};

/** False during SSR and hydration, true after; `document` exists only then. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/**
 * APG Dialog (Modal) pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  initialFocusRef,
  returnFocusRef,
}: ModalProps): JSX.Element | null {
  const isClient = useIsClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Reads the latest onClose without re-running the open/close effect below
  // every time the parent re-renders with a new function.
  const handleKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    // The focus trap. `inert` already keeps focus off the page behind, but
    // without this, Tab past the last button would leave for the browser's
    // own toolbar instead of wrapping.
    const tabbable = getTabbable(dialog);
    const first = tabbable[0];
    const last = tabbable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const active = document.activeElement;
    // Focus can sit on the dialog container itself (tabIndex -1) or, in
    // unusual cases, outside it; either way, Tab re-enters at the right end.
    const lostFocus = active === dialog || !dialog.contains(active);

    if (event.shiftKey && (active === first || lostFocus)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || lostFocus)) {
      event.preventDefault();
      first.focus();
    }
  });

  useEffect(() => {
    const root = rootRef.current;
    const dialog = dialogRef.current;
    if (!open || !root || !dialog) return;

    // Captured before focus moves into the dialog. Prefer the explicit ref:
    // Safari doesn't focus a button when it's clicked, so activeElement would
    // be <body> and focus would have nowhere to return to.
    const returnTarget =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    // Make everything behind the dialog unreachable: no focus, no clicks, and
    // hidden from screen readers. The dialog is portaled to <body>, so that
    // means every other child of <body>. Elements that were already inert are
    // left alone so we don't un-inert them on close.
    const madeInert: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (child !== root && child instanceof HTMLElement && !child.inert) {
        child.inert = true;
        madeInert.push(child);
      }
    }

    // Lock page scroll. Hiding the scrollbar would widen the page and shift
    // the content behind the dialog, so pad by the scrollbar's width.
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    (initialFocusRef?.current ?? getTabbable(dialog)[0] ?? dialog).focus();

    // On document rather than the dialog, so Escape still works if focus ends
    // up somewhere unexpected.
    const onKeyDown = (event: KeyboardEvent): void => handleKeyDown(event);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      for (const element of madeInert) {
        element.inert = false;
      }
      // Must come after removing `inert`: an inert element can't take focus.
      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }
    };
  }, [open, isClient, initialFocusRef, returnFocusRef]);

  if (!open || !isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      ref={rootRef}
    >
      {/* Backdrop. preventDefault on mousedown stops a click here from moving
          focus to <body>, outside the dialog. It deliberately doesn't close
          the dialog: the pattern doesn't require it, and an accidental click
          shouldn't dismiss a destructive confirmation. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/40"
        onMouseDown={(event) => event.preventDefault()}
      />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-sm rounded-sheet bg-card p-6 shadow-sheet"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2
          className="font-serif text-lg font-semibold text-card-foreground"
          id={titleId}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
