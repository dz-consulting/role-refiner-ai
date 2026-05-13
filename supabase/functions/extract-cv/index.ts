import { corsHeaders } from "../_shared/cors.ts";
import { callClaude, extractJson } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { cvText } = await req.json();
    if (!cvText || cvText.length < 100) {
      return new Response(JSON.stringify({ error: "CV text is too short." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Extract a structured profile from the following CV. Return ONLY valid JSON matching this schema, no markdown:

{
  "name": string,
  "title": string,                  // current or most recent role title
  "years_experience": number,       // total years of professional experience (integer)
  "skills": string[],               // top 12 skills, ordered by seniority/relevance
  "roles": [{ "title": string, "company": string, "duration": string }],
  "outcomes": string[],             // 5-8 concrete, quantified achievements
  "seniority_signals": string[]     // 3-6 phrases evidencing seniority (scope, team size, budget, ambiguity)
}

CV:
"""
{{cvText}}
"""`;

    const { text: raw } = await callClaude({
      promptName: "extract-cv.profile",
      userPrompt: prompt,
      variables: { cvText: cvText.slice(0, 30000) },
      maxTokens: 2000,
      functionName: "extract-cv.profile",
    });
    const profile = extractJson(raw);

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
