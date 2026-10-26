import type { Metadata } from 'next';

import { DiscardDraftDemo } from '@/playground/components/DiscardDraftDemo';
import { Disclosure } from '@/playground/components/Disclosure';
import { Tabs } from '@/playground/components/Tabs';

const AGREEMENT_TERMS: ReadonlyArray<readonly [term: string, value: string]> = [
  ['Commission', 'Half-body digital portrait, one character'],
  ['File', '3000 × 4000 px PNG'],
  ['Revisions', '2 rounds'],
  ['Deadline', 'November 30'],
  ['Fee', '₱3,500'],
  ['Down payment', '50% (₱1,750) before sketching'],
  ['Balance', 'Due before the final file is sent'],
  ['Usage', 'Personal use only'],
];

const AGREEMENT_TABS = [
  {
    id: 'terms',
    label: 'Terms',
    content: (
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        {AGREEMENT_TERMS.map(([term, value]) => (
          <div className="contents" key={term}>
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    id: 'evidence',
    label: 'Evidence checklist',
    content: (
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>Screenshot of the client&rsquo;s original request</li>
        <li>GCash receipt for the ₱1,750 down payment</li>
        <li>Client&rsquo;s written approval of the sketch</li>
        <li>Confirmation that the final file was delivered</li>
      </ul>
    ),
  },
  {
    id: 'client-message',
    label: 'Client message',
    content: (
      <blockquote className="border-l-2 border-border pl-4 italic">
        hi po! can you draw my OC, half body lang? digital is fine. need it by
        end of november for her birthday. i can send refs later. how much po?
      </blockquote>
    ),
  },
];

// Practice page for the accessibility drill. Deliberately left out of the site
// nav, and kept out of search results.
export const metadata: Metadata = {
  title: 'Accessibility playground — Klaro',
  robots: { index: false, follow: false },
};

export default function Playground() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10 sm:px-16">
        <h1 className="text-title font-semibold tracking-tight text-foreground">
          Accessibility playground
        </h1>

        <section aria-labelledby="disclosure-heading" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-foreground" id="disclosure-heading">
            Disclosure
          </h2>
          <Disclosure summary="Down payment is 0%">
            <p>
              With no down payment, you carry all the risk. If the client cancels
              or stops replying after you&rsquo;ve started, nothing covers the
              hours you&rsquo;ve already put in. Many artists ask for part of
              the fee upfront; how much is up to you.
            </p>
            <p className="mt-2">
              This won&rsquo;t block the agreement. You can still go ahead
              without one.
            </p>
          </Disclosure>
        </section>

        <section aria-labelledby="tabs-heading" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-foreground" id="tabs-heading">
            Tabs
          </h2>
          <Tabs label="Agreement" tabs={AGREEMENT_TABS} />
        </section>

        <section aria-labelledby="modal-heading" className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-foreground" id="modal-heading">
            Modal
          </h2>
          <DiscardDraftDemo />
        </section>
      </main>
    </div>
  );
}
