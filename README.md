# ApplyQ

AI-powered interview coach and job application toolkit. Score your fit before you apply, identify the gaps holding you back, and learn from every interview — so you stop making the same mistakes twice.

**Live at:** https://jobfit.zaki.consulting/ (beta)

---

## What it does

**1. Fit score** — Paste a job description, get an honest 0–100 score in seconds. ApplyQ compares the JD against your CV profile, names the requirements that'll cut you, and tells you whether to apply, find a referral, or skip.

**2. Gap analysis** — Requirement-by-requirement breakdown showing where you're strong, where you're thin, and concrete action items to close each gap before you apply.

**3. CV tailoring** — Generates a tailored CV summary optimised for the specific role, downloadable as a PDF.

**4. Cover letter** — Produces a targeted cover letter based on your profile and the JD.

**5. Interview analysis** — After each round, ApplyQ analyses your performance: what landed, what lost the room, and the patterns repeating across interviews.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TanStack Start (SSR), TanStack Router |
| Styling | Tailwind CSS v4, Radix UI |
| Backend / DB | Supabase (Postgres + Auth + Edge Functions) |
| AI | Supabase Edge Functions → Claude (Anthropic) |
| Deployment | Cloudflare (via `@cloudflare/vite-plugin`) |
| Build | Vite 7 |

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- Supabase CLI (`npm install -g supabase`)

### Install

```bash
git clone https://github.com/dz-consulting/role-refiner-ai.git
cd role-refiner-ai
npm install
```

### Environment

Create a `.env` file at the project root (already in `.gitignore`):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Get these values from your Supabase dashboard under **Project Settings → API**.

### Run locally

```bash
npm run dev
```

### Deploy Supabase edge functions

```bash
supabase functions deploy
```

---

## Project structure

```
src/
  routes/         # File-based routes (TanStack Router)
    index.tsx       # Landing page
    onboarding.tsx  # CV upload + profile setup
    assess.tsx      # New assessment (paste JD)
    assessment.$id  # Assessment result view
    tailor.$id      # CV tailoring
    cover-letter.$id
    dashboard.tsx   # User dashboard
    profile.tsx     # Edit profile
  integrations/supabase/   # Supabase client + auth helpers
  lib/             # Utilities (anon store, PDF export, feature flags)
  components/      # Shared UI components

supabase/
  functions/       # Edge functions (assess-job, tailor-cv, cover-letter, extract-cv, …)
  migrations/      # Postgres migrations
```

---

## Guest mode

Users can try up to **3 assessments per day without signing in**. Data is stored in `localStorage` under anon IDs. Creating an account persists data to Supabase and removes the daily limit.

---

## Contributing

This is a solo side project in beta. Issues and PRs welcome.
