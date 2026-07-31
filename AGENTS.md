<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Shared instructions for AI coding agents (Claude Code, Cursor, Antigravity) working in this repo.

## Project Overview

An art portfolio site to showcase artworks across different mediums, aimed at attracting potential clients for commissions/hires.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI components:** shadcn/ui
- **Deployment:** Vercel (preview builds on every push)

## Server vs. Client Components

- Default to **Server Components**. Only add `"use client"` when a component genuinely needs interactivity — state, event handlers, effects, or browser APIs.
- Push the client boundary as far down the tree as possible. Wrap the interactive piece, not the whole page.
- Fetch data in Server Components where possible. Pass data down as props instead of fetching client-side.

## File Structure

```
app/
  (route-group)/       group routes by feature, not by type
  layout.tsx
  page.tsx
components/
  ui/                  shadcn-generated primitives — owned code, safe to edit
  [feature]/            feature-specific components
lib/                    utilities, types, helpers
public/                 static assets
```

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Files/folders | kebab-case | `site-header.tsx`, `user-profile/` |
| Component name (inside file) | PascalCase, matches filename | `site-header.tsx` exports `SiteHeader` |
| Route segments | lowercase, kebab-case | `app/case-studies/page.tsx` |
| Hooks | camelCase, `use` prefix | `useScrollPosition.ts` |
| Types/interfaces | PascalCase, no `I` prefix | `UserProfile`, not `IUserProfile` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |

## Tailwind

- Use design tokens from `tailwind.config.ts` / `globals.css` before reaching for arbitrary values (`w-[137px]`).
- Keep class order roughly consistent: layout → spacing → sizing → typography → color → state (`hover:`/`focus:`).
- Repeated class combinations become a component, not an `@apply` mixin — reserve `@apply` for truly global base styles.

## shadcn/ui

- Components are added via `npx shadcn add [component]` into `components/ui/` — treat them as owned, editable code, not a black box.
- Check `git diff` before re-running `add` on a component you've already customized, so you don't silently overwrite your edits.
- Compose primitives into feature-level components rather than using raw shadcn components directly in pages.
- Select/dropdown triggers must always render the option's human-readable label, never the underlying enum/key value (e.g. show "Pet Portrait", not `petPortrait`) — verify this for every dropdown, not just at a glance.
- Native `<input type="file">` elements must never ship with unstyled default browser chrome — restyle with Tailwind `file:` classes, or hide the native input and trigger it via a styled `Button`.

## Code Style

- **Formatting:** Prettier is the source of truth (2-space indent, single quotes, semicolons, trailing commas). Don't hand-format against it — run it, don't argue with it.
- **TypeScript:** strict mode on. Avoid `any` — use `unknown` and narrow it if the type is genuinely uncertain. Explicit return types on exported functions; let inference handle the rest.
- **Imports:** use the `@/` alias over deep relative paths (`@/components/ui/button`, not `../../../components/ui/button`). Group in order: external packages → internal (`@/...`) → relative/local → styles, with a blank line between groups.
- **Components:** function declarations, not `const X = () => {}`, for anything exported as a component — easier to read in stack traces and grep for. Arrow functions are fine for inline callbacks and handlers.
- **Exports:** named exports for everything except pages/layouts/route handlers, where Next.js requires a default export. Named exports make refactors and auto-imports more reliable.
- **Comments:** explain *why*, not *what*. If a comment just restates the code, delete the comment or rewrite the code to be self-explanatory.
- **Error handling:** no silent `catch {}` blocks. User-facing failures get a real fallback (loading/error states, `error.tsx` boundaries), not a console.log and a shrug.

## Calculated Values / Formulas

- When adapting a formula from one entity to a structurally different one (e.g. reusing a portrait's pricing formula for a different commission type), don't assume the same underlying assumptions carry over. Write the zero/boundary-value test case first, before implementing — before trusting the math.

## Commits

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type: description` — `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`.
- One logical change per commit.

## Working with the AI assistant

- Ask before adding a new dependency.
- Match existing patterns in the codebase rather than introducing a new style per component.
- Flag when a `"use client"` boundary could be pushed further down the tree.
- Prefer small, composable components over large multi-purpose ones.