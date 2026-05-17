// Heuristic (rule-based, fuzzy) checks for assess-job output.

import type { AssessContext, AssessOutput, Score } from "./types.ts";

const LANG_KEYWORDS: Record<string, string[]> = {
  german: ["german", "deutsch", "muttersprache", "verhandlungssicher"],
  french: ["french", "francais", "français"],
  spanish: ["spanish", "espanol", "español"],
  italian: ["italian", "italiano"],
  english: ["english", "englisch"],
  portuguese: ["portuguese", "português"],
  dutch: ["dutch", "nederlands"],
};

const STRONG_PROFICIENCIES = new Set([
  "b2", "c1", "c2",
  "fluent", "native", "bilingual",
  "muttersprache", "verhandlungssicher",
]);

export function runHeuristics(out: AssessOutput, ctx: AssessContext): Score[] {
  const scores: Score[] = [];
  const push = (
    name: string,
    passed: boolean,
    detail?: Record<string, unknown>,
    value?: number,
  ) =>
    scores.push({
      scorer: "heuristic",
      name,
      passed,
      value: value ?? (passed ? 1 : 0),
      detail,
    });

  const jdLower = (ctx.jobDescription ?? "").toLowerCase();
  const reqs = out.requirements ?? [];

  // 1. Language Gap false-positive
  const candidateLangs = (ctx.profile.languages ?? [])
    .filter((l) => l?.proficiency && STRONG_PROFICIENCIES.has(l.proficiency.toLowerCase()))
    .map((l) => (l.name ?? "").toLowerCase());

  const falseLanguageGaps: string[] = [];
  for (const r of reqs) {
    if (r.match_strength !== "Gap") continue;
    const rLower = (r.requirement ?? "").toLowerCase();
    for (const [canonical, kws] of Object.entries(LANG_KEYWORDS)) {
      if (!kws.some((kw) => rLower.includes(kw))) continue;
      if (candidateLangs.some((cl) => cl.includes(canonical) || canonical.includes(cl))) {
        falseLanguageGaps.push(r.requirement);
      }
    }
  }
  push("no_false_language_gaps", falseLanguageGaps.length === 0, {
    examples: falseLanguageGaps.slice(0, 3),
  });

  // 2. Skill overlap vs fit_score calibration
  const skills = (ctx.profile.skills ?? []).map((s) => String(s).toLowerCase());
  const overlap = skills.length === 0
    ? 0
    : skills.filter((s) => s.length > 2 && jdLower.includes(s)).length / skills.length;

  const fs = out.fit_score;
  if (typeof fs === "number" && skills.length >= 5) {
    const overscored = fs >= 7 && overlap < 0.25;
    const underscored = fs <= 3 && overlap > 0.6;
    push("fit_score_calibrated", !overscored && !underscored, {
      fit_score: fs,
      skill_overlap: Math.round(overlap * 100) / 100,
      overscored,
      underscored,
    }, overlap);
  }

  // 3. Action-item priority/effort distribution variety
  const items = out.action_items ?? [];
  if (items.length >= 3) {
    const priorities = new Set(items.map((i) => i.priority));
    const efforts = new Set(items.map((i) => i.effort));
    push("action_items_priority_variety", priorities.size >= 2, {
      priorities: Array.from(priorities),
    });
    push("action_items_effort_variety", efforts.size >= 2, {
      efforts: Array.from(efforts),
    });
  }

  // 4. No hallucinated requirements — fuzzy match each requirement back to JD
  const hallucinated: string[] = [];
  for (const r of reqs) {
    const req = (r.requirement ?? "").toLowerCase();
    if (req.length < 4) continue;
    // crude: at least one 4+ char token should appear in JD
    const tokens = req.split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    if (tokens.length === 0) continue;
    const hit = tokens.some((t) => jdLower.includes(t));
    if (!hit) hallucinated.push(r.requirement);
  }
  push("requirements_grounded_in_jd", hallucinated.length === 0, {
    examples: hallucinated.slice(0, 3),
  });

  // 5. Deal-breaker surfaced as screening risk if JD likely conflicts
  const dealBreakersRaw = ctx.profile.preferences?.deal_breakers;
  const dealBreakers = Array.isArray(dealBreakersRaw)
    ? dealBreakersRaw
    : typeof dealBreakersRaw === "string"
    ? dealBreakersRaw.split(/[,;\n]/)
    : [];

  const risks = (out.screening_risks ?? []).join(" ").toLowerCase();
  const unsurfaced: string[] = [];
  for (const db of dealBreakers) {
    const k = String(db).toLowerCase().trim();
    if (k.length < 3) continue;
    const jdMentions = jdLower.includes(k);
    if (jdMentions && !risks.includes(k)) unsurfaced.push(db);
  }
  if (dealBreakers.length > 0) {
    push("deal_breakers_surfaced", unsurfaced.length === 0, {
      unsurfaced: unsurfaced.slice(0, 3),
    });
  }

  return scores;
}
