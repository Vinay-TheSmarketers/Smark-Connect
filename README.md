<<<<<<< HEAD
# Smark Connect

Smark Connect is a multi-company, BYOK AI CMO application. A user connects a supported AI-provider key, adds a public company URL, and receives six evidence-led analyses plus a specialist agent workspace.

## What runs for each company

The first audit crawls up to 20 public pages, captures official mobile and desktop Google PageSpeed snapshots, and runs these six documents concurrently:

1. Company Intelligence
2. SEO Audit
3. GEO and AI Visibility Audit
4. Competitor Analysis
5. Audience Analysis
6. Content Audit and Strategy

X, Reddit, Articles, and LinkedIn agents then run concurrently against the shared company foundation. The AI CMO produces a final cross-document synthesis. Campaign Planner, Instagram, YouTube, Creative and Visual, UGC and Influencer, Email and Newsletter, Paid Media, and Community agents are available on demand.

The orchestration registry embeds 55 skill files from the sibling `claude-seo-main`, `openclaw-marketing-skills-main`, and `skills-main` repositories. Referenced skill dependencies are loaded within a bounded prompt budget, and every run stores its skill and source provenance.

## Documents

Each core document includes:

- An in-app professional reading view
- A focused-edit toggle that limits context and reduces token use
- A full-regeneration option that reloads website evidence and embedded skills
- Version history in PostgreSQL
- Branded DOCX download
- Branded PDF download and in-app PDF preview

Exports follow the approved Smarketers cream, blush, violet, and Arial visual system.

## Token planning

The default workspace budget is 2,000,000 tokens. A complete company run is estimated at roughly 180,000–300,000 tokens depending on page volume, skill dependencies, provider tokenization, and generated depth. Plan for about 6–8 full company scans, with focused document edits consuming substantially less. The dashboard tracks actual application estimates across all companies.

## Run locally

Requires Node 20+ and pnpm 10+.

1. Install packages: `pnpm install`
2. Start local Postgres: `pnpm db:dev`
3. Create `.env` and `.env.local` with the printed database URL plus:

   ```env
   AUTH_SECRET="replace-with-a-long-random-value"
   AUTH_URL="http://localhost:3000"
   SECRET_ENCRYPTION_KEY="base64-encoded-32-byte-key"
   ```

4. Apply the local schema: `pnpm db:push`
5. Seed the full demo workspace: `pnpm seed`
6. Start development: `pnpm dev`

Open [http://localhost:3000](http://localhost:3000).

For a conventional PostgreSQL database with migration history, use `pnpm db:deploy` in production.

## Demo account

- Email: `demo@thesmarketers.com`
- Password: `Demo@123`

Demo mode displays the populated workspace but never sends the placeholder provider credential to an external AI service. Create a normal user and connect a real provider key to run fresh analyses and edits.

## Quality checks

```bash
pnpm skills:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke # requires the built app to be running on AUTH_URL
```

## Production requirements

- Managed PostgreSQL `DATABASE_URL`
- Unique `AUTH_SECRET` and `SECRET_ENCRYPTION_KEY`
- The three skill repositories available as sibling directories, or an equivalent packaged skill volume
- Provider API keys supplied by each user
- Optional `PAGESPEED_API_KEY` for higher Google PageSpeed API quotas
- Approved OAuth applications before enabling external publishing or first-party platform connectors

## Container deployment

The production image is Linux-based and includes Chromium plus the Python report renderer used by PDF exports. The required skill repositories are vendored under `vendor/skill-repositories` so runtime file loading does not depend on sibling folders outside the application.

Build and test the image locally with Docker Desktop:

```bash
docker build -t smark-connect .
```

For Railway, connect the Git repository, add a PostgreSQL service, reference its `DATABASE_URL`, set `AUTH_SECRET`, `SECRET_ENCRYPTION_KEY`, and `AUTH_URL`, then configure `pnpm exec prisma migrate deploy` as the pre-deploy command and `pnpm start` as the start command. Configure `/api/health` as the health-check path. Never commit `.env`, `.env.local`, database credentials, or provider keys.

Backlink counts, Search Console index coverage, live social threads, and answer-engine citation share are never fabricated. Their interfaces explicitly remain unavailable until an approved official or first-party source is connected.
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> 5d20e0b (Initial commit from Create Next App)
