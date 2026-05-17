// LLM-as-judge rubrics for assess-job. Each judge is a separate Claude call with
// a Langfuse-managed prompt (auto-created on first run). Returns Score[].

import { callClaude, extractJson, sendLangfuseScore } from "../claude.ts";
import type { AssessContext, AssessOutput, Score } from "./types.ts";

interface JudgeSpec {
  name: string;          // becomes Langfuse prompt name: evals.judge.<name>
  description: string;   // human-friendly
  rubric: string;        // default template, editable in Langfuse afterwards
}

const JUDGES: JudgeSpec[] = [
  {
    name: "fit_summary_quality",
    description: "Is the fit summary honest, specific, and free of marketing fluff?",
    rubric: `You are an evaluator. Score the fit_summary below from 1-5.

Rubric:
- 5: Honest, specific to this candidate+role, names concrete strengths AND gaps, no hedging.
- 4: Mostly specific, minor hedging.
- 3: Generic but accurate.
- 2: Mostly generic platitudes or one-sided (only positives or only negatives).
- 1: Fabricated, contradicts the data, or pure marketing fluff.

CANDIDATE PROFILE (truncated):
{{profile}}

JOB DESCRIPTION (truncated):
{{jd}}

FIT SUMMARY TO EVALUATE:
"""
{{fit_summary}}
"""

Return ONLY JSON: {"score": 1-5, "rationale": string, "failures": string[]}`,
  },
  {
    name: "action_items_actionability",
    description: "Are action items specific, concrete, and tied to real gaps?",
    rubric: `You are an evaluator. Score the action_items list from 1-5.

Rubric:
- 5: Every item is specific, concretely doable, tied to a named gap or risk, varied in priority/effort.
- 3: Mostly actionable, some generic items (e.g. "improve communication").
- 1: Generic platitudes, not tied to gaps, repetitive.

ACTION ITEMS:
{{action_items}}

KNOWN GAPS / RISKS:
{{gaps_and_risks}}

Return ONLY JSON: {"score": 1-5, "rationale": string, "failures": string[]}`,
  },
  {
    name: "company_intel_grounding",
    description: "Is company_intel factually grounded? No fabrication?",
    rubric: `You are an evaluator. Score the company_intel below from 1-5 on grounding.

Rubric:
- 5: All claims plausibly supported by the JD or well-known facts about the company. Uses "Unknown" where appropriate.
- 3: Mostly grounded, some unsupported but plausible inferences.
- 1: Fabricated specifics (fake funding rounds, fake hiring manager names, invented news).

JOB DESCRIPTION:
{{jd}}

COMPANY INTEL:
{{company_intel}}

Return ONLY JSON: {"score": 1-5, "rationale": string, "failures": string[]}`,
  },
  {
    name: "requirements_calibration",
    description: "Are Strong/Partial/Gap ratings defensible given evidence?",
    rubric: `You are an evaluator. Score how well-calibrated the match_strength ratings are, from 1-5.

Rubric:
- 5: Every rating is defensible given the evidence cited and the candidate profile.
- 3: A couple of miscalibrations (e.g. Strong with weak evidence, Gap with clear evidence).
- 1: Systematic miscalibration.

CANDIDATE PROFILE (truncated):
{{profile}}

REQUIREMENTS WITH RATINGS:
{{requirements}}

Return ONLY JSON: {"score": 1-5, "rationale": string, "failures": string[]}`,
  },
];

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export async function runJudges(opts: {
  output: AssessOutput;
  ctx: AssessContext;
  parentTraceId?: string; // optional Langfuse trace to attach scores to
}): Promise<Score[]> {
  const { output, ctx, parentTraceId } = opts;

  const profileStr = truncate(JSON.stringify(ctx.profile), 6000);
  const jdStr = truncate(ctx.jobDescription ?? "", 6000);

  const gapsAndRisks = JSON.stringify({
    gaps: (output.requirements ?? [])
      .filter((r) => r.match_strength === "Gap")
      .map((r) => r.requirement),
    risks: output.screening_risks ?? [],
  });

  const variableMap: Record<string, Record<string, string>> = {
    fit_summary_quality: {
      profile: profileStr,
      jd: jdStr,
      fit_summary: output.fit_summary ?? "",
    },
    action_items_actionability: {
      action_items: JSON.stringify(output.action_items ?? [], null, 2),
      gaps_and_risks: gapsAndRisks,
    },
    company_intel_grounding: {
      jd: jdStr,
      company_intel: JSON.stringify(output.company_intel ?? null, null, 2),
    },
    requirements_calibration: {
      profile: profileStr,
      requirements: JSON.stringify(output.requirements ?? [], null, 2),
    },
  };

  const scores: Score[] = [];

  for (const judge of JUDGES) {
    try {
      const res = await callClaude({
        promptName: `evals.judge.${judge.name}`,
        userPrompt: judge.rubric,
        variables: variableMap[judge.name],
        maxTokens: 800,
        functionName: `evals.judge.${judge.name}`,
      });
      const parsed = extractJson(res.text) as {
        score?: number;
        rationale?: string;
        failures?: string[];
      };
      const score = Number(parsed.score);
      const valid = Number.isFinite(score) && score >= 1 && score <= 5;
      scores.push({
        scorer: "llm_judge",
        name: judge.name,
        value: valid ? score : undefined,
        passed: valid ? score >= 3 : false,
        detail: {
          rationale: parsed.rationale ?? "",
          failures: parsed.failures ?? [],
          judge_trace_id: res.traceId,
        },
      });
      // Push the score onto the PRODUCTION trace so it's visible in Langfuse alongside the run.
      if (parentTraceId && valid) {
        await sendLangfuseScore({
          traceId: parentTraceId,
          name: `judge.${judge.name}`,
          value: score,
          comment: parsed.rationale,
        });
      }
    } catch (err) {
      console.error(`judge ${judge.name} failed:`, err);
      scores.push({
        scorer: "llm_judge",
        name: judge.name,
        passed: false,
        detail: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  return scores;
}
