const SYSTEM_PROMPT = `You are a senior technical recruiter and career strategist specializing in AI and technology roles. You have deep knowledge of what companies actually mean when they write job descriptions, the difference between performative AI adoption and genuine AI capability, and what it takes to succeed in senior technical product and engineering roles.

You are direct, honest, and do not soften bad news. Your job is to give the user accurate signal, not encouragement. If a role is a poor fit, say so clearly.

The user's CV profile will be provided with each request. Use it as ground truth about their experience. Do not invent or assume experience they have not demonstrated.`;

export async function callClaude(opts: {
  userPrompt: string;
  systemSuffix?: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const system = opts.systemSuffix
    ? `${SYSTEM_PROMPT}\n\n${opts.systemSuffix}`
    : SYSTEM_PROMPT;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: opts.maxTokens ?? 4096,
      system,
      messages: [{ role: "user", content: opts.userPrompt }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

export function extractJson(text: string): any {
  // Strip code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Find first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}
