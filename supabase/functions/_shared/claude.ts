const SYSTEM_PROMPT_DEFAULT = `You are a senior technical recruiter and career strategist specializing in AI and technology roles. You have deep knowledge of what companies actually mean when they write job descriptions, the difference between performative AI adoption and genuine AI capability, and what it takes to succeed in senior technical product and engineering roles.
You are direct, honest, and do not soften bad news. Your job is to give the user accurate signal, not encouragement. If a role is a poor fit, say so clearly.
The user's CV profile will be provided with each request. Use it as ground truth about their experience. Do not invent or assume experience they have not demonstrated.`;

const LANGFUSE_SECRET_KEY = Deno.env.get("LANGFUSE_SECRET_KEY")!;
const LANGFUSE_PUBLIC_KEY = Deno.env.get("LANGFUSE_PUBLIC_KEY")!;
const LANGFUSE_BASE_URL = "https://cloud.langfuse.com";

console.log("[claude.ts] boot", {
  hasPublic: !!LANGFUSE_PUBLIC_KEY,
  hasSecret: !!LANGFUSE_SECRET_KEY,
});

function makeId() {
  return crypto.randomUUID();
}

function lfHeaders() {
  const credentials = btoa(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`);
  return {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

// In-memory cache so we don't refetch every call within the same isolate.
const promptCache = new Map<string, { prompt: string; version: number; fetchedAt: number }>();
const PROMPT_TTL_MS = 60_000;

/**
 * Fetch a prompt from Langfuse by name. If it doesn't exist, create it from
 * the provided default so the user can edit it in the Langfuse UI going forward.
 * Returns the resolved template plus version (for linking generations).
 */
async function getOrCreatePrompt(name: string, defaultTemplate: string): Promise<{ template: string; version: number | null; name: string }> {
  if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
    return { template: defaultTemplate, version: null, name };
  }

  const cached = promptCache.get(name);
  if (cached && Date.now() - cached.fetchedAt < PROMPT_TTL_MS) {
    return { template: cached.prompt, version: cached.version, name };
  }

  try {
    const res = await fetch(`${LANGFUSE_BASE_URL}/api/public/v2/prompts/${encodeURIComponent(name)}?label=production`, {
      headers: lfHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      const tpl = typeof data.prompt === "string" ? data.prompt : defaultTemplate;
      promptCache.set(name, { prompt: tpl, version: data.version ?? null, fetchedAt: Date.now() });
      return { template: tpl, version: data.version ?? null, name };
    }
    if (res.status === 404) {
      // Create it from the default so it shows up in Langfuse for editing.
      const createRes = await fetch(`${LANGFUSE_BASE_URL}/api/public/v2/prompts`, {
        method: "POST",
        headers: lfHeaders(),
        body: JSON.stringify({
          name,
          type: "text",
          prompt: defaultTemplate,
          labels: ["production"],
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        console.log(`Langfuse prompt created: ${name} v${created.version}`);
        promptCache.set(name, { prompt: defaultTemplate, version: created.version ?? 1, fetchedAt: Date.now() });
        return { template: defaultTemplate, version: created.version ?? 1, name };
      } else {
        console.error(`Langfuse prompt create failed for ${name}: ${createRes.status} ${await createRes.text()}`);
      }
    } else {
      console.error(`Langfuse prompt fetch failed for ${name}: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("getOrCreatePrompt error:", err);
  }
  return { template: defaultTemplate, version: null, name };
}

/** Replace {{var}} placeholders in a template. */
function compileTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

async function sendToLangfuse(payload: object) {
  try {
    if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) return;
    const res = await fetch(`${LANGFUSE_BASE_URL}/api/public/ingestion`, {
      method: "POST",
      headers: lfHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    if (!res.ok) console.error(`Langfuse ingestion failed: ${res.status} ${body}`);
    else console.log(`Langfuse ingestion ${res.status}`);
  } catch (err) {
    console.error("Langfuse logging failed (non-fatal):", err);
  }
}

export async function callClaude(opts: {
  /** Optional: when provided, the user prompt template is fetched from Langfuse (auto-created on first use). */
  promptName?: string;
  /** Default template used when promptName is missing in Langfuse, OR the literal user prompt when promptName is omitted. */
  userPrompt: string;
  /** Variables interpolated into {{var}} placeholders of the Langfuse template. */
  variables?: Record<string, string | number | undefined>;
  /** Optional: name of a Langfuse-managed system prompt. */
  systemPromptName?: string;
  systemSuffix?: string;
  maxTokens?: number;
  functionName?: string;
}): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  // Resolve system prompt (managed in Langfuse if requested).
  const systemRes = await getOrCreatePrompt(
    opts.systemPromptName ?? "system.recruiter",
    SYSTEM_PROMPT_DEFAULT,
  );
  const systemBase = systemRes.template;
  const system = opts.systemSuffix ? `${systemBase}\n\n${opts.systemSuffix}` : systemBase;

  // Resolve user prompt.
  let userPrompt = opts.userPrompt;
  let userPromptName: string | null = null;
  let userPromptVersion: number | null = null;
  if (opts.promptName) {
    const r = await getOrCreatePrompt(opts.promptName, opts.userPrompt);
    userPrompt = compileTemplate(r.template, opts.variables ?? {});
    userPromptName = r.name;
    userPromptVersion = r.version;
  }

  const traceId = makeId();
  const generationId = makeId();
  const startTime = new Date().toISOString();

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
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API error ${res.status}: ${t}`);
  }

  const data = await res.json();
  const responseText = data.content?.[0]?.text ?? "";
  const endTime = new Date().toISOString();

  const generationBody: Record<string, unknown> = {
    id: generationId,
    traceId,
    name: opts.functionName ?? "unknown",
    model: "claude-sonnet-4-5",
    startTime,
    endTime,
    input: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    output: { role: "assistant", content: responseText },
    usage: {
      input: data.usage?.input_tokens ?? 0,
      output: data.usage?.output_tokens ?? 0,
    },
  };
  if (userPromptName && userPromptVersion != null) {
    generationBody.promptName = userPromptName;
    generationBody.promptVersion = userPromptVersion;
  }

  await sendToLangfuse({
    batch: [
      {
        type: "trace-create",
        id: makeId(),
        timestamp: startTime,
        body: {
          id: traceId,
          timestamp: startTime,
          name: opts.functionName ?? "unknown",
          input: userPrompt,
          output: responseText,
        },
      },
      {
        type: "generation-create",
        id: makeId(),
        timestamp: startTime,
        body: generationBody,
      },
    ],
  });

  return responseText;
}

export function extractJson(raw: string): any {
  const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
  return JSON.parse(cleaned);
}
