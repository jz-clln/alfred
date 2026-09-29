# Alfred — Phase 1 (Core)

Clients, projects, and manual balance tracking. This is the foundation the
rest of the system (email, calendar, AI, Obsidian) gets layered onto.

## Stack

- **Next.js 14** (App Router, TypeScript) — one codebase, frontend + backend
- **Supabase** — Postgres database, Auth, deployed on their free/hobby tier to start
- **Tailwind CSS** — styled with a small custom design-token system (see below)
- **Vercel** — intended hosting target

## Setup

1. **Create a Supabase project** at supabase.com (free tier is fine to start).
2. **Run the schema:** open the SQL editor in your Supabase project and run
   the contents of `supabase/migrations/0001_init.sql`.
3. **Create your user:** Authentication → Users → Add user, in the Supabase
   dashboard. Use your real email + a password — this is the only account
   the app will ever have, so there's no public sign-up flow.
4. **Environment variables:** copy `.env.local.example` to `.env.local` and
   fill in your Supabase project URL + anon key (Project Settings → API).
5. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` and sign in.
6. **Deploy:** push this to a GitHub repo, import it into Vercel, and add the
   same two environment variables in the Vercel project settings.

## What's here

- Email/password auth, gated by `middleware.ts` (no route is reachable
  without a session)
- **Clients** — list + detail view, contact info, status
- **Projects** — list + detail view, linked to a client, status toggle
- **Balances** — an append-only ledger (`balance_entries`): every invoice
  and payment is its own row, and each client's running balance is *derived*
  from that ledger (`client_balances` view) rather than stored — so it can
  never drift out of sync with reality
- Row-level security on every table, scoped to your user, even though
  you're the only user

## Design system

Chosen deliberately for a personal ledger tool rather than a generic SaaS
dashboard: a warm paper background instead of stark white, hairline borders
instead of card shadows, and a serif (Fraunces) used specifically for
numbers and headings — balances get treated as the thing worth looking at,
not the chrome around them. Body text and UI use Work Sans. Accent colors
are a single moss green (positive / primary) and a sparing rust (money
owed), rather than the usual all-purpose blue.

Tokens live in `tailwind.config.ts` if you want to adjust them.

## Not in this phase

Meeting scheduling, Gmail sending, the AI assistant, and Obsidian sync are
intentionally left out of this foundation — see the project blueprint doc
for the phased plan. The shapes here (especially `owner_id` scoping and the
ledger-as-source-of-truth pattern) are built to extend cleanly once those
land.
