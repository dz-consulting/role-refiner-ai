import { corsHeaders } from "../_shared/cors.ts";
import { callClaude, extractJson } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { cvText, profile, jobDescription } = await req.json();
    if (!cvText || !jobDescription) {
      return new Response(JSON.stringify({ error: "cvText and jobDescription required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Rewrite the user's CV to emphasize what is most relevant for the target job. Do NOT fabricate any experience, skill, employer, date, or metric. Only reframe and reorder what already exists.

ORIGINAL CV TEXT:
"""
{{cvText}}
"""

EXTRACTED PROFILE (ground truth):
{{profile}}

TARGET JOB DESCRIPTION:
"""
{{jobDescription}}
"""

Return ONLY valid JSON, no markdown, matching this schema:
{
  "name": string,
  "title": string,                       // sharpened headline title (still truthful)
  "contact": string,                     // email / phone / location / links if present in CV, single line
  "summary": string,                     // 3-4 sentence professional summary, rewritten for this role
  "experience": [
    {
      "role": string,
      "company": string,
      "duration": string,
      "bullets": string[]                // 3-6 bullets, reframed/reordered for this JD
    }
  ],
  "skills": string[],                    // skills relevant to this role, prioritized
  "education": [{ "degree": string, "institution": string, "year": string }]
}

ATS-friendly. Plain language. No fluff. No invented metrics.`;

    const { text: raw } = await callClaude({
      promptName: "tailor-cv.rewrite",
      userPrompt: prompt,
      variables: {
        cvText: cvText.slice(0, 25000),
        profile: JSON.stringify(profile, null, 2),
        jobDescription: jobDescription.slice(0, 15000),
      },
      maxTokens: 4000,
      functionName: "tailor-cv.rewrite",
    });
    const tailored = extractJson(raw);

    return new Response(JSON.stringify({ tailored }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tailor-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
