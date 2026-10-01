import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Klaro',
  description: 'What Klaro does, what it doesn’t do, and what happens to your chat.',
};

export default function About() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10 sm:px-16">
        <h1 className="text-title font-semibold tracking-tight text-foreground">
          About Klaro
        </h1>

        {/* TODO: rewrite */}
        <section aria-labelledby="what-it-does" className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-foreground" id="what-it-does">
            What Klaro does
          </h2>
          <p className="font-serif text-base text-muted-foreground">
            Klaro turns a client&rsquo;s request into a clear written agreement and an evidence
            checklist before work starts.
          </p>
        </section>

        {/* TODO: rewrite */}
        <section aria-labelledby="what-it-doesnt-do" className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-foreground" id="what-it-doesnt-do">
            What it doesn&rsquo;t do
          </h2>
          <p className="font-serif text-base text-muted-foreground">
            It is not a contract: it has no legal enforceability and no e-signatures. It never
            prices or values anything. It doesn&rsquo;t process payments.
          </p>
        </section>

        {/* TODO: revisit if we move to a paid tier */}
        <section aria-labelledby="what-happens-to-your-chat" className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-foreground" id="what-happens-to-your-chat">
            What happens to your chat
          </h2>
          <p className="font-serif text-base text-muted-foreground">
            Pasted text is sent to Google&rsquo;s Gemini API to be processed. Klaro uses
            Gemini&rsquo;s free tier, and Google&rsquo;s terms allow free-tier prompts to be used to
            improve its products for users outside the EU, UK, and Switzerland &mdash; the
            Philippines isn&rsquo;t covered by that exception. Leave out anything you wouldn&rsquo;t
            want stored elsewhere, like the client&rsquo;s address, phone number, or payment
            details. Drafts themselves are saved in your browser only.
          </p>
        </section>
      </main>
    </div>
  );
}
