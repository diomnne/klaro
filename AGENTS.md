<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Shared instructions for AI coding agents (Claude Code, Cursor, Antigravity) working in this repo.

## Project Overview

An AI-powered commission agreement tool for independent visual artists in the Philippines.

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

## Git workflow and versioning

### Branches and pull requests

- `main` holds releases only. Nothing lands on it except a release merge from `dev`.
- `dev` is the integration branch. Cut feature branches from `dev` (`feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`) and open PRs back into `dev`.
- Every PR must pass the required `ci` check (lint, unit and component tests, build, e2e) before merging.
- Merge PRs with a merge commit, not squash or rebase, so each branch's individual commits stay in history.

### Commits

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description` — `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`, `ci`, `perf`.
- One logical change per commit.
- Only the maintainer commits, stages, pushes, tags and merges. AI agents never run git commands that change the repo or the remote. They propose commits at the end of a task as copy-ready `git add` / `git commit` commands.

### Changelog

`CHANGELOG.md` is written as release notes and uses [Semantic Versioning](https://semver.org/). This format is the standard for every release.

Each version sits under `## [X.Y.Z] - YYYY-MM-DD` and contains, in this order:

1. One sentence, with no heading, summarizing what the release does for the user.
2. `### What's new`: bullets that each start with a **bold lead-in**, then one or two plain sentences about what changed for the user or reviewer.
3. `### Bugs fixed`: plain bullets, each saying what was broken.
4. `### Reviewing …`: only when the release adds something a reviewer can trigger, such as a review flag. A short table with a URL column and a "What you'll see" column. Leave the section out when the release adds nothing to trigger.
5. `### Verification`: only results measured for that version, such as test counts, lint and build, layout shift or widths checked. Say "measured locally" where that's true.
6. `### Known limits`: what's untested or constrained, stated plainly.
7. `### Not in this release`: one line.

`## [Unreleased]` stays at the top. While work is in progress it only has `### What's new` and `### Bugs fixed`. For every change you make, add a bullet there. The summary sentence and the other sections are written at release time. Keep the compare links at the bottom.

Rules:

- Never write bracketed placeholders, or claims about manual testing you can't verify (live-site checks, physical devices, network tests). If a section needs one, ask the maintainer instead.
- Don't invent numbers. Use the test counts, measurements and results from that version's commits, README and reports.
- No file names in the user-facing bullets.

### Releasing vX.Y.Z

1. From an up-to-date `dev`, create `chore/release-X.Y.Z`.
2. Run `npm version X.Y.Z --no-git-tag-version` so `package.json` and `package-lock.json` both carry the new version.
3. In `CHANGELOG.md`, move everything under `[Unreleased]` into a new `## [X.Y.Z] - YYYY-MM-DD` section and leave `[Unreleased]` empty. Write the summary sentence, then the Reviewing (if needed), Verification, Known limits and Not in this release sections, following the format above. Update the compare links at the bottom: `[Unreleased]` compares `vX.Y.Z...HEAD`, and add `[X.Y.Z]` comparing the previous tag to `vX.Y.Z`.
4. Commit as `chore(release): X.Y.Z`, open a PR into `dev`, and merge it once `ci` passes.
5. Open a PR from `dev` into `main` titled `Release vX.Y.Z` and merge it with a merge commit.
6. Tag the merge commit on `main` with an annotated tag, then push that tag by name. Don't use `--tags`.
   ```sh
   git switch main && git pull
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```
7. Create a GitHub release from the tag, with the `[X.Y.Z]` changelog section as the notes. While the version is `0.x`, mark it as a pre-release:
   ```sh
   gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <section.md> --prerelease
   ```

## Working with the AI assistant

- Ask before adding a new dependency.
- Match existing patterns in the codebase rather than introducing a new style per component.
- Flag when a `"use client"` boundary could be pushed further down the tree.
- Prefer small, composable components over large multi-purpose ones.