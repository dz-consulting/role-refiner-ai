import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/assessment/$id")({
  beforeLoad: requireAuth,
  component: AssessmentView,
});

function AssessmentView() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [a, setA] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
      setA(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="max-w-5xl mx-auto p-8 font-mono text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!a) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="max-w-5xl mx-auto p-8">Assessment not found.</div>
      </div>
    );
  }

  const updateStatus = async (status: string) => {
    await supabase.from("assessments").update({ status }).eq("id", id);
    nav({ to: "/dashboard" });
  };

  const dec = a.job_decoder ?? {};
  const reqs: any[] = Array.isArray(a.requirements) ? a.requirements : [];
  const risks: string[] = Array.isArray(a.screening_risks) ? a.screening_risks : [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-8 py-10">
        <Link to="/dashboard" className="text-xs font-mono text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>

        <div className="mt-4 flex items-baseline justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl tracking-tight">{a.role_title || "Untitled role"}</h1>
            <div className="text-muted-foreground mt-1">{a.company || "—"}</div>
          </div>
          <FitBadge score={a.fit_score} label={a.fit_label} />
        </div>

        <p className="mt-6 text-lg leading-relaxed border-l-2 border-accent pl-5">
          {a.fit_summary}
        </p>

        {/* Section A: Job Decoder */}
        <Section title="Job decoder" letter="A">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tile label="Company AI maturity">
              <div className="font-display text-2xl capitalize">{dec.ai_maturity ?? "—"}</div>
              <div className="text-sm text-muted-foreground mt-1">{dec.ai_maturity_reason}</div>
            </Tile>
            <Tile label="Real seniority">
              <div className="font-display text-2xl">{dec.real_seniority ?? "—"}</div>
            </Tile>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Tile label="Unstated requirements">
              <ul className="space-y-1.5 mt-1 text-sm">
                {(dec.unstated_requirements ?? []).map((r: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-accent">→</span>{r}</li>
                ))}
              </ul>
            </Tile>
            <Tile label="Red flags">
              {(dec.red_flags ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">None.</div>
              ) : (
                <ul className="space-y-1.5 mt-1 text-sm">
                  {dec.red_flags.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-destructive">!</span>{r}</li>
                  ))}
                </ul>
              )}
            </Tile>
          </div>
        </Section>

        {/* Section B: Company Intelligence */}
        <CompanyIntelligence intel={a.company_intel} />

        {/* Section C: Requirements */}
        <Section title="Requirement breakdown" letter="C">
          <div className="border border-border rounded-md bg-surface overflow-hidden">
            <div className="grid grid-cols-[1fr_1.5fr_120px] gap-4 px-5 py-3 border-b border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <div>Requirement</div>
              <div>Evidence from your CV</div>
              <div className="text-right">Match</div>
            </div>
            {reqs.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_120px] gap-4 px-5 py-4 border-b border-border last:border-0 text-sm">
                <div className="font-medium">{r.requirement}</div>
                <div className="text-muted-foreground">{r.evidence}</div>
                <div className="text-right">
                  <MatchPill strength={r.match_strength} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section D: Screening risks */}
        <Section title="Screening risks" letter="D">
          <div className="border border-destructive/30 bg-destructive/5 rounded-md p-5">
            <ul className="space-y-3">
              {risks.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-destructive font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Actions */}
        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Link
            to="/tailor/$id"
            params={{ id }}
            className="bg-accent text-accent-foreground font-medium px-5 py-2.5 rounded-md hover:opacity-90"
          >
            Tailor my CV for this role →
          </Link>
          <button
            onClick={() => updateStatus("applied")}
            className="border border-border px-5 py-2.5 rounded-md hover:bg-surface text-sm"
          >
            Save to tracker
          </button>
          <button
            onClick={() => updateStatus("skipped")}
            className="text-muted-foreground hover:text-foreground px-3 py-2.5 text-sm"
          >
            Not a fit, skip
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({ title, letter, children }: { title: string; letter: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Section {letter}</span>
        <h2 className="font-display text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface rounded-md p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function FitBadge({ score, label }: { score: number; label: string }) {
  const tone =
    label === "STRONG FIT"
      ? "border-success text-success"
      : label === "PARTIAL FIT"
      ? "border-warning text-warning"
      : "border-destructive text-destructive";
  return (
    <div className={`border-2 rounded-md p-5 text-right min-w-[180px] ${tone}`}>
      <div className="font-display text-5xl tabular-nums leading-none">
        {score ?? "—"}<span className="text-2xl text-muted-foreground">/10</span>
      </div>
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] mt-2">{label}</div>
    </div>
  );
}

