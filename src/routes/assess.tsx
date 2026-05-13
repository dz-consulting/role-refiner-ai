import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/assess")({
  beforeLoad: requireAuth,
  component: AssessNew,
});

const STEPS = [
  "Reading JD...",
  "Comparing to your profile...",
  "Building assessment...",
];

function AssessNew() {
  const nav = useNavigate();
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!data) setProfileMissing(true);
    })();
  }, []);

  useEffect(() => {
    if (!busy) return;
    setStepIdx(0);
    const t1 = setTimeout(() => setStepIdx(1), 1200);
    const t2 = setTimeout(() => setStepIdx(2), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [busy]);

  if (profileMissing) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-8 py-16">
          <div className="border border-border bg-surface rounded-md p-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              CV required
            </div>
            <h1 className="font-display text-3xl mt-2">Upload your CV first</h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Every assessment compares a job to your profile. Takes one upload.
            </p>
            <button
              onClick={() => nav({ to: "/onboarding" })}
              className="mt-6 bg-accent text-accent-foreground font-medium px-5 py-2.5 rounded-md hover:opacity-90"
            >
              Upload CV →
            </button>
          </div>
        </main>
      </div>
    );
  }

  const run = async () => {
    setError(null);
    if (jd.trim().split(/\s+/).length < 100) {
      setError("This doesn't look like a complete job description. Please paste the full JD.");
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof) throw new Error("Profile not found");

      const profileForAi = {
        name: prof.name,
        title: prof.title,
        years_experience: prof.years_experience,
        skills: prof.skills,
        roles: prof.roles,
        outcomes: prof.outcomes,
        seniority_signals: prof.seniority_signals,
      };

      const { data, error: fnErr } = await supabase.functions.invoke("assess-job", {
        body: { profile: profileForAi, jobDescription: jd },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      const { data: inserted, error: insErr } = await supabase
        .from("assessments").insert({
          user_id: user.id,
          job_description: jd,
          company: data.company,
          role_title: data.role_title,
          fit_score: data.fit_score,
          fit_label: data.fit_label,
          fit_summary: data.fit_summary,
          job_decoder: data.job_decoder,
          requirements: data.requirements,
          screening_risks: data.screening_risks,
          action_items: data.action_items,
          company_intel: data.company_intel,
        }).select("id").single();
      if (insErr) throw insErr;
      nav({ to: "/assessment/$id", params: { id: inserted.id } });
    } catch (e: any) {
      setError(e.message ?? "Assessment failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-8 py-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          New assessment
        </div>
        <h1 className="font-display text-4xl tracking-tight mt-2">Paste a job description</h1>
        <p className="text-muted-foreground mt-2">
          Full JD, copied from anywhere. We'll do the rest.
        </p>

        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={18}
          placeholder="Paste the complete job description here..."
          disabled={busy}
          className="w-full mt-6 bg-input border border-border rounded-md p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>{jd.trim().split(/\s+/).filter(Boolean).length} words</span>
          <span>Min. 100 words</span>
        </div>

        {error && (
          <div className="mt-4 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        {busy ? (
          <div className="mt-8 border border-border rounded-md bg-surface p-8">
            <div className="space-y-3">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3 font-mono text-sm">
                  <span className={i < stepIdx ? "text-success" : i === stepIdx ? "text-accent animate-pulse" : "text-muted-foreground"}>
                    {i < stepIdx ? "✓" : i === stepIdx ? "→" : "·"}
                  </span>
                  <span className={i <= stepIdx ? "text-foreground" : "text-muted-foreground"}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={run}
            className="mt-6 bg-accent text-accent-foreground font-medium px-6 py-3 rounded-md hover:opacity-90"
          >
            Run Assessment →
          </button>
        )}
      </main>
    </div>
  );
}
