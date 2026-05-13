// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { sendLangfuseScore } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const {
      assessment_id,
      target_type,
      target_key,
      original_value,
      corrected_value,
      comment,
    } = await req.json();

    if (!assessment_id || !target_type || !target_key) {
      return json({ error: "Missing fields" }, 400);
    }

    // Load assessment to get the trace id (and confirm ownership via RLS)
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, langfuse_assess_trace_id")
      .eq("id", assessment_id)
      .maybeSingle();
    if (aErr || !assessment) return json({ error: "Assessment not found" }, 404);

    const traceId = assessment.langfuse_assess_trace_id ?? null;

    const { error: upErr } = await supabase
      .from("assessment_feedback")
      .upsert(
        {
          assessment_id,
          user_id: user.id,
          target_type,
          target_key,
          original_value: original_value ?? null,
          corrected_value: corrected_value ?? null,
          comment: comment ?? null,
          langfuse_trace_id: traceId,
        },
        { onConflict: "assessment_id,target_type,target_key" },
      );
    if (upErr) return json({ error: upErr.message }, 500);

    // Push to Langfuse as a categorical + numeric score on the trace
    if (traceId) {
      const numeric = scoreFromCorrection(original_value, corrected_value);
      await sendLangfuseScore({
        traceId,
        name: target_type === "requirement" ? "requirement_rating_correction" : `${target_type}_feedback`,
        value: numeric,
        stringValue: corrected_value ?? undefined,
        comment: `target=${target_key} | was=${original_value ?? "?"} -> now=${corrected_value ?? "?"}${comment ? ` | ${comment}` : ""}`,
      });
    }

    return json({ ok: true });
  } catch (e) {
    console.error("submit-feedback error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 1.0 = model was right, 0.0 = adjacent miss, -1.0 = full inversion
function scoreFromCorrection(original?: string, corrected?: string): number | undefined {
  if (!original || !corrected) return undefined;
  if (original === corrected) return 1;
  const order = ["Gap", "Partial", "Strong"];
  const a = order.indexOf(original);
  const b = order.indexOf(corrected);
  if (a < 0 || b < 0) return 0;
  const diff = Math.abs(a - b);
  return diff === 1 ? 0 : -1;
}