function MatchPill({ strength }: { strength: string }) {
  const map: Record<string, string> = {
    Strong: "border-success/40 text-success bg-success/5",
    Partial: "border-warning/40 text-warning bg-warning/5",
    Gap: "border-destructive/40 text-destructive bg-destructive/5",
  };
  return (
    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 border rounded ${map[strength] ?? "border-border text-muted-foreground"}`}>
      {strength}
    </span>
  );
}

function CompanyIntelligence({ intel }: { intel: any }) {
  if (!intel) {
    return (
      <Section title="Company intelligence" letter="B">
        <div className="border border-border bg-surface rounded-md p-5 text-sm text-muted-foreground">
          Company intelligence unavailable for this assessment.
        </div>
      </Section>
    );
  }

  const wtd = intel.what_they_do ?? {};
  const health = intel.health ?? {};
  const ai = intel.ai_maturity ?? {};
  const hm = intel.hiring_manager ?? {};
  const culture = intel.culture ?? {};

  return (
    <Section title="Company intelligence" letter="B">
      <div className="space-y-3">
        <IntelCard title="What they actually do" defaultOpen>
          <p className="text-sm leading-relaxed">{wtd.summary ?? "—"}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {wtd.business_model && <Chip>{wtd.business_model}</Chip>}
            {wtd.stage && <Chip>{wtd.stage}</Chip>}
          </div>
        </IntelCard>

        <IntelCard title="Company health">
          <Row label="Funding">{health.funding_status ?? "Unknown"}</Row>
          <Row label="Headcount">{health.headcount_trend ?? "Unknown"}</Row>
          {Array.isArray(health.recent_news) && health.recent_news.length > 0 && (
            <div className="mt-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                Recent
              </div>
              <ul className="space-y-1.5 text-sm">
                {health.recent_news.map((n: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-accent">→</span>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <FlagsGrid green={health.green_flags} red={health.red_flags} />
        </IntelCard>

        <IntelCard title="AI maturity signal">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-display text-xl">{ai.rating ?? "—"}</span>
          </div>
          {ai.evidence && <p className="text-sm leading-relaxed text-muted-foreground">{ai.evidence}</p>}
          {ai.why_it_matters && (
            <div className="mt-3 border-l-2 border-accent pl-4 text-sm leading-relaxed">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent block mb-1">
                Why this matters for you
              </span>
              {ai.why_it_matters}
            </div>
          )}
        </IntelCard>

        <IntelCard title="Hiring manager intel">
          {hm.name ? (
            <>
              <Row label="Name">{hm.name}</Row>
              {hm.tenure && <Row label="Tenure">{hm.tenure}</Row>}
              {hm.background && <p className="text-sm mt-3 leading-relaxed">{hm.background}</p>}
              {hm.recent_focus && (
                <div className="mt-3 text-sm">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground block mb-1">
                    Recent focus
                  </span>
                  {hm.recent_focus}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                No hiring manager named — founding team
              </div>
              <p className="text-sm leading-relaxed">{hm.founding_team_fallback ?? "Unknown"}</p>
            </>
          )}
        </IntelCard>

        <IntelCard title="Culture signals">
          {culture.employee_signal && (
            <p className="text-sm leading-relaxed">{culture.employee_signal}</p>
          )}
          {culture.work_style && (
            <div className="mt-3 text-sm">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground block mb-1">
                Work style
              </span>
              {culture.work_style}
            </div>
          )}
          {Array.isArray(culture.watch_outs) && culture.watch_outs.length > 0 && (
            <div className="mt-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive mb-1.5">
                Watch-outs
              </div>
              <ul className="space-y-1.5 text-sm">
                {culture.watch_outs.map((w: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-destructive">!</span>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </IntelCard>
      </div>
    </Section>
  );
}

function IntelCard({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border bg-surface rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background/40 transition-colors"
      >
        <span className="font-display text-base">{title}</span>
        <span className="font-mono text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-border">{children}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 text-sm py-1.5">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground w-28 pt-0.5 shrink-0">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 border border-border rounded text-muted-foreground">
      {children}
    </span>
  );
}

function FlagsGrid({ green, red }: { green?: string[]; red?: string[] }) {
  const hasGreen = Array.isArray(green) && green.length > 0;
  const hasRed = Array.isArray(red) && red.length > 0;
  if (!hasGreen && !hasRed) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {hasGreen && (
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-success mb-1.5">Green flags</div>
          <ul className="space-y-1.5 text-sm">
            {green!.map((g, i) => <li key={i} className="flex gap-2"><span className="text-success">✓</span>{g}</li>)}
          </ul>
        </div>
      )}
      {hasRed && (
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive mb-1.5">Red flags</div>
          <ul className="space-y-1.5 text-sm">
            {red!.map((r, i) => <li key={i} className="flex gap-2"><span className="text-destructive">!</span>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
