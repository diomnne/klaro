# Klaro

An AI tool for independent visual artists in the Philippines that reads a client's commission DM before you reply. Klaro checks the message for common scam patterns aimed at artists, then helps turn a genuine request into a clear written agreement that protects both the artist and the client. It documents terms. It never prices or judges a commission, and it isn't a legally binding contract.

> **Status: alpha.** The streaming chat and the scam-signal check are live. Agreement extraction, the completeness check, and the agreement card are in progress.

## Live Demo

**[use-klaro.vercel.app](https://use-klaro.vercel.app)** · the tool itself is at [/draft](https://use-klaro.vercel.app/draft)

_Screenshot coming once the agreement card is built._

Try pasting a client DM, for example:

```
Hello, I saw your amazing work and I'd love a portrait of my late dog as a surprise for my daughter's birthday. Money is not a problem. I'll send a check for $1,500 and you can refund the extra to my shipper. Please reply by email only. Need it in 3 days.
```

## Quickstart

Requires [Node.js](https://nodejs.org/) 22 or later.

```bash
git clone https://github.com/diomnne/klaro.git
cd klaro
npm install
cp .env.local.example .env.local   # then add your API key
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run the unit tests (Vitest) |

## Usage

**Pages**

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, a "how it works" summary, and a link to `/draft`. |
| `/draft` | Draft an agreement | The main interface. Paste a client's DM or describe the request; Klaro checks it for scam signals, then chats with you about the commission. |
| `/about` | About | What Klaro does, what it doesn't do, and what happens to a pasted chat. |
| `/api/chat` | AI endpoint | Streams Gemini responses through the Vercel AI SDK and runs Klaro's server-side tools. |
| `/health` | System health | Renders the status returned by `/api/health`. |
| `/api/health` | Health check | Reports app status and whether the Gemini API key is configured. |

**The Klaro workflow**

1. **Paste.** The artist pastes a client's message (Messenger, Instagram, Discord, X) or describes the request in their own words. Phone numbers, emails, codes, account numbers and link paths are redacted in the browser before anything is sent.
2. **Scam check.** Klaro looks for common scam patterns aimed at artists (overpayment and refund requests, requests for codes, fees to receive money, and similar) and shows the result as a card: what it found, the exact quote it found it in, safe next steps, and things never to do. It reports signals, never a verdict.
3. **Gap check** _(in progress)_. For a genuine request, Klaro extracts the terms (deliverables, deadline, revisions, payment, delivery, usage rights) and asks about anything missing. Risky or missing terms, like no down payment, are flagged as warnings and never block the artist from continuing.
4. **Verification** _(in progress)_. The terms fill an editable agreement card. The artist corrects anything the AI got wrong and finalizes it.
5. **Handoff** _(in progress)_. The artist copies the agreement and sends it to the client in the same chat, and keeps the evidence checklist.

Drafts are saved in the browser, so a refresh doesn't lose the conversation.

## Tools

### `checkScamSignals`

Runs once when the artist pastes a new client message, before Klaro replies.

**Input** (Zod schema, filled in by the model):

```ts
{
  signals: Array<{
    id:
      | "sentimental_hook_no_direction"
      | "generic_praise"
      | "accepts_any_price"
      | "overpayment_or_refund"
      | "unusual_payment_method"
      | "code_or_credentials_request"
      | "cannot_talk_normally"
      | "urgency"
      | "move_off_platform"
      | "crypto_or_fee_to_receive"
      | "payment_link";
    evidence: string; // short exact quote from the client's message
  }>;
}
```

**Output** (computed on the server, not by the model):

```ts
{
  level: "few" | "some" | "many";
  signals: Array<{ id: string; label: string; evidence: string; explanation: string }>;
  safeSteps: string[];
  neverDo: string[];
}
```

**How it scores:**
- **Evidence check:** any signal whose quote doesn't appear in the client's message is dropped, so the model can't flag something that isn't there.
- **Extra checks in code:** some signals are verified after the model proposes them, and can only be dropped, never added. Praise must be an actual compliment about the artist's work, and the personal-story signal is dropped when the message mentions a photo, a reference, or a specific format or medium.
- **One quote, one signal:** if the model files the same quote under two signals, it counts once. The higher-weight signal keeps it, or the first one on a tie.
- **Weights:** overpayment or refund requests, code or credential requests, fees to receive money, and links to receive payment count 3 points; everything else counts 1.
- **Levels:** 2 points or fewer is "few," 3–4 is "some," 5 or more is "many." Two weak signals on their own, like generic praise plus a birthday-gift story, stay at "few," because genuine gift commissions are common.
- **Never-do warnings** (never refund an overpayment, never share an OTP or PIN, never pay a fee to receive money, never log in or enter details through a link someone sent to pay you) show whenever their signal is found, regardless of level.
- **Safe steps:** "Don't start until payment shows in your actual account balance" always shows. Steps for the specific signals found are added only at "some" and "many."

**How "few" is shown:** the card stays quiet. The heading reads "Nothing major stood out" ("No signals found" when there are none), the signals are folded behind a "1 minor thing to note" button that starts closed, and only the always-on payment step is listed. Never-do warnings still show if one is triggered. When nothing matches at all, the card shows "No signals found" with a note that this doesn't mean a message is safe, and every level carries a "not a verdict" note. An earlier, reassuring wording ("a good sign") was replaced on purpose: a message with none of these patterns can still be a scam.

Labels, explanations, and safe steps are written in code, not generated by the model.

**Review flags** for the live preview (the `?fail=…` flags that simulate other failures are in [Failure handling](#failure-handling)):
- `?toolError=1` makes the tool fail, to show the error state.
- `?toolSlow=1` slows the tool stream down so every state is visible. Gemini on this provider sends tool arguments all at once, so without this flag the in-between states pass too quickly to see. This is a demo aid, not how the app normally behaves.

**Why there's no confirmation tool:** Klaro never takes actions on the artist's behalf, like sending messages or making payments, so there's nothing to approve.

### Planned

Agreement extraction and the completeness check will be added as tools in the next phase. Their contracts will be documented here when they're built.

## Failure handling

Every failure in the chat says what happened, what's safe, and what the button will do. None show a raw error, a stack trace or provider text; the server sends a short code (`rate_limited`, `overloaded`, `blocked`, `too_long`, `unknown`) and logs the real error to its own console only. A draft is saved in the browser as it goes, so no failure loses it.

**Reproducing each one.** Add the flag to the `/draft` URL, on any deployment including Vercel previews. The `?fail` flags fail the **first request after the page loads**, then let everything through, so clicking Retry shows it working. Reload to repeat.

| Failure | How to trigger | What you see |
|---|---|---|
| Rate limited | `?fail=rate-limit` _(fails once; Retry then succeeds; reload to repeat)_ | "Klaro is busy right now". Retry is disabled with a visible countdown: the server's `Retry-After` (20 s here), capped at 60 s, else 15 s. |
| Service overloaded | `?fail=server` _(fails once; Retry then succeeds; reload to repeat)_ | "The AI service is overloaded. Nothing was lost." A real 502, 503 or 504 looks the same. |
| Reply cut off | `?fail=midstream` _(fails once; Retry then succeeds; reload to repeat)_ | A few words stream, then "The reply was cut off". What arrived stays above the notice, and Retry replaces it. |
| Malformed scam-check result | `?fail=bad-tool` _(fails once; Retry then succeeds; reload to repeat)_ | The card shows "Couldn't finish the check". The chat keeps working. |
| Scam check fails | `?toolError=1` _(every request)_ | The same card error, with its manual checklist and Retry. |
| Scam check is slow | `?toolSlow=1` _(every request)_ | Every card state (reading, checking, result) stays on screen long enough to see. |
| Offline | DevTools → Network → Offline, then send | "Can't reach Klaro. Check your connection." Retry is labelled "Try this message again". |
| Offline mid-reply | Go offline while a reply streams | "The reply was cut off", plus "You also appear to be offline." The partial reply stays the focus. |
| Message too long | Paste more than 8,000 characters | The composer disables Send and shows how far over you are. The server refuses it too (400 `too_long`). Length is measured on the text as redacted. |
| Empty message | Send with nothing, or only spaces | Send is disabled, and no request is made. |
| Page closed mid-reply | Reload while a reply streams | The draft comes back with "This reply was interrupted" and Retry. It is never shown as finished. |
| Damaged saved draft | In DevTools, set the `klaro-draft-chat` local storage value to `not json` | Klaro starts a clean draft. |
| Empty reply | Not reproducible on demand: the model answers with nothing, or is filtered | "No reply this time", with Retry, instead of an empty bubble. |
| Slow reply | Wait | After about 10 s, "Taking longer than usual…" under the thinking indicator. At 25 s, a notice with Stop. |
| A page crashes | n/a | A calm error page with Try again and a link home (`app/error.tsx`, `app/draft/error.tsx`, `app/global-error.tsx`). The draft page also offers to discard the saved draft, for the case where it's what breaks the page. Unknown addresses get a designed 404. |

Retry sends only the failed message again. Double clicks are safe: the button is disabled while a request is in flight, and a lock stops two clicks in one tick from sending twice.

### Checking on a real iPhone

The layout is built conservatively for Mobile Safari (the panel is sized from `window.visualViewport`, not `vh`; the composer scrolls into view on focus; the textarea is 16 px so Safari doesn't zoom; the transcript uses `overscroll-behavior: contain`), but it can't be tested without a device. On an iPhone in Safari:

1. Open `/draft`, tap the message box. The keyboard opens and the whole box stays visible above it, with the chat panel inside the visible area.
2. Close the keyboard. The panel returns to full height with no gap left behind.
3. Rotate to landscape and back with the keyboard open and closed.
4. Tap the box. The page must not zoom in.
5. Fill an example, send it, and scroll the transcript to its end. Overscrolling must not scroll the page behind it.
6. Check there is no sideways scroll on the smallest iPhone width you have.
7. Send with Airplane Mode on: "Can't reach Klaro". Turn it off and tap Retry: it sends.
8. Turn Airplane Mode on while a reply streams: "The reply was cut off" with the offline line.
9. Reload (or switch away and back) mid-reply: "This reply was interrupted" with Retry.
10. Tap Retry twice quickly: one request is sent (check the server log).
11. Check nothing sits under the notch or the home indicator, in portrait and landscape, on the home page, `/draft`, a missing page (`/nothing`) and while scrolled to the bottom. The app sets `viewport-fit=cover` and pads the page by `env(safe-area-inset-*)`, and the composer keeps its own bottom padding. Chrome's emulated insets pass; this checks real hardware. The global error page (`app/global-error.tsx`) has the same padding but is the one page I couldn't render to check.
12. In a Private tab (storage limited), the chat still works.

## Privacy

- **Redaction in the browser.** Phone numbers, emails, verification codes, account numbers, and link paths are replaced with placeholders like `[phone]` or `[link: example.com]` before a message leaves the device. Prices and dates inside a sentence are kept, unless the number comes right after a code word like "code", "OTP" or "PIN". A number alone on its own line is kept if it has a currency marker (₱, P, PHP, pesos) or follows a price word (fee, budget, price, rate, payment, total, how much). Any other bare 4–8 digit number on its own line, and any number of 10 or more digits, is replaced.
- **Nothing stored on a server.** No accounts, no database. The conversation lives in your browser's local storage.
- **Gemini free tier.** Messages are processed by Google's Gemini API on the free tier. Google's terms allow free-tier prompts to be used to improve its products for users outside the EU, UK, and Switzerland, which includes the Philippines. Leave out anything you wouldn't want stored elsewhere.

## Not in v1

- **No pricing or valuation.** Klaro records the terms an artist and client agreed on and never suggests what a commission is worth.
- **Not a contract.** No legal enforceability and no e-signatures. It produces a written record.
- **No accounts or database.** Single-user, nothing stored on a server.
- **No payment processing or escrow.**

**Planned for v2:**
- Comparing a deal against the artist's own terms of service and commission sheet.
- A client-side version, including a check for fake artists and stolen portfolios.
- Screenshot input, read in the browser so images never leave the device.

## Configuration / Environment

Copy `.env.local.example` to `.env.local` and add:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). `/health` reports whether the key is set, without revealing its value.

## Tech Stack

- Next.js (App Router) + TypeScript
- Vercel AI SDK
- Google Gemini (`gemini-flash-lite-latest`)
- AI Elements + shadcn/ui
- Tailwind CSS
- Zod (tool schemas)
- Vitest (with jsdom and Testing Library for component tests)
- Deployed on Vercel

## License

Licensed under the [MIT License](./LICENSE).