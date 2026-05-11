import { corsHeaders } from "../_shared/cors.ts";
import { callClaude, extractJson } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { profile, jobDescription } = await req.json();
    if (!profile || !jobDescription) {
      return new Response(JSON.stringify({ error: "profile and jobDescription required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (jobDescription.trim().split(/\s+/).length < 100) {
      return new Response(
        JSON.stringify({ error: "This doesn't look like a complete job description. Please paste the full JD." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `You will assess fit between this user's CV profile and a specific job description. Return ONLY valid JSON, no markdown.

CV PROFILE:
${JSON.stringify(profile, null, 2)}

JOB DESCRIPTION:
"""
${jobDescription.slice(0, 20000)}
"""

Return JSON exactly matching this schema:
{
  "company": string|null,
  "role_title": string|null,
  "job_decoder": {
    "ai_maturity": "naive" | "emerging" | "mature" | "ai-native",
    "ai_maturity_reason": string,                // one sentence
    "real_seniority": string,                    // e.g. "Staff / Principal IC, 12+ yrs"
    "unstated_requirements": string[],           // 2-3 items the JD implies but doesn't say
    "red_flags": string[]                        // empty array if none
  },
  "fit_score": number,                           // 0-10, integer or one decimal
  "fit_label": "STRONG FIT" | "PARTIAL FIT" | "POOR FIT",
  "fit_summary": string,                         // ONE honest sentence, no softening
  "requirements": [                              // minimum 6 rows, one per key requirement
    { "requirement": string, "evidence": string, "match_strength": "Strong" | "Partial" | "Gap" }
  ],
  "screening_risks": string[]                    // 2-3 blunt items that could screen them out
}

Be direct. Do not hedge. If the user lacks evidence for a requirement, mark it Gap and say so.`;

    const raw = await callClaude({ userPrompt: prompt, maxTokens: 4000 });
    const result = extractJson(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assess-job error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
