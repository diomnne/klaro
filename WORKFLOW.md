# Workflow Notes: Commission Request Feature

## What differs between the two branches

`feat/commission-pricing-vague` and `feat/commission-pricing-precise` both start from the same scaffold commit but implement different things, not different drafts of the same thing. The vague branch is a standalone pricing *calculator*: Medium/Size/Complexity selectors plus four flat add-on checkboxes, computed by a single `calculatePricing()` function, displayed in a sticky sidebar. It has no client info, no reference images, no Terms of Service gate, no submit action, no schema validation, and no tests. Pricing dimensions (extra character, custom background, commercial license, rush) are generic and don't map to how the artist actually prices portrait vs. custom work — there's no downpayment, no currency abstraction (USD is hardcoded via `Intl.NumberFormat`), and styling is hand-rolled Tailwind (`zinc-900`, `zinc-50`) rather than the project's shadcn design tokens.

The precise branch implements the full commission *request* flow the spec called for: portrait (digital/traditional, with per-medium formulas) and custom-piece (category + direct complexity tier) pricing, a downpayment split, currency-agnostic formatting, client info with repeatable social links, image previews, a rush toggle, a Terms of Service gate that disables submission until checked, zod-validated submission producing a structured payload, and 11 unit tests covering the acceptance-table pricing cases. It's built on Base UI's native `Field`/`Form` primitives (this shadcn style has no React-Hook-Form-compatible `form` component) rather than plain HTML controls.

## Correctness

The vague branch's pricing math is a single untested function — no way to confirm `1.5 × 1.35` multiplier stacking is intentional versus a guess. The precise branch's formulas are pinned by unit tests against the spec's literal acceptance table (e.g., 11×14 canvas at 2 subjects = ₱2,310 exact), so a future formula change that breaks an existing guarantee fails loudly instead of silently. Both branches hardcode placeholder prices; only the precise branch flags them inline as `// PLACEHOLDER — confirm with artist`.

## Accessibility

The vague branch's `OptionButton` (`aria-pressed` toggle buttons) and native checkboxes are reasonably accessible on their own, but nothing associates labels with validation state — there's no error path to test, because there's no validation. The precise branch uses `Field.Root`/`Field.Label`/`Field.Error` throughout, which wires `aria-describedby`, `data-invalid`, and native `ValidityState` hooks consistently across ten-plus form controls — more surface area, but a single reviewed pattern rather than one-off markup per field.

## Edge cases worth a reviewer's attention

Storybook illustration pricing multiplies background/rush fees by page count (a literal reading of the spec's formula, flagged in the PR as a judgment call). The "Other" custom category requires a free-text label via a zod `.refine()` — worth confirming the error message surfaces correctly rather than failing silently. Tab-switching between Portrait and Custom Piece resets type-specific state; verify no stale values leak into the submitted payload.

## Review effort

The precise branch is ~4x the line count and touches Base UI internals not covered by mainstream docs (its `Select.Value` label bug, fixed here, is unlikely to be caught by a skim review) — budget time to run the dev server and click through both flows rather than reviewing the diff alone.
