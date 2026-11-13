# Changelog

All notable changes to this project are documented in this file, as release notes for artists, reviewers and developers. Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The format is described under "Git workflow and versioning" in AGENTS.md.

## [Unreleased]

### What's new

- **Release-notes changelog.** Each version now opens with a one-line summary and covers what's new, bugs fixed, how to review it, what was verified, known limits and what's not included.

## [0.4.0] - 2026-11-11

Klaro now has automated tests and CI, so a change that breaks the draft chat is caught before it reaches the site.

### What's new

- **Component tests.** Tests for message rendering, every chat state, the composer, the scam-check card and the "Start a new draft" dialog find things by role and label, the way an artist or a screen reader would.
- **A shared AI mock and network guard.** Tests answer the chat with a real AI message stream built in code, and any test that tries to make a real network call fails. No test needs an API key or can reach the AI.
- **End-to-end test.** Playwright walks the main draft flow (first run, example message, scam-check result, reply, new draft) on Desktop Chrome and on Mobile Safari emulation, and fails on any console error.
- **CI.** GitHub Actions runs lint, unit and component tests, the production build and the end-to-end tests on every push and pull request to `dev` and `main`. The job is named `ci` so it can be a required check.
- **Coverage and typecheck scripts.** `npm run test:coverage` reports line coverage for Klaro's own code, and `npm run typecheck` checks types without building.
- **Changelog and git workflow.** This changelog, and a documented branching, commit and release process for contributors and AI agents.

### Bugs fixed

- The message box had no accessible name, only a placeholder; screen readers now announce it as "Message".
- The send button was announced by its icon; it is now "Send message" (or "Stop" while Klaro is replying).
- The double-click Retry test fired two separate clicks, so React re-rendered in between and the second click hit an already-disabled button. It would have passed even with the double-click guard removed. It now fires both clicks in the same tick, so it tests the guard.

### Verification

- 339 Vitest unit and component tests pass, measured locally.
- Lint passes with no errors, measured locally.
- Playwright end-to-end tests pass on Desktop Chrome and Mobile Safari emulation.
- CI is green on push.
- About 80% line coverage on Klaro's own components, with the vendored UI (`components/ui`, `components/ai-elements`) excluded.

### Known limits

- Mobile Safari is WebKit emulation in Playwright, not a physical iPhone. The real-device checklist in the README still has to be done by hand.
- Every test mocks the AI, so nothing here checks Gemini's real replies or the real chat route end to end.
- Coverage leaves out the vendored UI components.

### Not in this release

The gap check, the editable agreement card and the handoff are still in progress.

## [0.3.0] - 2026-10-27

### Added

- Calm, specific error notices in the draft chat with a safe Retry, instead of raw error messages.
- Error pages for a crashed route, a crashed layout and unknown addresses, none showing the underlying error.
- Honest empty states: example messages to start from, and unbuilt panels labelled "Coming next" with a note on what they will show.
- A loading skeleton while a saved draft is restored, and a confirmation before starting a new draft.
- Replies cut off mid-turn are marked as interrupted.
- Review flags in the URL that simulate each failure once per page load, for checking error handling by hand.
- Documentation of every failure, what the artist sees, and a checklist for testing on a real iPhone.

### Changed

- The chat route returns short error codes rather than raw messages, and refuses over-long messages.
- The chat panel sizes itself from the visible area so the phone keyboard no longer covers the composer.
- Pages respect phone safe areas, so nothing sits under the notch or home indicator.
- Moved to the current AI SDK API names, with no change in behavior.

### Fixed

- Sending a message right after pressing Stop no longer fails because of an unfinished tool call.
- An unusable scam-check result is treated as a failed check rather than an empty one.

## [0.2.0] - 2026-10-26

Klaro now checks a pasted client message for common scam signals before replying, and shows what it found as a card in the chat.

### What's new

- **Scam-signal check.** Before replying, Klaro looks for patterns aimed at artists, like overpayment, refund requests, requests for codes or fees to receive money. It reports each signal with the exact quote it came from, never a verdict.
- **Code-level guards.** The server decides what the artist sees. Signals whose quote isn't in the client's message are dropped, and weights, levels, safe steps and never-do items are defined in code, not by the model.
- **Scam-check card.** One card moves through reading, checking, result and error states, with safe next steps, a never-do box and Retry. A low "few" result keeps its signals folded behind a disclosure.
- **Redaction before sending.** Phone numbers, emails, link paths, account numbers and verification codes are replaced with placeholders in the browser, while prices and dates are kept. The transcript shows exactly what was sent.
- **Calmer replies after a check.** Klaro avoids "scam", "fraud" and "safe" wording, doesn't repeat the card, and holds off when many signals or a never-do item appear.
- **Unit tests.** Vitest covers redaction and scam-signal scoring, run with `npm test`.

### Bugs fixed

- None in this release.

### Reviewing the scam check

| URL | What you'll see |
|---|---|
| `/draft?toolError=1` | The scam check fails on every request, showing the card's error state with its manual checklist and Retry. |
| `/draft?toolSlow=1` | The check streams slowly, so the reading, checking and result states each stay on screen long enough to see. |

### Verification

- No test counts or other measurements were recorded for this release.

### Known limits

- The scam check reports signals, not a verdict, and can miss patterns it doesn't know.
- Gemini sends tool input all at once, so without `?toolSlow=1` the card's in-between states pass too quickly to see.
- Only redaction and scoring have tests; the chat and the card have none yet.
- Node 22 or later is now required.

### Not in this release

The gap check, the editable agreement card and the handoff are still in progress.

## [0.1.0] - 2026-10-01

Artists can paste a client's message on the draft page and chat with Klaro about the commission, with replies streaming in as they're written.

### What's new

- **Streaming chat.** The draft page has a chat panel that streams Klaro's replies word by word from Gemini.
- **Klaro's voice.** Klaro always replies in English and treats a pasted DM as the client's words, not as instructions.
- **Site pages.** A landing page, an about page and a shared header that marks the current page.
- **Data handling note.** The about page explains how Gemini's free tier handles data and what to leave out of pasted text.
- **Health check.** An endpoint and page that report whether the app is up and the Gemini API key is configured.

### Bugs fixed

- The chat was hard to use on phones and could hang when a reply stalled.

### Verification

- No test counts or other measurements were recorded for this release.

### Known limits

- There are no automated tests yet.
- Replies go through Gemini's free tier, so pasted text may be used by Google as described on the about page.

### Not in this release

The scam check, the gap check, the editable agreement card and the handoff aren't built yet.

[Unreleased]: https://github.com/diomnne/klaro/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/diomnne/klaro/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/diomnne/klaro/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/diomnne/klaro/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/diomnne/klaro/releases/tag/v0.1.0
