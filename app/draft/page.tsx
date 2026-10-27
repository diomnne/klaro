import type { Metadata } from 'next';

import { ChatPanel } from '@/components/draft/chat-panel';
import { FocusComposerButton } from '@/components/draft/focus-composer-button';

export const metadata: Metadata = {
  title: 'Draft an agreement — Klaro',
  description:
    "Paste a client's message and Klaro checks it for common scam patterns before you reply, then talks through the commission's terms with you.",
};

type PlaceholderPanelProps = {
  id: string;
  title: string;
  /** What the panel will show once it's built. */
  willShow: string;
};

/**
 * A panel for something not built yet, said plainly: what it will show, what
 * Klaro does today, and the one thing the artist can do now.
 */
function PlaceholderPanel({ id, title, willShow }: PlaceholderPanelProps) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-h-40 flex-col gap-3 rounded-sheet border border-dashed border-border bg-card p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-card-foreground" id={id}>
          {title}
        </h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          Coming next
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{willShow}</p>
      <p className="text-sm text-muted-foreground">
        For now, Klaro checks a client&rsquo;s message for scam patterns and
        talks through the terms with you in the chat.
      </p>
      <FocusComposerButton />
    </section>
  );
}

export default function Draft() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 sm:px-16">
        {/* TODO: rewrite */}
        <h1 className="text-title font-semibold tracking-tight text-foreground">
          Draft an agreement
        </h1>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <ChatPanel />

          <div className="flex flex-col gap-6">
            <PlaceholderPanel
              id="agreement-card-title"
              title="Agreement card"
              willShow="Will show the terms gathered from your conversation (what's being made, the deadline, revisions, payment and delivery) so you can review and edit them before anything is sent."
            />

            <PlaceholderPanel
              id="evidence-checklist-title"
              title="Evidence checklist"
              willShow="Will list what's worth keeping as a record: the agreed terms, payment confirmations and the client's messages."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
