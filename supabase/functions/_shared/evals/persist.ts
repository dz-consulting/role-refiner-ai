// Persistence helpers for evals. Uses service role to bypass RLS so we can write
// from inside the Edge Function regardless of caller auth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { AssessContext, AssessOutput, Score } from "./types.ts";
import { runCodeChecks } from "./code-checks.ts";
import { runHeuristics } from "./heuristics.ts";
import { runJudges } from "./judges.ts";

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const SAMPLE_RATE = Number(Deno.env.get("EVAL_JUDGE_SAMPLE_RATE") ?? "0.1");

/**
 * Inline evaluation hook: run code + heuristic checks synchronously (cheap),
 * judges async via EdgeRuntime.waitUntil at configured sample rate.
 * Writes one eval_run row (case_id=null, source=inline) and N eval_scores rows.
 * Auto-enqueues into eval_review_queue when any check fails.
 */
export async function persistInlineEval(opts: {
  output: AssessOutput;
  ctx: AssessContext;
  langfuseTraceId?: string;
  model?: string;
  latencyMs?: number;
  assessmentId?: string | null;
}): Promise<void> {
  const { output, ctx, langfuseTraceId, model, latencyMs, assessmentId } = opts;
  const supa = adminClient();

  const codeScores = runCodeChecks(output, ctx);
  const heurScores = runHeuristics(output, ctx);
  const sync: Score[] = [...codeScores, ...heurScores];

  // Insert run with no case_id (inline / production traffic).
  const { data: run, error: runErr } = await supa
    .from("eval_runs")
    .insert({
      case_id: null,
      prompt_label: "production",
      model: model ?? "claude-sonnet-4-5",
      langfuse_trace_id: langfuseTraceId ?? null,
      output,
      latency_ms: latencyMs ?? null,
    })
    .select("id")
    .single();

  // If insert failed (likely because case_id is NOT NULL), fall back to skipping
  // run persistence and just enqueue the failures linked to the assessment.
  let runId: string | null = run?.id ?? null;
  if (runErr) {
    console.error("eval_runs insert failed (inline, no case_id):", runErr.message);
    runId = null;
  }

  if (runId && sync.length > 0) {
    await supa.from("eval_scores").insert(
      sync.map((s) => ({
        run_id: runId,
        scorer: s.scorer,
        name: s.name,
        value: s.value ?? null,
        passed: s.passed ?? null,
        detail: s.detail ?? null,
      })),
    );
  }

  // Auto-enqueue failed checks for human review.
  const failed = sync.filter((s) => s.passed === false);
  if (failed.length > 0) {
    await supa.from("eval_review_queue").insert({
      run_id: runId,
      assessment_id: assessmentId ?? null,
      reason: `auto: ${failed.map((s) => `${s.scorer}.${s.name}`).join(", ").slice(0, 500)}`,
      status: "pending",
    });
  }

  // Sample judges (async fire-and-forget via EdgeRuntime.waitUntil).
  if (Math.random() < SAMPLE_RATE) {
    // deno-lint-ignore no-explicit-any
    const er = (globalThis as any).EdgeRuntime;
    const work = (async () => {
      try {
        const judgeScores = await runJudges({ output, ctx, parentTraceId: langfuseTraceId });
        if (runId && judgeScores.length > 0) {
          await supa.from("eval_scores").insert(
            judgeScores.map((s) => ({
              run_id: runId,
              scorer: s.scorer,
              name: s.name,
              value: s.value ?? null,
              passed: s.passed ?? null,
              detail: s.detail ?? null,
            })),
          );
        }
        const lowJudge = judgeScores.filter((s) => (s.value ?? 5) <= 2);
        if (lowJudge.length > 0) {
          await supa.from("eval_review_queue").insert({
            run_id: runId,
            assessment_id: assessmentId ?? null,
            reason: `judge_low: ${lowJudge.map((s) => s.name).join(", ")}`,
            status: "pending",
          });
        }
      } catch (e) {
        console.error("judge persistence failed:", e);
      }
    })();
    if (er?.waitUntil) er.waitUntil(work); else await work.catch(() => {});
  }
}
