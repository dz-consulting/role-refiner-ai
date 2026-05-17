// Deterministic code checks for assess-job output.
// All pure — no external calls. Each returns Score[].

import type { AssessContext, AssessOutput, Score } from "./types.ts";

const PRIORITIES = new Set(["High", "Medium", "Low"]);
const EFFORTS = new Set(["Quick", "Medium", "Deep"]);
const STRENGTHS = new Set(["Strong", "Partial", "Gap"]);
const LABELS = new Set(["STRONG FIT", "PARTIAL FIT", "POOR FIT"]);

export function runCodeChecks(out: AssessOutput, _ctx: AssessContext): Score[] {
  const scores: Score[] = [];

  const push = (name: string, passed: boolean, detail?: Record<string, unknown>) =>
    scores.push({ scorer: "code", name, passed, value: passed ? 1 : 0, detail });

  // schema-level presence
  push("has_fit_score", typeof out.fit_score === "number");
  push("has_fit_label", typeof out.fit_label === "string");
  push("has_fit_summary", typeof out.fit_summary === "string" && (out.fit_summary?.length ?? 0) > 0);

  // fit_score range + half-point increments
  if (typeof out.fit_score === "number") {
    const inRange = out.fit_score >= 0 && out.fit_score <= 10;
    const halfStep = Math.abs(out.fit_score * 2 - Math.round(out.fit_score * 2)) < 1e-9;
    push("fit_score_range", inRange, { fit_score: out.fit_score });
    push("fit_score_half_step", halfStep, { fit_score: out.fit_score });
  }

  // fit_label enum
  if (out.fit_label) {
    push("fit_label_enum", LABELS.has(out.fit_label), { fit_label: out.fit_label });
  }

  // fit_label consistent with score: STRONG >= 7.5, PARTIAL 4-7, POOR < 4
  if (typeof out.fit_score === "number" && out.fit_label) {
    let expected: string;
    if (out.fit_score >= 7.5) expected = "STRONG FIT";
    else if (out.fit_score >= 4) expected = "PARTIAL FIT";
    else expected = "POOR FIT";
    push("fit_label_consistent_with_score", out.fit_label === expected, {
      fit_score: out.fit_score,
      fit_label: out.fit_label,
      expected,
    });
  }

  // requirements
  const reqs = out.requirements ?? [];
  push("requirements_nonempty", reqs.length > 0, { count: reqs.length });

  const missingEvidence = reqs.filter((r) => !r?.evidence || r.evidence.trim().length === 0);
  push("requirements_have_evidence", missingEvidence.length === 0, {
    missing: missingEvidence.length,
  });

  const badStrength = reqs.filter((r) => !STRENGTHS.has(r?.match_strength));
  push("match_strength_in_enum", badStrength.length === 0, {
    bad: badStrength.map((r) => r.match_strength).slice(0, 5),
  });

  // action items
  const items = out.action_items ?? [];
  push("action_items_count_in_range", items.length >= 4 && items.length <= 7, { count: items.length });

  const badPriority = items.filter((i) => !PRIORITIES.has(i?.priority));
  push("priority_enum", badPriority.length === 0, { bad: badPriority.length });

  const badEffort = items.filter((i) => !EFFORTS.has(i?.effort));
  push("effort_enum", badEffort.length === 0, { bad: badEffort.length });

  // action_items.addresses should reference a known requirement/risk
  const knownTargets = new Set<string>();
  for (const r of reqs) if (r?.requirement) knownTargets.add(normalize(r.requirement));
  for (const s of out.screening_risks ?? []) if (s) knownTargets.add(normalize(s));

  const orphanItems = items.filter((i) => {
    if (!i?.addresses) return true;
    const a = normalize(i.addresses);
    for (const t of knownTargets) {
      if (a.includes(t) || t.includes(a)) return false;
    }
    return true;
  });
  push("action_items_address_known_keys", orphanItems.length === 0, {
    orphans: orphanItems.map((i) => i.addresses).slice(0, 5),
  });

  // company_intel schema: if present, must have what_they_do.summary
  const intel = out.company_intel;
  if (intel && typeof intel === "object") {
    const what = (intel as Record<string, unknown>)["what_they_do"] as
      | Record<string, unknown>
      | undefined;
    push(
      "company_intel_has_summary",
      typeof what?.summary === "string" && (what.summary as string).length > 0,
    );
  }

  return scores;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
