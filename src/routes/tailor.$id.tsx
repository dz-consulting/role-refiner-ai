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
      <main className="max-w-5xl mx-auto px-8 py-16">
        <Link to="/assessment/$id" params={{ id }} className="text-xs font-mono text-muted-foreground hover:text-foreground">
          ← Back to assessment
        </Link>

        <header className="mt-12 flex items-baseline justify-between flex-wrap gap-6">
          <div>
            <div className="label-eyebrow">CV tailoring · {assessment?.company}</div>
            <h1 className="font-display text-5xl mt-3 leading-[1.05]">
              {assessment?.role_title || "Tailored CV"}
            </h1>
          </div>
          <button
            disabled={!tailored}
            onClick={() => tailored && downloadTailoredCvPdf(tailored)}
            className="bg-foreground text-background px-6 py-3 hover:opacity-90 disabled:opacity-40"
          >
            Download as PDF ↓
          </button>
        </header>

        {error && (
          <div className="mt-8 text-sm text-destructive border-l-2 border-destructive pl-3 py-1">
            {error}
          </div>
        )}

        {loading || generating ? (
          <div className="mt-16 py-16 text-center font-serif-italic text-2xl text-muted-foreground animate-pulse">
            {generating ? "Tailoring your CV…" : "Loading…"}
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="label-eyebrow mb-4">Original profile</div>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground">
                {originalSummary}
              </pre>
            </div>

            {tailored && (
              <div className="lg:border-l lg:border-foreground lg:pl-12">
                <div className="label-eyebrow mb-4">Tailored for this role</div>
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
    <div className="space-y-6">
      <input
        value={cv.name}
        onChange={(e) => set({ name: e.target.value })}
        className="w-full bg-transparent font-display text-3xl border-b border-border focus:outline-none focus:border-foreground pb-2"
      />
      <input
        value={cv.title}
        onChange={(e) => set({ title: e.target.value })}
        className="w-full bg-transparent text-lg border-b border-border focus:outline-none focus:border-foreground pb-2"
      />
      <input
        value={cv.contact}
        onChange={(e) => set({ contact: e.target.value })}
        className="w-full bg-transparent text-xs font-mono text-muted-foreground border-b border-border focus:outline-none focus:border-foreground pb-2"
      />

      <div>
        <div className="label-eyebrow mb-2">Summary</div>
        <textarea
          value={cv.summary}
          onChange={(e) => set({ summary: e.target.value })}
          rows={4}
          className="w-full bg-card border border-border focus:border-foreground p-3 text-sm focus:outline-none"
        />
      </div>

      <div>
        <div className="label-eyebrow mb-3">Experience</div>
        <div className="space-y-6">
          {cv.experience.map((exp, i) => (
            <div key={i} className="border-b border-border pb-4">
              <input
                value={`${exp.role} — ${exp.company}`}
                onChange={(e) => {
                  const [role, company] = e.target.value.split(" — ");
                  const next = [...cv.experience];
                  next[i] = { ...exp, role: role ?? "", company: company ?? "" };
                  set({ experience: next });
                }}
                className="w-full bg-transparent font-display text-lg focus:outline-none"
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
                <div key={j} className="flex gap-2 mt-2">
                  <span className="text-muted-foreground pt-1">•</span>
                  <textarea
                    value={b}
                    onChange={(e) => {
                      const nb = [...exp.bullets]; nb[j] = e.target.value;
                      const next = [...cv.experience]; next[i] = { ...exp, bullets: nb };
                      set({ experience: next });
                    }}
                    rows={2}
                    className="flex-1 bg-transparent border-b border-border focus:border-foreground p-1 text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="label-eyebrow mb-2">Skills</div>
        <textarea
          value={cv.skills.join(", ")}
          onChange={(e) => set({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          rows={2}
          className="w-full bg-card border border-border focus:border-foreground p-3 text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}
