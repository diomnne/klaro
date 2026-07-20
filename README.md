# Art Portfolio

A personal portfolio site showcasing artwork across multiple mediums, built to attract potential clients and commissions.

## Live Demo

🚧 Not yet deployed — a live preview link will be added here once the app is connected to Vercel.

_Screenshot preview coming once the gallery UI is scaffolded._

## Quickstart

```bash
git clone https://github.com/diomnne/art-portfolio.git
cd art-portfolio
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Usage

**Pages**

| Route | Page | Description |
|---|---|---|
| `/` | Home | Introduction and featured work |
| `/about` | About | Artist bio and process |
| `/works` | Works | Full gallery of artwork, organized by medium |
| `/works/[slug]` | — | Detail view for an individual piece |
| `/commission` | Commission | Rates, process, and how to request a piece |
| `/contact` | Contact | Direct way for clients to get in touch |

**Gallery Mode**

An optional 3D, interactive way to browse the Works gallery — artwork is placed on virtual frames in a navigable 3D space instead of a flat grid. Falls back to the standard grid layout on smaller screens.

_Exact commands and routes will be filled in as each page is scaffolded._

## Configuration / Environment

No environment variables are required yet. Once a contact form or email service is added, required variables will be documented here and an `.env.local.example` file will list their names (without values).

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui
- React Three Fiber + drei (3D Gallery Mode)
- Deployed on Vercel

## License

Licensed under the [MIT License](./LICENSE).