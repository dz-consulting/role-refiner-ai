import { corsHeaders } from "../_shared/cors.ts";
import { callClaude, extractJson } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Debug: ping Langfuse directly so we can see auth/schema errors.
  let bodyJson: any = {};
  try { bodyJson = await req.json(); } catch (_) {}
  if (bodyJson?.debug === "langfuse") {
    const pub = Deno.env.get("LANGFUSE_PUBLIC_KEY") ?? "";
    const sec = Deno.env.get("LANGFUSE_SECRET_KEY") ?? "";
    const now = new Date().toISOString();
    const payload = {
      batch: [{
        type: "trace-create",
        id: crypto.randomUUID(),
        timestamp: now,
        body: { id: crypto.randomUUID(), timestamp: now, name: "debug-ping", input: "ping", output: "pong" },
      }],
    };
    const res = await fetch("https://cloud.langfuse.com/api/public/ingestion", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${pub}:${sec}`)}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    return new Response(JSON.stringify({
      hasPublic: !!pub, hasSecret: !!sec,
      publicPrefix: pub.slice(0, 6), secretPrefix: sec.slice(0, 6),
      status: res.status, body,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { profile, jobDescription } = bodyJson;
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

    const assessPrompt = `You will assess fit between this user's CV profile and a specific job description. Return ONLY valid JSON, no markdown.

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
    "ai_maturity_reason": string,
    "real_seniority": string,
    "unstated_requirements": string[],
    "red_flags": string[]
  },
  "fit_score": number,  // between 0 and 10, only half-point increments allowed (e.g. 0, 0.5, 1, 1.5, ... 10)
  "fit_label": "STRONG FIT" | "PARTIAL FIT" | "POOR FIT",
  "fit_summary": string,
  "requirements": [
    { "requirement": string, "evidence": string, "match_strength": "Strong" | "Partial" | "Gap" }
  ],
  "screening_risks": string[],
  "action_items": [
    { "title": string, "detail": string, "priority": "High" | "Medium" | "Low", "effort": "Quick" | "Medium" | "Deep", "addresses": string }
  ]
}

Generate 4-7 concrete, specific action_items the candidate can take to close gaps and increase fit. Each item: a short imperative title, a 1-2 sentence detail with how to do it, a priority, an effort estimate (Quick = under a day, Medium = a few days, Deep = a week+), and "addresses" naming the specific gap, requirement, or screening risk it tackles. Prioritize actions that close Gap requirements and screening risks. Be direct. Do not hedge. If the user lacks evidence for a requirement, mark it Gap and say so.`;

    const intelPrompt = `You will produce a company intelligence dossier for a job candidate. Return ONLY valid JSON, no markdown.

Use what you know about the company from the JD and your training knowledge. Be honest about uncertainty: when you don't know, say "Unknown" or null rather than inventing facts. Do NOT regurgitate marketing copy.

CANDIDATE BACKGROUND (for the "why this matters" angle):
${JSON.stringify({ title: profile.title, years_experience: profile.years_experience, skills: profile.skills?.slice?.(0, 20) }, null, 2)}

JOB DESCRIPTION:
"""
${jobDescription.slice(0, 20000)}
"""

Return JSON exactly matching this schema:
{
  "what_they_do": {
    "summary": string,                              // 2-3 sentences plain English, what they actually do and how they make money
    "business_model": "SaaS" | "Marketplace" | "Enterprise" | "Consumer" | "Other",
    "stage": "Early startup" | "Growth" | "Scale-up" | "Enterprise" | "Unknown"
  },
  "health": {
    "funding_status": string,                       // e.g. "Series C, $80M, 2023" or "Unknown"
    "headcount_trend": "Growing" | "Stable" | "Contracting" | "Unknown",
    "recent_news": string[],                        // 2-3 significant items, or [] if unknown
    "green_flags": string[],
    "red_flags": string[]
  },
  "ai_maturity": {
    "rating": "AI-washing" | "AI-curious" | "AI-enabled" | "AI-native",
    "evidence": string,                             // one paragraph, what signals support this rating
    "why_it_matters": string                        // one paragraph tied to the candidate's background
  },
  "hiring_manager": {
    "name": string|null,                            // null if not in the JD
    "background": string|null,                      // null if name unknown
    "tenure": string|null,
    "recent_focus": string|null,
    "founding_team_fallback": string|null           // populate if hiring manager name is null
  },
  "culture": {
    "employee_signal": string,                      // aggregate signal: what employees say (Glassdoor/LinkedIn/Blind patterns), or "Unknown"
    "work_style": string,                           // remote/hybrid/in-office, pace, ICs vs management heavy, etc.
    "watch_outs": string[]                          // honest concerns from public signal, [] if none
  }
}

If you genuinely don't recognize the company, say "Unknown company" in what_they_do.summary and use Unknown / null / [] throughout. Do not fabricate.`;

    const [assessRaw, intelRaw] = await Promise.all([
      callClaude({ userPrompt: assessPrompt, maxTokens: 4000 }),
      callClaude({ userPrompt: intelPrompt, maxTokens: 3000 }),
    ]);

    const result = extractJson(assessRaw);
    if (typeof result.fit_score === "number") {
      const clamped = Math.max(0, Math.min(10, result.fit_score));
      result.fit_score = Math.round(clamped * 2) / 2;
    }
    try {
      result.company_intel = extractJson(intelRaw);
    } catch (_e) {
      result.company_intel = null;
    }

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
