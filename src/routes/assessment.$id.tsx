import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";
import { getAnonAssessment, updateAnonAssessment } from "@/lib/anon-store";

export const Route = createFileRoute("/assessment/$id")({
  beforeLoad: requireAuth,
  component: AssessmentView,
});

function AssessmentView() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [a, setA] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [isAnon, setIsAnon] = useState(false);
  const [fitFeedback, setFitFeedback] = useState<"better" | "worse" | null>(null);
  const [fitFeedbackBusy, setFitFeedbackBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Try anon store first when id is anon-prefixed
      if (id.startsWith("anon-")) {
        setIsAnon(true);
        const local = getAnonAssessment(id);
        setA(local);
        setFeedback(local?.feedback ?? {});
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
      setA(data);
      const { data: fb } = await supabase
        .from("assessment_feedback")
        .select("target_type, target_key, corrected_value")
        .eq("assessment_id", id);
      if (fb) {
        const map: Record<string, string> = {};
        fb.forEach((row: any) => {
          if (row.target_type === "requirement" && row.corrected_value) {
            map[row.target_key] = row.corrected_value;
          }
          if (row.target_type === "fit_score" && row.target_key === "overall" && (row.corrected_value === "better" || row.corrected_value === "worse")) {
            setFitFeedback(row.corrected_value);
          }
        });
        setFeedback(map);
      }
      setLoading(false);
    })();
  }, [id]);

  const submitFitFeedback = async (direction: "better" | "worse") => {
    if (isAnon) return;
    setFitFeedbackBusy(true);
    setFitFeedback(direction);
    try {
      await supabase.functions.invoke("submit-feedback", {
        body: {
          assessment_id: id,
          target_type: "fit_score",
          target_key: "overall",
          original_value: String(a?.fit_score ?? ""),
          corrected_value: direction,
          comment: `User says they are a ${direction} fit than the model's ${a?.fit_score ?? "?"}/10 (${a?.fit_label ?? ""})`,
        },
      });
    } catch (e) {
      console.error("fit feedback failed", e);
    } finally {
      setFitFeedbackBusy(false);
    }
  };

  const submitCorrection = async (req: any, corrected: string) => {
    const original = req.match_strength;
    const nextFeedback = { ...feedback, [req.requirement]: corrected };
    setFeedback(nextFeedback);

    // Recompute fit score from corrected ratings
    const reqsList: any[] = Array.isArray(a?.requirements) ? a.requirements : [];
    const newScore = recomputeFitScore(reqsList, nextFeedback);
    const newLabel = labelForScore(newScore);
    setA((prev: any) => prev ? { ...prev, fit_score: newScore, fit_label: newLabel } : prev);

    if (isAnon) {
      updateAnonAssessment(id, { fit_score: newScore, fit_label: newLabel, feedback: nextFeedback });
      return;
    }

    try {
      await Promise.all([
        supabase.functions.invoke("submit-feedback", {
          body: {
            assessment_id: id,
            target_type: "requirement",
            target_key: req.requirement,
            original_value: original,
            corrected_value: corrected,
          },
        }),
        supabase
          .from("assessments")
          .update({ fit_score: newScore, fit_label: newLabel })
          .eq("id", id),
      ]);
    } catch (e) {
      console.error("feedback submit failed", e);
    }
  };

  function recomputeFitScore(reqsList: any[], fb: Record<string, string>): number {
    if (!reqsList.length) return 0;
    const weights: Record<string, number> = { Strong: 1, Partial: 0.5, Gap: 0 };
    const total = reqsList.reduce((sum, r) => {
      const v = fb[r.requirement] ?? r.match_strength;
      return sum + (weights[v] ?? 0);
    }, 0);
    return Math.round((total / reqsList.length) * 10 * 10) / 10;
  }

  function labelForScore(score: number): string {
    if (score >= 8) return "Strong fit";
    if (score >= 6) return "Good fit";
    if (score >= 4) return "Partial fit";
    return "Weak fit";
  }

  if (loading) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="max-w-3xl mx-auto px-8 py-24 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!a) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="max-w-3xl mx-auto px-8 py-24">Assessment not found.</div>
      </div>
    );
  }

  const updateStatus = async (status: string) => {
    if (isAnon) {
      updateAnonAssessment(id, { status });
    } else {
      await supabase.from("assessments").update({ status }).eq("id", id);
    }
    nav({ to: "/dashboard" });
  };

  const unlockIntel = async () => {
    if (isAnon) {
      updateAnonAssessment(id, { intent_to_apply: true });
    } else {
      await supabase.from("assessments").update({ intent_to_apply: true }).eq("id", id);
    }
    setA({ ...a, intent_to_apply: true });
  };

  const dec = a.job_decoder ?? {};
  const reqs: any[] = Array.isArray(a.requirements) ? a.requirements : [];
  const risks: string[] = Array.isArray(a.screening_risks) ? a.screening_risks : [];
  const savedActionItems: any[] = Array.isArray(a.action_items) ? a.action_items : [];
  const actionItems: any[] = savedActionItems.length > 0 ? savedActionItems : buildFallbackActionItems(reqs, risks);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-8 py-16">
        <Link to="/dashboard" className="text-xs font-mono text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>

        {/* Hero */}
        <header className="mt-12">
          <div className="label-eyebrow">{a.company || "—"}</div>
          <h1 className="font-display text-5xl mt-3 leading-[1.05]">{a.role_title || "Untitled role"}</h1>

          <div className="mt-12 flex items-baseline gap-6 border-t border-foreground pt-8">
            <div className="font-display text-7xl tabular-nums leading-none">
              {formatFitScore(a.fit_score)}
              <span className="text-3xl text-muted-foreground">/10</span>
            </div>
            <div>
              <div className="label-eyebrow">{a.fit_label}</div>
              <div className="font-serif-italic text-lg mt-2 text-muted-foreground">Fit score</div>
            </div>
            {!isAnon && (
              <div className="ml-auto flex flex-col gap-1.5 self-center">
                <div className="label-eyebrow">Score feedback</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => submitFitFeedback("better")}
                    disabled={fitFeedbackBusy}
                    className={`label-tag transition-colors ${fitFeedback === "better" ? "border-success! text-success" : "hover:text-foreground"}`}
                    title="The score is too low — I'm a stronger fit than this"
                  >
                    ↑ I'm a better fit
                  </button>
                  <button
                    onClick={() => submitFitFeedback("worse")}
                    disabled={fitFeedbackBusy}
                    className={`label-tag transition-colors ${fitFeedback === "worse" ? "border-destructive! text-destructive" : "hover:text-foreground"}`}
                    title="The score is too high — I'm a weaker fit than this"
                  >
                    ↓ I'm a worse fit
                  </button>
                </div>
                {fitFeedback && (
                  <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
                    Thanks — feedback logged
                  </div>
                )}
              </div>
            )}
          </div>

          <ul className="mt-10 space-y-3 max-w-2xl">
            {summarizeToBullets(a.fit_summary, 3).map((b, i) => (
              <li key={i} className="flex gap-3 font-display text-lg leading-snug">
                <span className="text-muted-foreground font-mono text-xs pt-2">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </header>

        {/* Quick jump to action items */}
        <a
          href="#action-items"
          className="mt-12 flex items-baseline justify-between gap-4 border-b border-border pb-4 hover:text-foreground transition-colors group"
        >
          <span className="font-display text-lg">
            {actionItems.length} next steps to close gaps
          </span>
          <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground">Read ↓</span>
        </a>

        {/* 01 — Job decoder */}
        <Section number="01" title="Job decoder">
          <DefList>
            <DefRow label="Company AI maturity" value={<span className="capitalize">{dec.ai_maturity ?? "—"}</span>} note={dec.ai_maturity_reason} />
            <DefRow label="Real seniority" value={dec.real_seniority ?? "—"} />
          </DefList>

          {Array.isArray(dec.unstated_requirements) && dec.unstated_requirements.length > 0 && (
            <SubSection title="Unstated requirements">
              <ul className="space-y-2">
                {dec.unstated_requirements.map((r: string, i: number) => (
                  <li key={i} className="flex gap-3"><span className="text-muted-foreground font-mono text-xs pt-1">→</span><span>{r}</span></li>
                ))}
              </ul>
            </SubSection>
          )}

          {Array.isArray(dec.red_flags) && dec.red_flags.length > 0 && (
            <SubSection title="Red flags">
              <ul className="space-y-2">
                {dec.red_flags.map((r: string, i: number) => (
                  <li key={i} className="flex gap-3"><span className="text-destructive font-mono text-xs pt-1">!</span><span>{r}</span></li>
                ))}
              </ul>
            </SubSection>
          )}
        </Section>

        {/* 02 — Company intelligence */}
        {a.intent_to_apply ? (
          <CompanyIntelligence intel={a.company_intel} />
        ) : (
          <Section number="02" title="Company intelligence">
            <p className="text-muted-foreground max-w-xl">
              Deep dive on the company — what they actually do, health signals, AI maturity, hiring manager intel and culture watch-outs. Unlock when you've decided this role is worth pursuing.
            </p>
            <button
              onClick={unlockIntel}
              className="mt-6 bg-foreground text-background px-6 py-3 hover:opacity-90"
            >
              I'm applying — show intel →
            </button>
          </Section>
        )}

        {/* 03 — Requirements */}
        <Section number="03" title="Requirement breakdown">
          <p className="text-sm text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            For each JD requirement: what the CV shows, the model's rating, and <em className="font-serif-italic">why</em>. Disagree? Click a different rating — it re-scores the fit and logs the correction.
          </p>
          <RatingLegend />
          <ul className="mt-6">
            {reqs.map((r, i) => (
              <RequirementRow
                key={i}
                index={i}
                req={r}
                corrected={feedback[r.requirement]}
                onChange={(v) => submitCorrection(r, v)}
              />
            ))}
          </ul>
        </Section>

        {/* 04 — Screening risks */}
        {risks.length > 0 && (
          <Section number="04" title="Screening risks">
            <ol className="space-y-5">
              {risks.map((r, i) => (
                <li key={i} className="flex gap-5">
                  <span className="font-display text-2xl tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="pt-1 leading-relaxed">{r}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* 05 — Action items */}
        <Section number="05" title="Action items to close gaps" id="action-items">
          {actionItems.length > 0 ? (
            <ul>
              {actionItems.map((item: any, i: number) => (
                <li key={i} className="border-b border-border py-6">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-5 items-baseline">
                    <span className="font-display text-2xl tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="font-display text-lg leading-snug">{item.title}</div>
                      {item.detail && <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.detail}</div>}
                      {item.addresses && (
                        <div className="label-eyebrow mt-3">Closes · {item.addresses}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {item.priority && <PriorityPill value={item.priority} />}
                      {item.effort && <span className="label-tag">{item.effort}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic font-display text-lg">
              No action items for this assessment.
            </p>
          )}
        </Section>

        {/* Actions */}
        <div className="mt-24 pt-12 border-t border-foreground flex flex-wrap items-center gap-6">
          <Link
            to="/tailor/$id"
            params={{ id }}
            className="bg-foreground text-background px-6 py-3 hover:opacity-90"
          >
            Tailor my CV for this role →
          </Link>
          <button
            onClick={() => updateStatus("applied")}
            className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
          >
            Save to tracker
          </button>
          <button
            onClick={() => updateStatus("skipped")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Not a fit, skip
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({ number, title, children, id }: { number: string; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-24 scroll-mt-8">
      <div className="flex items-baseline gap-4 mb-8">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{number}</span>
        <h2 className="font-display text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <div className="label-eyebrow mb-3">{title}</div>
      {children}
    </div>
  );
}

function DefList({ children }: { children: ReactNode }) {
  return <dl>{children}</dl>;
}

function DefRow({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-6 py-5 border-b border-border items-baseline">
      <dt className="label-eyebrow">{label}</dt>
      <dd>
        <div className="font-display text-xl">{value}</div>
        {note && <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{note}</div>}
      </dd>
    </div>
  );
}

function summarizeToBullets(text: string | null | undefined, max = 3): string[] {
  if (!text) return [];
  const parts = String(text)
    .split(/(?<=[.!?])\s+|\n+|\s•\s|\s-\s/)
    .map((s) => s.trim().replace(/^[-•]\s*/, ""))
    .filter((s) => s.length > 0);
  return parts.slice(0, max);
}

function formatFitScore(score: number | null | undefined) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return "—";
  const n = Math.max(0, Math.min(10, Number(score)));
  const rounded = Math.round(n * 2) / 2;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function PriorityPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    High: "border-destructive! text-destructive",
    Medium: "border-warning! text-warning",
    Low: "",
  };
  return <span className={`label-tag ${map[value] ?? ""}`}>{value}</span>;
}

function RatingCorrector({ original, corrected, onChange }: { original: string; corrected?: string; onChange: (v: string) => void }) {
  const current = corrected ?? original;
  const options = ["Strong", "Partial", "Gap"];
  const colorFor = (v: string) =>
    v === "Strong" ? "border-success! text-success"
    : v === "Partial" ? "border-warning! text-warning"
    : "border-destructive! text-destructive";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {options.map((opt) => {
          const active = current === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`label-tag transition-colors ${active ? colorFor(opt) : "hover:text-foreground"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {corrected && corrected !== original && (
        <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
          AI said {original} · you corrected
        </div>
      )}
    </div>
  );
}

function MatchPill({ strength }: { strength: string }) {
  const map: Record<string, string> = {
    Strong: "border-success! text-success",
    Partial: "border-warning! text-warning",
    Gap: "border-destructive! text-destructive",
  };
  return <span className={`label-tag ${map[strength] ?? ""}`}>{strength}</span>;
}

function buildFallbackActionItems(requirements: any[], risks: string[]) {
  const gapItems = requirements
    .filter((r) => r?.match_strength === "Gap" || r?.match_strength === "Partial")
    .slice(0, 5)
    .map((r) => ({
      title: `Add evidence for ${r.requirement}`,
      detail: `Strengthen your CV with a concrete example, metric, or project that proves this requirement: ${r.requirement}.`,
      priority: r.match_strength === "Gap" ? "High" : "Medium",
      effort: "Medium",
      addresses: r.requirement,
    }));

  const riskItems = risks.slice(0, Math.max(0, 5 - gapItems.length)).map((risk) => ({
    title: "Reduce a screening risk",
    detail: `Add a clear counter-signal in your CV or cover note so a recruiter does not screen you out for: ${risk}.`,
    priority: "High",
    effort: "Quick",
    addresses: risk,
  }));

  return [...gapItems, ...riskItems];
}

function CompanyIntelligence({ intel }: { intel: any }) {
  if (!intel) {
    return (
      <Section number="02" title="Company intelligence">
        <p className="text-muted-foreground italic font-display text-lg">Company intelligence unavailable for this assessment.</p>
      </Section>
    );
  }

  const wtd = intel.what_they_do ?? {};
  const health = intel.health ?? {};
  const ai = intel.ai_maturity ?? {};
  const hm = intel.hiring_manager ?? {};
  const culture = intel.culture ?? {};

  return (
    <Section number="02" title="Company intelligence">
      <div>
        <IntelBlock title="What they actually do" defaultOpen>
          <p className="leading-relaxed">{wtd.summary ?? "—"}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {wtd.business_model && <Chip>{wtd.business_model}</Chip>}
            {wtd.stage && <Chip>{wtd.stage}</Chip>}
          </div>
        </IntelBlock>

        <IntelBlock title="Company health">
          <Row label="Funding">{health.funding_status ?? "Unknown"}</Row>
          <Row label="Headcount">{health.headcount_trend ?? "Unknown"}</Row>
          {Array.isArray(health.recent_news) && health.recent_news.length > 0 && (
            <SubSection title="Recent">
              <ul className="space-y-2">
                {health.recent_news.map((n: string, i: number) => (
                  <li key={i} className="flex gap-3"><span className="text-muted-foreground font-mono text-xs pt-1">→</span><span>{n}</span></li>
                ))}
              </ul>
            </SubSection>
          )}
          <FlagsGrid green={health.green_flags} red={health.red_flags} />
        </IntelBlock>

        <IntelBlock title="AI maturity signal">
          <div className="font-display text-xl mb-2">{ai.rating ?? "—"}</div>
          {ai.evidence && <p className="leading-relaxed text-muted-foreground">{ai.evidence}</p>}
          {ai.why_it_matters && (
            <div className="mt-4 border-l-2 border-foreground pl-4">
              <div className="label-eyebrow mb-1">Why this matters for you</div>
              <p className="leading-relaxed">{ai.why_it_matters}</p>
            </div>
          )}
        </IntelBlock>

        <IntelBlock title="Hiring manager intel">
          {hm.name ? (
            <>
              <Row label="Name">{hm.name}</Row>
              {hm.tenure && <Row label="Tenure">{hm.tenure}</Row>}
              {hm.background && <p className="mt-3 leading-relaxed">{hm.background}</p>}
              {hm.recent_focus && (
                <SubSection title="Recent focus">
                  <p className="leading-relaxed">{hm.recent_focus}</p>
                </SubSection>
              )}
            </>
          ) : (
            <>
              <div className="label-eyebrow mb-2">No hiring manager named — founding team</div>
              <p className="leading-relaxed">{hm.founding_team_fallback ?? "Unknown"}</p>
            </>
          )}
        </IntelBlock>

        <IntelBlock title="Culture signals">
          {culture.employee_signal && <p className="leading-relaxed">{culture.employee_signal}</p>}
          {culture.work_style && (
            <SubSection title="Work style"><p className="leading-relaxed">{culture.work_style}</p></SubSection>
          )}
          {Array.isArray(culture.watch_outs) && culture.watch_outs.length > 0 && (
            <SubSection title="Watch-outs">
              <ul className="space-y-2">
                {culture.watch_outs.map((w: string, i: number) => (
                  <li key={i} className="flex gap-3"><span className="text-destructive font-mono text-xs pt-1">!</span><span>{w}</span></li>
                ))}
              </ul>
            </SubSection>
          )}
        </IntelBlock>
      </div>
    </Section>
  );
}

function IntelBlock({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-baseline justify-between py-5 hover:text-foreground transition-colors group"
      >
        <span className="font-display text-xl">{title}</span>
        <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pb-8 pt-1">{children}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-2">
      <div className="label-eyebrow pt-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="label-tag">{children}</span>;
}

function FlagsGrid({ green, red }: { green?: string[]; red?: string[] }) {
  const hasGreen = Array.isArray(green) && green.length > 0;
  const hasRed = Array.isArray(red) && red.length > 0;
  if (!hasGreen && !hasRed) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
      {hasGreen && (
        <div>
          <div className="label-eyebrow mb-2" style={{ color: "var(--color-success)" }}>Green flags</div>
          <ul className="space-y-2">
            {green!.map((g, i) => <li key={i} className="flex gap-3"><span className="text-success font-mono text-xs pt-1">✓</span><span>{g}</span></li>)}
          </ul>
        </div>
      )}
      {hasRed && (
        <div>
          <div className="label-eyebrow mb-2" style={{ color: "var(--color-destructive)" }}>Red flags</div>
          <ul className="space-y-2">
            {red!.map((r, i) => <li key={i} className="flex gap-3"><span className="text-destructive font-mono text-xs pt-1">!</span><span>{r}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
