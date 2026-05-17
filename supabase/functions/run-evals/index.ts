// run-evals: admin-only runner that executes assess-job against stored fixtures
// and persists eval_runs + eval_scores. Calls the assess-job function over HTTP
// so we hit the exact production code path.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { runCodeChecks } from "../_shared/evals/code-checks.ts";
import { runHeuristics } from "../_shared/evals/heuristics.ts";
import { runJudges } from "../_shared/evals/judges.ts";
import type { Score } from "../_shared/evals/types.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Gate via is_admin() RPC
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const caseIds: string[] | undefined = body.caseIds;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let q = admin.from("eval_cases").select("id, profile, job_description");
    if (caseIds && caseIds.length > 0) q = q.in("id", caseIds);
    const { data: cases, error: casesErr } = await q;
    if (casesErr) return json({ error: casesErr.message }, 500);
    if (!cases || cases.length === 0) return json({ message: "No cases", runs: [] });

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const runs: Array<{ case_id: string; run_id: string | null; passed: number; failed: number; error?: string }> = [];

    for (const c of cases) {
      const t0 = Date.now();
      try {
        const res = await fetch(`${supaUrl}/functions/v1/assess-job`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ profile: c.profile, jobDescription: c.job_description }),
        });
        const latency = Date.now() - t0;
        const output: any = await res.json();
        if (!res.ok) {
          const { data: r } = await admin.from("eval_runs").insert({
            case_id: c.id,
            prompt_label: "production",
            latency_ms: latency,
            error: typeof output?.error === "string" ? output.error : `HTTP ${res.status}`,
          }).select("id").single();
          runs.push({ case_id: c.id, run_id: r?.id ?? null, passed: 0, failed: 0, error: `HTTP ${res.status}` });
          continue;
        }

        const { data: run, error: rErr } = await admin.from("eval_runs").insert({
          case_id: c.id,
          prompt_label: "production",
          model: "claude-sonnet-4-5",
          langfuse_trace_id: output.langfuse_assess_trace_id ?? null,
          output,
          latency_ms: latency,
        }).select("id").single();
        if (rErr || !run) {
          runs.push({ case_id: c.id, run_id: null, passed: 0, failed: 0, error: rErr?.message });
          continue;
        }

        const ctx = { profile: c.profile as any, jobDescription: c.job_description as string };
        const scores: Score[] = [
          ...runCodeChecks(output, ctx),
          ...runHeuristics(output, ctx),
          ...(await runJudges({ output, ctx, parentTraceId: output.langfuse_assess_trace_id })),
        ];

        if (scores.length > 0) {
          await admin.from("eval_scores").insert(
            scores.map((s) => ({
              run_id: run.id,
              scorer: s.scorer,
              name: s.name,
              value: s.value ?? null,
              passed: s.passed ?? null,
              detail: s.detail ?? null,
            })),
          );
        }

        const failedScores = scores.filter((s) => s.passed === false || (s.scorer === "llm_judge" && (s.value ?? 5) <= 2));
        if (failedScores.length > 0) {
          await admin.from("eval_review_queue").insert({
            run_id: run.id,
            reason: `runner: ${failedScores.map((s) => `${s.scorer}.${s.name}`).join(", ").slice(0, 500)}`,
            status: "pending",
          });
        }

        runs.push({
          case_id: c.id,
          run_id: run.id,
          passed: scores.filter((s) => s.passed === true).length,
          failed: failedScores.length,
        });
      } catch (e) {
        runs.push({ case_id: c.id, run_id: null, passed: 0, failed: 0, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return json({ runs });
  } catch (e) {
    console.error("run-evals error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
