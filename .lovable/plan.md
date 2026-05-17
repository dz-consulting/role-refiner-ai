
# Evals Infrastructure Plan — `assess-job` only

Scope: evals for the `assess-job` Edge Function only. `extract-cv` and `tailor-cv` are out of scope for now (same pattern can be applied later).

Four layers, cheap → expensive. All write to the existing Langfuse trace AND to Supabase tables so you can query/aggregate without depending on Langfuse UI.

```text
1. Code checks     deterministic, every call, free
2. Heuristics      rule-based scoring, every call, free
3. LLM-as-judge    subjective quality, sampled, costs tokens
4. Human review    you, in an internal admin page → edit prompt in Langfuse
```

---

## 1. Data model (one migration)

- **`eval_cases`** — input fixtures
  - `profile` jsonb, `job_description` text, `tags` text[], `source` (`seed` | `from_production` | `from_correction`), `notes`
- **`eval_runs`** — one row per execution of `assess-job` against a case
  - `case_id`, `prompt_label` (Langfuse label, e.g. `production`), `prompt_version`, `model`, `langfuse_trace_id`, `output` jsonb, `latency_ms`
- **`eval_scores`** — many per run
  - `run_id`, `scorer` (`code` | `heuristic` | `llm_judge` | `human`), `name`, `value` numeric, `passed` bool, `detail` jsonb
- **`eval_review_queue`** — items needing your attention
  - `run_id` nullable, `assessment_id` nullable (for production corrections), `reason`, `status` (`pending` | `reviewed` | `dismissed`), `verdict` (`good` | `bad` | `needs_prompt_fix`), `prompt_fix_note` text, `reviewed_at`
- Extend `assessment_feedback` usage: every row inserted there also inserts a `pending` row into `eval_review_queue` with `reason = 'production_correction'`.

All tables admin-only RLS (gated by a simple `is_admin` check — see Open Questions).

---

## 2. Layer 1 — Deterministic code checks (`assess-job`)

Pure TS, runs inline in the Edge Function right after `extractJson`, and in the eval runner.

- `schema_valid` — output matches zod schema
- `fit_score_range` — 0–10, half-point increments
- `fit_label_consistent_with_score` — `STRONG ≥ 7.5`, `PARTIAL 4–7`, `POOR < 4`
- `requirements_nonempty` and each has non-empty `evidence`
- `match_strength_in_enum` — only `Strong | Partial | Gap`
- `action_items_count_in_range` — 4–7
- `action_items_address_known_keys` — each `addresses` string references an actual requirement text or screening risk
- `priority_and_effort_enums_valid`
- `company_intel_schema_valid` (if non-null)

File: `supabase/functions/_shared/evals/code-checks.ts` exporting
`runCodeChecks(output, ctx) → Score[]`.

---

## 3. Layer 2 — Heuristics

- **Language gap false-positive** — if candidate's `languages` includes JD-required language at B2+, NO requirement may be `Gap` for that language
- **Skill overlap vs fit_score** — token overlap between JD and `profile.skills`; flag if `fit_score ≥ 7` but overlap < 25% (likely overscored), or `fit_score ≤ 3` but overlap > 60% (likely underscored)
- **Deal-breaker surfaced** — if JD conflicts with a stated preference deal-breaker, expect ≥1 `screening_risk` mentioning it
- **Action-item distribution** — not all same priority, not all same effort
- **No hallucinated requirements** — every `requirement.requirement` substring should appear (fuzzy) in the JD
- **Company intel grounding** — `company_intel.what_they_do.summary` non-empty XOR labelled "Unknown company"

File: `_shared/evals/heuristics.ts`.

---

## 4. Layer 3 — LLM-as-judge

Separate Claude calls with rubrics managed in Langfuse under `evals.judge.*` prompts (so you can edit rubrics without redeploy).

Judges for `assess-job`:
- `judge.fit_summary_quality` — honest, specific, no hedging
- `judge.action_items_actionability` — specific vs generic, tied to real gaps
- `judge.company_intel_grounding` — no fabrication
- `judge.requirements_calibration` — are `Strong/Partial/Gap` ratings defensible given evidence + profile

Each returns `{score: 1-5, rationale, failures[]}`. Written to `eval_scores` and pushed to Langfuse via `sendLangfuseScore`.

