# Klaro

An AI-powered commission agreement tool for independent visual artists in the Philippines. Klaro takes an artist's account of a client's request, or the client's pasted chat, and turns it into a clear written agreement and an evidence checklist before work begins. It documents the terms. It does not price or judge them, and it is not a legally binding contract.

> **Status: pre-alpha.** The skeleton is scaffolded and the routes below exist as placeholders, but the AI chat, the tool calls, and the agreement logic are not built yet. Everything under Usage describes the intended behavior.

## Live Demo

🚧 Not yet deployed — a live preview link will be added here once the app is connected to Vercel.

_Screenshot preview coming once the draft view is functional._

## Quickstart

⚠️ **Placeholders only.** The routes below render, but the chat doesn't call Claude yet.

Requires [Node.js](https://nodejs.org/) 20.9 or later.

```bash
git clone https://github.com/diomnne/klaro.git
cd klaro
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Usage

_Chat, agreement extraction, and completeness checking are not wired up yet — this is the planned behavior._

**Pages**

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, a "how it works" summary, and a link to `/draft`. |
| `/draft` | Draft an agreement | The main interface: chat, agreement card, and evidence checklist. Paste a client's chat or describe the request, then chat with the AI to fill in missing terms. |
| `/about` | About | What Klaro does, what it doesn't do, and what happens to a pasted chat. |
| `/api/chat` | AI endpoint | Server route handling the Vercel AI SDK, Claude API, and structured tool calling (`generate_commission_agreement` and `check_agreement_completeness`). |
| `/health` | System health | Renders the status returned by `/api/health`. |
| `/api/health` | Health check | Reports app status and whether the Claude API key is configured. |

**The Klaro Workflow**

1. **The Data Dump:** The artist pastes a messy client chat (Messenger, Instagram, Discord) or describes the request in their own words.
2. **The Gap Check:** The AI extracts key terms (deliverables, deadline, revisions, payment, delivery, usage rights) and asks about anything missing. Risky or missing terms, like no down payment, are flagged as warnings. They never block the artist from continuing.
3. **The Verification:** The extracted terms populate an editable card. The artist reviews, corrects any AI misinterpretations, and finalizes it.
4. **The Handoff:** The artist copies the agreement text and sends it back to the client in the same chat, and keeps the evidence checklist. Drafts are saved in the browser, so a refresh doesn't lose them.

**Not in v1**

- No pricing or valuation. Klaro records the terms an artist and client agreed on and never suggests what a commission is worth.
- Not a contract. No legal enforceability and no e-signatures; it produces a written record.
- No accounts or database. It's single-user, and nothing is stored on a server.
- No payment processing or escrow.

## Configuration / Environment

An `.env.local.example` file will be provided with the required key:

```env
ANTHROPIC_API_KEY=your_claude_api_key
```

`/health` reports whether this key is set, without revealing its value.

## Tech Stack

- Next.js (App Router) + TypeScript
- Vercel AI SDK + Claude API (Anthropic)
- Tailwind CSS
- shadcn/ui
- Zod (for AI tool schema validation)
- Deployed on Vercel

## License

Licensed under the [MIT License](./LICENSE).