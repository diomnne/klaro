# Klaro

An AI-powered commission intake and handoff tool for independent creatives in the Philippines. Klaro takes unstructured chat messages and turns them into a clear, structured agreement (Scope of Work) and evidence checklist before work begins. It witnesses and documents the terms—it does not price or judge them.

> **Status: pre-alpha.** The app is not yet scaffolded — there is no runnable code in this repo yet. Everything below describes the intended design for the FlyRank AI frontend track capstone project. 

## Live Demo

🚧 Not yet deployed — a live preview link will be added here once the app is connected to Vercel.

_Screenshot preview coming once the intake UI is scaffolded._

## Quickstart

⚠️ **Not yet functional.** There is no `package.json` in the repo, so `npm install` will fail. These are the commands that will work once the app is scaffolded.

Requires [Node.js](https://nodejs.org/) 18.17 or later.

```bash
git clone https://github.com/diomnne/klaro.git
cd klaro
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Usage

_None of the routes below are built yet — this is the planned page structure._

**Pages**

| Route | Page | Description |
|---|---|---|
| `/` | Intake View | The main interface. A text area for pasting raw chat logs and interacting with the AI to fill in missing agreement gaps. |
| `/api/chat` | AI Endpoint | Server route handling the Vercel AI SDK, Claude API, and structured tool calling (`generate_commission_agreement` and `check_agreement_completeness`). |
| `/agreement/[id]` | Shareable Link | A server-rendered, read-only view of the final agreement and evidence checklist. Includes a print stylesheet for native PDF exports. |

**The Klaro Workflow**

1. **The Data Dump:** The artist pastes a messy, informal client chat thread (e.g., from Messenger or Instagram) into the main text area.
2. **The Witness:** The AI parses the text and extracts key terms (deliverables, deadlines, revisions). If critical protective terms are missing (like a downpayment or delivery method), Klaro flags them and asks a follow-up question.
3. **The Verification:** The extracted data populates an editable interactive card. The artist reviews, corrects any AI misinterpretations, and finalizes the terms.
4. **The Handoff:** The app generates a clean, mobile-responsive web link (`/agreement/[id]`) that the artist can send back to the client as a formal "receipt" (Scope of Work) before beginning the artwork.

## Configuration / Environment

To run this project locally once scaffolded, you will need to configure environment variables for the AI provider and database. An `.env.local.example` file will be provided with the following required keys:

```env
# AI Provider
ANTHROPIC_API_KEY=your_claude_api_key

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Tech Stack

- Next.js (App Router) + TypeScript
- Vercel AI SDK + Claude API (Anthropic)
- Tailwind CSS
- shadcn/ui
- Zod (for AI tool schema validation)
- Supabase (PostgreSQL + Row Level Security for storing generated links)
- Deployed on Vercel

## License

Licensed under the [MIT License](./LICENSE).
