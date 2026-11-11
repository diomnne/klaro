# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-11-11

### Added

- Component tests for message rendering, chat states, the composer, the scam-check card and the new-draft dialog, querying by role and label.
- A shared mock of the AI chat stream for tests, and a guard that fails any test that tries to make a real network call.
- An end-to-end test of the primary draft flow on Desktop Chrome and Mobile Safari emulation, using Playwright.
- GitHub Actions CI that runs lint, unit and component tests, the build and the end-to-end tests on pushes and pull requests to dev and main.
- A coverage script (`npm run test:coverage`) and a typecheck script (`npm run typecheck`).
- Documentation for running the tests, reading coverage and what CI checks.
- This changelog, and a documented git workflow and release process for contributors and AI agents.

### Fixed

- The chat composer is announced as "Message" and its button as "Send message" (or "Stop" while replying) to screen readers, instead of relying on a placeholder or icon.

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

### Added

- A scam-signal check that runs on the client's message before Klaro replies, reporting quoted signals rather than a verdict.
- A scam-check card in the chat that moves through reading, checking, result and error states, with a never-do box and a Retry button.
- Contact details, account numbers and verification codes are redacted in the browser before a message is sent, while prices and dates are kept.
- Unit tests for redaction and scam-signal scoring, run with `npm test`.
- Documentation of the scam check, redaction and the Gemini setup.

### Changed

- Klaro's replies after a scam check avoid "scam", "fraud" or "safe" wording, don't repeat the card, and hold off when many signals or a never-do item appear.
- Node 22 or later is now required.

## [0.1.0] - 2026-10-01

### Added

- A landing page, an about page and a shared header that marks the active page.
- A draft page with a chat panel that streams Klaro's replies word by word from Gemini.
- Klaro's system prompt, which always replies in English and treats pasted DMs as the client's words.
- A health check endpoint and page.
- Design tokens, fonts and shadcn/ui components.
- An about-page note on Gemini free-tier data handling and what to leave out of pasted text.

### Fixed

- The chat is usable on phones and recovers when a reply stalls.

[Unreleased]: https://github.com/diomnne/klaro/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/diomnne/klaro/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/diomnne/klaro/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/diomnne/klaro/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/diomnne/klaro/releases/tag/v0.1.0
