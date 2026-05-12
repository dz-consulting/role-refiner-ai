import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";
import { downloadTailoredCvPdf, type TailoredCV } from "@/lib/pdf";

export const Route = createFileRoute("/tailor/$id")({
  beforeLoad: requireAuth,
  component: TailorPage,
});

function TailorPage() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSummary, setOriginalSummary] = useState("");
  const [tailored, setTailored] = useState<TailoredCV | null>(null);
  const [assessment, setAssessment] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [{ data: a }, { data: prof }] = await Promise.all([
          supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!a || !prof) throw new Error("Missing data");
        setAssessment(a);
        // Build a brief original summary preview from profile
        const skillArr = (Array.isArray(prof.skills) ? prof.skills : []) as string[];
        const outcomeArr = (Array.isArray(prof.outcomes) ? prof.outcomes : []) as string[];
        const skills = skillArr.slice(0, 6).join(" · ");
        setOriginalSummary(
          `${prof.name ?? ""} — ${prof.title ?? ""}\n${prof.years_experience ?? 0} years experience\n\nTop skills: ${skills}\n\nKey outcomes:\n${outcomeArr.map((o) => "• " + o).join("\n")}`
        );

        if (a.tailored_cv) {
          setTailored(a.tailored_cv as TailoredCV);
          setLoading(false);
          return;
        }

        setLoading(false);
        setGenerating(true);
        const { data, error: fnErr } = await supabase.functions.invoke("tailor-cv", {
          body: {
            cvText: prof.raw_text,
            profile: {
              name: prof.name, title: prof.title, years_experience: prof.years_experience,
              skills: prof.skills, roles: prof.roles, outcomes: prof.outcomes,
              seniority_signals: prof.seniority_signals,
            },
            jobDescription: a.job_description,
          },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        setTailored(data.tailored);
        await supabase.from("assessments").update({ tailored_cv: data.tailored }).eq("id", id);
      } catch (e: any) {
        setError(e.message ?? "Failed to tailor CV");
      } finally {
        setGenerating(false);
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-8 py-10">
        <Link to="/assessment/$id" params={{ id }} className="text-xs font-mono text-muted-foreground hover:text-foreground">
          ← Back to assessment
        </Link>

        <div className="mt-4 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              CV Tailoring
            </div>
            <h1 className="font-display text-4xl tracking-tight mt-1">
              {assessment?.role_title || "Tailored CV"}
            </h1>
            <div className="text-muted-foreground">{assessment?.company}</div>
          </div>
          <button
            disabled={!tailored}
            onClick={() => tailored && downloadTailoredCvPdf(tailored)}
            className="bg-accent text-accent-foreground font-medium px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-40"
          >
            Download as PDF ↓
          </button>
        </div>

        {error && (
          <div className="mt-6 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        {loading || generating ? (
          <div className="mt-10 border border-border rounded-md bg-surface p-10 text-center font-mono text-xs text-muted-foreground animate-pulse">
            {generating ? "Tailoring your CV with AI..." : "Loading..."}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-border bg-surface rounded-md p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Original profile
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground">
                {originalSummary}
              </pre>
            </div>

            {tailored && (
              <div className="border border-accent/40 bg-surface rounded-md p-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
                  Tailored for this role
                </div>
                <TailoredEditor cv={tailored} onChange={setTailored} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TailoredEditor({ cv, onChange }: { cv: TailoredCV; onChange: (c: TailoredCV) => void }) {
  const set = (patch: Partial<TailoredCV>) => onChange({ ...cv, ...patch });

  return (
    <div className="space-y-5">
      <input
        value={cv.name}
        onChange={(e) => set({ name: e.target.value })}
        className="w-full bg-transparent font-display text-2xl border-b border-border focus:outline-none focus:border-accent pb-1"
      />
      <input
        value={cv.title}
        onChange={(e) => set({ title: e.target.value })}
        className="w-full bg-transparent text-lg border-b border-border focus:outline-none focus:border-accent pb-1"
      />
      <input
        value={cv.contact}
        onChange={(e) => set({ contact: e.target.value })}
        className="w-full bg-transparent text-xs font-mono text-muted-foreground border-b border-border focus:outline-none focus:border-accent pb-1"
      />

      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
        <textarea
          value={cv.summary}
          onChange={(e) => set({ summary: e.target.value })}
          rows={4}
          className="w-full bg-input border border-border rounded p-2 text-sm"
        />
      </div>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Experience</div>
        <div className="space-y-4">
          {cv.experience.map((exp, i) => (
            <div key={i} className="border border-border rounded p-3">
              <input
                value={`${exp.role} — ${exp.company}`}
                onChange={(e) => {
                  const [role, company] = e.target.value.split(" — ");
                  const next = [...cv.experience];
                  next[i] = { ...exp, role: role ?? "", company: company ?? "" };
                  set({ experience: next });
                }}
                className="w-full bg-transparent font-medium text-sm focus:outline-none"
              />
              <input
                value={exp.duration}
                onChange={(e) => {
                  const next = [...cv.experience];
                  next[i] = { ...exp, duration: e.target.value };
                  set({ experience: next });
                }}
                className="w-full bg-transparent text-xs text-muted-foreground focus:outline-none mb-2"
              />
              {exp.bullets.map((b, j) => (
                <div key={j} className="flex gap-2 mt-1">
                  <span className="text-muted-foreground">•</span>
                  <textarea
                    value={b}
                    onChange={(e) => {
                      const nb = [...exp.bullets]; nb[j] = e.target.value;
                      const next = [...cv.experience]; next[i] = { ...exp, bullets: nb };
                      set({ experience: next });
                    }}
                    rows={2}
                    className="flex-1 bg-input/50 border border-border rounded p-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Skills</div>
        <textarea
          value={cv.skills.join(", ")}
          onChange={(e) => set({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          rows={2}
          className="w-full bg-input border border-border rounded p-2 text-sm"
        />
      </div>
    </div>
  );
}