Sampling:
- Production traffic: **10%** (configurable via env `EVAL_JUDGE_SAMPLE_RATE`)
- Eval runner: 100%
- Runs async via `EdgeRuntime.waitUntil` so user response isn't blocked.

---

## 5. Layer 4 — Human in the loop → prompt updates

Two inputs into the same review queue:

**A. Production user corrections** (already partially built)
- `submit-feedback` already writes to `assessment_feedback` + Langfuse scores.
- **New:** also enqueue an `eval_review_queue` row with `reason = 'production_correction'`, linking to the original assessment.

**B. Auto-flagged runs from layers 1–3**
- Any failed code check, any heuristic violation, any judge score ≤ 2 → enqueued with `reason` naming the failing check.

**Your workflow in the internal review UI** (`/admin/evals`):
1. See queue: input (CV + JD), model output, all scores, user correction (if any), judge rationales.
2. Pick verdict: `good` / `bad` / `needs_prompt_fix`.
3. If `needs_prompt_fix`: write a free-text `prompt_fix_note` explaining what the prompt should change (e.g. "model keeps marking German as Gap when candidate is C1 — strengthen the language-check instruction").
4. Click "Promote to dataset" if the case is worth keeping as a regression test → copies inputs into `eval_cases` with `source = 'from_correction'`.
5. You then **manually** edit the prompt in Langfuse based on the accumulated notes. Plan creates a "Prompt fix notes" view that lists all `needs_prompt_fix` notes grouped by week so you can do this in a focused session.

> No automated prompt mutation. You are always the one updating the Langfuse prompt.

---

## 6. Internal review UI (admin-only)

Routes (TanStack, gated by admin check):
- `/admin/evals` — dataset summary + latest run pass-rates per scorer
- `/admin/evals/runs/$runId` — case input, output, all scores side-by-side
- `/admin/evals/review` — queue (pending first), pick verdict + write prompt-fix note
- `/admin/evals/prompt-notes` — chronological feed of all `needs_prompt_fix` notes (your "what to fix in Langfuse next" view)
- `/admin/evals/datasets` — list cases, run "evaluate against current production prompt"

Not shown to end users; lives in the same TanStack app but behind an admin guard.

---

## 7. Runner

Server function `runEvalSuite({ promptLabel? = 'production' })`:

1. Load all `eval_cases`.
2. For each: invoke `assess-job` with the case input.
3. Persist `eval_run` + `langfuse_trace_id`.
4. Run code checks → heuristics → all judges. Persist `eval_scores`. Push scores to Langfuse.
5. Auto-enqueue failed runs to `eval_review_queue`.
6. Return aggregate pass-rate per scorer.

Triggers:
- Manual from `/admin/evals` ("Run all cases against current prompt")
- Optional daily cron at `/api/public/cron/evals-nightly` (HMAC-protected)

---

## 8. Wiring into `assess-job`

Minimal additive change after `extractJson`:

```ts
const scores = [
  ...runCodeChecks(result, { profile, jobDescription }),
  ...runHeuristics(result, { profile, jobDescription }),
];
EdgeRuntime.waitUntil(persistInlineEval({
  traceId: assessRes.traceId,
  output: result,
  scores,
  runJudges: Math.random() < SAMPLE_RATE,
}));
```

No user-visible behavior change.

---

## 9. Implementation order

1. Migration (5 tables + RLS + admin check helper)
2. `_shared/evals/{types,code-checks,heuristics,judges,persist}.ts`
3. Inline integration in `assess-job` + deploy
4. Hook `submit-feedback` → enqueue into `eval_review_queue`
5. `run-evals` Edge Function (runner)
6. Seed 5–10 hand-picked CV+JD pairs
7. `/admin/evals` UI (review queue + prompt-fix notes view first; runner UI second)
8. Optional nightly cron

Recommend landing 1–4 first (scoring + queue working, no UI yet, visible in Langfuse and DB), then 5–7 in a second pass.

---

## Open questions

1. **Admin gating**: simple env-allowlisted email (your email only) for now, or proper `user_roles` table with `admin` role? I lean env-allowlist for speed since it's just you.
2. **Auto-promote to dataset**: every production correction → eval case automatically, or only when you click "Promote"? I lean manual promote to keep the dataset curated.
3. **Judge sampling rate** in production: default 10% — OK?
