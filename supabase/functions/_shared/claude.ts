const SYSTEM_PROMPT = `You are a senior technical recruiter and career strategist specializing in AI and technology roles. You have deep knowledge of what companies actually mean when they write job descriptions, the difference between performative AI adoption and genuine AI capability, and what it takes to succeed in senior technical product and engineering roles.
You are direct, honest, and do not soften bad news. Your job is to give the user accurate signal, not encouragement. If a role is a poor fit, say so clearly.
The user's CV profile will be provided with each request. Use it as ground truth about their experience. Do not invent or assume experience they have not demonstrated.`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function logToSupabase(entry: {
  function_name: string;
  system_prompt: string;
  user_prompt: string;
  response: string | null;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number;
  error: string | null;
}) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/claude_logs`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error("Logging failed (non-fatal):", err);
  }
}
console.log("callClaude called, SUPABASE_URL:", Deno.env.get("SUPABASE_URL"));
export async function callClaude(opts: {
  userPrompt: string;
  systemSuffix?: string;
  maxTokens?: number;
  functionName?: string;
}): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const system = opts.systemSuffix ? `${SYSTEM_PROMPT}\n\n${opts.systemSuffix}` : SYSTEM_PROMPT;

  const startTime = Date.now();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: opts.maxTokens ?? 4096,
        system,
        messages: [{ role: "user", content: opts.userPrompt }],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      await logToSupabase({
        function_name: opts.functionName ?? "unknown",
        system_prompt: system,
        user_prompt: opts.userPrompt,
        response: null,
        model: "claude-sonnet-4-5",
        input_tokens: null,
        output_tokens: null,
        latency_ms: Date.now() - startTime,
        error: `Claude API error ${res.status}: ${t}`,
      });
      throw new Error(`Claude API error ${res.status}: ${t}`);
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text ?? "";

    await logToSupabase({
      function_name: opts.functionName ?? "unknown",
      system_prompt: system,
      user_prompt: opts.userPrompt,
      response: responseText,
      model: "claude-sonnet-4-5",
      input_tokens: data.usage?.input_tokens ?? null,
      output_tokens: data.usage?.output_tokens ?? null,
      latency_ms: Date.now() - startTime,
      error: null,
    });

    return responseText;
  } catch (err) {
    if (!(err instanceof Error && err.message.startsWith("Claude API error"))) {
      await logToSupabase({
        function_name: opts.functionName ?? "unknown",
        system_prompt: system,
        user_prompt: opts.userPrompt,
        response: null,
        model: "claude-sonnet-4-5",
        input_tokens: null,
        output_tokens: null,
        latency_ms: Date.now() - startTime,
        error: String(err),
      });
    }
    throw err;
  }
}

export function extractJson(text: string): any {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}
