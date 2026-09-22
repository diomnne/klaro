import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Draft an agreement — Klaro',
  description:
    'Paste a commission request and turn it into a clear written agreement.',
};

export default function Draft() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 sm:px-16">
        {/* TODO: rewrite */}
        <h1 className="text-title font-semibold tracking-tight text-foreground">
          Draft an agreement
        </h1>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Placeholder: chat */}
          <section
            aria-label="Chat"
            className="flex min-h-40 flex-col rounded-sheet border border-dashed border-border bg-card p-6"
          >
            <h2 className="text-sm font-medium text-muted-foreground">
              Chat
            </h2>
          </section>

          <div className="flex flex-col gap-6">
            {/* Placeholder: agreement card */}
            <section
              aria-label="Agreement card"
              className="flex min-h-40 flex-col rounded-sheet border border-dashed border-border bg-card p-6"
            >
              <h2 className="text-sm font-medium text-muted-foreground">
                Agreement card
              </h2>
            </section>

            {/* Placeholder: evidence checklist */}
            <section
              aria-label="Evidence checklist"
              className="flex min-h-40 flex-col rounded-sheet border border-dashed border-border bg-card p-6"
            >
              <h2 className="text-sm font-medium text-muted-foreground">
                Evidence checklist
              </h2>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
