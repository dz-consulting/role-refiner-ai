const SYSTEM_PROMPT = `You are a senior technical recruiter and career strategist specializing in AI and technology roles. You have deep knowledge of what companies actually mean when they write job descriptions, the difference between performative AI adoption and genuine AI capability, and what it takes to succeed in senior technical product and engineering roles.
You are direct, honest, and do not soften bad news. Your job is to give the user accurate signal, not encouragement. If a role is a poor fit, say so clearly.
The user's CV profile will be provided with each request. Use it as ground truth about their experience. Do not invent or assume experience they have not demonstrated.`;

const LANGFUSE_SECRET_KEY = Deno.env.get("LANGFUSE_SECRET_KEY")!;
const LANGFUSE_PUBLIC_KEY = Deno.env.get("LANGFUSE_PUBLIC_KEY")!;
const LANGFUSE_BASE_URL = "https://cloud.langfuse.com";

function makeId() {
  return crypto.randomUUID();
}

async function sendToLangfuse(payload: object) {
  try {
    const credentials = btoa(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`);
    await fetch(`${LANGFUSE_BASE_URL}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Langfuse logging failed (non-fatal):", err);
  }
}

export async function callClaude(opts: {
  userPrompt: string;
  systemSuffix?: string;
  maxTokens?: number;
  functionName?: string;
}): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const system = opts.systemSuffix
    ? `${SYSTEM_PROMPT}\n\n${opts.systemSuffix}`
    : SYSTEM_PROMPT;

  const traceId = makeId();
  const generationId = makeId();
  const startTime = new Date().toISOString();

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
      throw new Error(`Claude API error ${res.status}: ${t}`);
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text ?? "";
    const endTime = new Date().toISOString();

    await sendToLangfuse({
      batch: [
        {
          type: "trace-create",
          id: makeId(),
          timestamp: startTime,
          body: {
            id: traceId,
            name: opts.functionName ?? "unknown",
            input: opts.userPrompt,
            output: responseText,
          },
        },
        {
          type: "generation-create",
          id: makeId(),
          timestamp: startTime,
          body: {
            id: generationId,
            traceId,
            name: opts.functionName ?? "unknown",
            model: "claude-sonnet-4-5",
            startTime,
            endTime,
            input: [
              { role: "system", content: system },
              { role: "user", content: opts.userPrompt },
            ],
            output: { role: "assistant", content: responseText },
            usage: {
              input: data.usage?.input_tokens ?? 0,
              output: data.usage?.output_tokens ?? 0,
            },
          },
        },
      ],
    });

    return responseText;

  } catch (