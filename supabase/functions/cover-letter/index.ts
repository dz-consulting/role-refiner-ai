import { corsHeaders } from "../_shared/cors.ts";
import { callClaude, extractJson } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { profile, cvText, jobDescription, company, roleTitle, fitSummary, requirements, tone, extraNotes } = await req.json();
    if (!jobDescription || !profile) {
      return new Response(JSON.stringify({ error: "jobDescription and profile required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Write a tailored cover letter for the user applying to the role below. It must be truthful — do NOT invent experience, employers, metrics, certifications, or dates. Only use what is in the CV / profile.

CANDIDATE PROFILE (ground truth):
{{profile}}

CV TEXT (for additional voice / detail):
"""
{{cvText}}
"""

TARGET COMPANY: {{company}}
TARGET ROLE: {{roleTitle}}

JOB DESCRIPTION:
"""
{{jobDescription}}
"""

ASSESSMENT FIT SUMMARY (why this candidate fits / where gaps are):
{{fitSummary}}

KEY REQUIREMENTS (with the model's rating of candidate evidence):
{{requirements}}

TONE: {{tone}}
EXTRA NOTES FROM USER (optional, may be empty):
{{extraNotes}}

Guidelines:
- 250-380 words, 3-5 short paragraphs. No filler, no clichés ("I am writing to apply…", "team player", "passionate").
- Open with a sharp hook: a concrete reason this specific role at this specific company is a fit — tie to a real outcome from the CV.
- Middle paragraphs: 2-3 specific, evidence-backed proof points that map to the top JD requirements. Lead with the outcome, not the task.
- Address the biggest gap honestly if it's likely to come up — reframe with adjacent evidence, do not lie.
- Close with a clear, low-pressure call to action.
- Match the requested tone. Default is "professional but human" — direct, warm, no corporate-speak.
- Plain text only. No markdown headers. Use real paragraph breaks.

Return ONLY valid JSON, no markdown:
{
  "greeting": string,            // e.g. "Dear Hiring Team," — use specific name only if obvious from JD
  "paragraphs": string[],        // 3-5 paragraphs of the letter body, in order
  "closing": string,             // e.g. "Best regards,"
  "signature": string,           // candidate's name from profile
  "subject_line": string,        // suggested email subject if sent via email
  "rationale": string            // 1-2 sentences explaining the angle you took, for the user (not part of the letter)
}`;

    const { text: raw } = await callClaude({
      promptName: "cover-letter.write",
      userPrompt: prompt,
      variables: {
        profile: JSON.stringify(profile, null, 2),
        cvText: (cvText ?? "").slice(0, 15000),
        company: company ?? "",
        roleTitle: roleTitle ?? "",
        jobDescription: jobDescription.slice(0, 15000),
        fitSummary: fitSummary ?? "",
        requirements: JSON.stringify(requirements ?? [], null, 2).slice(0, 8000),
        tone: tone || "professional but human",
        extraNotes: extraNotes || "(none)",
      },
      maxTokens: 2000,
      functionName: "cover-letter.write",
    });
    const letter = extractJson(raw);

    return new Response(JSON.stringify({ letter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cover-letter error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
