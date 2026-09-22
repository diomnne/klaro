import Link from 'next/link';

/**
 * Decorative preview beneath the hero copy: a mock DM thread, the agreement
 * card it produces, and two floating chips. Everything except the agreement
 * card is hidden from assistive tech and from the tab order — it illustrates
 * the product rather than offering real controls.
 */
function HeroPreview() {
  return (
    <div className="relative mt-12 w-full md:mt-16">
      {/* Soft accent wash behind the preview. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 mx-auto h-64 max-w-2xl rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-center md:gap-8">
        {/* DM thread — decorative illustration of the input side. */}
        <div
          aria-hidden="true"
          className="order-2 w-full max-w-xs shrink-0 md:order-1 md:mb-8 md:w-56"
        >
          <div className="flex flex-col gap-2">
            <p className="max-w-[85%] rounded-bubble rounded-bl-sm bg-card px-3 py-2 text-sm leading-relaxed text-card-foreground ring-1 ring-border">
              hi po! can you draw my OC? need it by end of month ha
            </p>
            <p className="ml-auto max-w-[85%] rounded-bubble rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
              yes! let me write down the details
            </p>
            <p className="max-w-[85%] rounded-bubble rounded-bl-sm bg-card px-3 py-2 text-sm leading-relaxed text-card-foreground ring-1 ring-border">
              sure, thank you!
            </p>
          </div>
        </div>

        {/* Agreement card — the centerpiece. */}
        <div className="hero-rise order-1 w-full max-w-sm rounded-sheet bg-card p-5 shadow-sheet ring-1 ring-border md:order-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-base font-semibold tracking-tight text-card-foreground">
              Agreement
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              Draft
            </span>
          </div>

          <dl className="mt-4 flex flex-col gap-px">
            <HeroTermRow term="Medium" value="Digital illustration" />
            <HeroTermRow term="Revisions" value="2 rounds" />
            <HeroTermRow term="Deadline" value="End of month" />
            <HeroTermRow term="Down payment" value="Not stated" missing />
            <HeroTermRow term="Usage rights" value="Personal use" />
          </dl>
        </div>

        {/* Floating chips — decorative, desktop only. */}
        <div
          aria-hidden="true"
          className="order-3 hidden shrink-0 flex-col gap-3 md:flex md:w-48 md:pb-12"
        >
          <span className="w-fit rounded-full bg-card px-3 py-1.5 text-sm font-medium text-card-foreground ring-1 ring-border">
            Revisions: 2 rounds
          </span>
          <span className="w-fit rounded-full bg-gap px-3 py-1.5 text-sm font-medium text-gap-foreground md:ml-6">
            Missing: delivery method
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroTermRow({
  term,
  value,
  missing = false,
}: {
  term: string;
  value: string;
  missing?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-3 py-2 font-serif text-sm ${
        missing ? 'rounded-sheet bg-gap text-gap-foreground' : ''
      }`}
    >
      <dt className={missing ? 'text-gap-foreground' : 'text-muted-foreground'}>
        {term}
      </dt>
      <dd
        className={
          missing ? 'font-medium' : 'font-medium text-card-foreground'
        }
      >
        {missing ? `${value} — needs review` : value}
      </dd>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="flex flex-col items-center py-12 text-center md:py-16">
      {/* TODO: rewrite */}
      <h1 className="text-headline max-w-3xl font-semibold tracking-tight text-foreground">
        Paste the{' '}
        <span className="inline-block rounded-full border-2 border-primary px-3 pb-0.5">
          DM
        </span>
        . Get it in{' '}
        <span className="underline decoration-primary decoration-4 underline-offset-[0.15em]">
          writing
        </span>
        .
      </h1>

      {/* TODO: rewrite */}
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
        Klaro turns a commission request into a clear written agreement before work
        starts.
      </p>

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Link
          href="/draft"
          className="flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Draft an agreement
        </Link>
        <Link
          href="/about"
          className="flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          How it works
        </Link>
      </div>

      <HeroPreview />
    </section>
  );
}
