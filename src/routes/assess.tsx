import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";
import {
  getAnonProfile,
  getAnonDailyRemaining,
  incrementAnonDaily,
  saveAnonAssessment,
  newAnonId,
  ANON_DAILY_LIMIT,
} from "@/lib/anon-store";

export const Route = createFileRoute("/assess")({
  beforeLoad: requireAuth,
  component: AssessNew,
});

const STEPS = [
  "Reading the job description",
  "Comparing to your profile",
  "Building the assessment",
];

function AssessNew() {
  const nav = useNavigate();
  const [jd, setJd] = useState("");
  const [companyHint, setCompanyHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [isAnon, setIsAnon] = useState(false);
  const [anonRemaining, setAnonRemaining] = useState(ANON_DAILY_LIMIT);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAnon(true);
        setAnonRemaining(getAnonDailyRemaining());
        if (!getAnonProfile()) setProfileMissing(true);
        return;
      }
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
        <main className="max-w-2xl mx-auto px-8 py-24">
          <div className="label-eyebrow">CV required</div>
          <h1 className="font-display text-4xl mt-3">Upload your CV first.</h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Every assessment compares a job to your profile. Takes one upload.
          </p>
          <button
            onClick={() => nav({ to: "/onboarding" })}
            className="mt-12 bg-foreground text-background px-6 py-3 hover:opacity-90"
          >
            Upload CV →
          </button>
        </main>
      </div>
    );
  }

  const wordCount = jd.trim().split(/\s+/).filter(Boolean).length;

  const run = async () => {
    setError(null);
    if (wordCount < 100) {
      setError("This doesn't look like a complete job description. Please paste the full JD.");
      return;
    }
    if (isAnon && getAnonDailyRemaining() <= 0) {
      setError(`Beta limit reached: ${ANON_DAILY_LIMIT} assessments per day for guest users. Sign in to keep going.`);
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let profileForAi: any;
      if (user) {
        const { data: prof } = await supabase
          .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (!prof) throw new Error("Profile not found");
        profileForAi = {
          name: prof.name,
          title: prof.title,
          years_experience: prof.years_experience,
          skills: prof.skills,
          roles: prof.roles,
          outcomes: prof.outcomes,
          seniority_signals: prof.seniority_signals,
          languages: (prof as any).languages ?? [],
          preferences: (prof as any).preferences ?? {},
        };
      } else {
        const prof = getAnonProfile();
        if (!prof) throw new Error("Profile not found");
        profileForAi = {
          name: prof.name,
          title: prof.title,
          years_experience: prof.years_experience,
          skills: prof.skills,
          roles: prof.roles,
          outcomes: prof.outcomes,
          seniority_signals: prof.seniority_signals,
          languages: prof.languages ?? [],
          preferences: prof.preferences ?? {},
        };
      }

      const { data, error: fnErr } = await supabase.functions.invoke("assess-job", {
        body: { profile: profileForAi, jobDescription: jd, companyHint: companyHint.trim() || undefined },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      if (user) {
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
            langfuse_assess_trace_id: data.langfuse_assess_trace_id,
          }).select("id").single();
        if (insErr) throw insErr;
        nav({ to: "/assessment/$id", params: { id: inserted.id } });
      } else {
        const id = newAnonId();
        saveAnonAssessment({
          id,
          created_at: new Date().toISOString(),
          job_description: jd,
          company: data.company ?? null,
          role_title: data.role_title ?? null,
          fit_score: data.fit_score ?? null,
          fit_label: data.fit_label ?? null,
          fit_summary: data.fit_summary ?? null,
          job_decoder: data.job_decoder ?? null,
          requirements: data.requirements ?? [],
          screening_risks: data.screening_risks ?? [],
          action_items: data.action_items ?? [],
          company_intel: data.company_intel ?? null,
          intent_to_apply: false,
          status: "assessed",
          feedback: {},
        });
        incrementAnonDaily();
        nav({ to: "/assessment/$id", params: { id } });
      }
    } catch (e: any) {
      setError(e.message ?? "Assessment failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-8 py-24">
        <div className="label-eyebrow">New assessment</div>
        <h1 className="font-display text-5xl mt-3">Paste a job description.</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Full JD, copied from anywhere. We'll do the rest.
        </p>

        {isAnon && (
          <div className="mt-6 text-sm text-muted-foreground border-l-2 border-border pl-3 py-1">
            Guest mode · {anonRemaining} of {ANON_DAILY_LIMIT} assessments left today.
          </div>
        )}

        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={16}
          placeholder="Paste the complete job description here…"
          disabled={busy}
          className="w-full mt-12 bg-card border border-border p-5 text-sm leading-relaxed focus:outline-none focus:border-foreground resize-y transition-colors"
        />

        <div className="flex items-center justify-between mt-3 text-xs font-mono text-muted-foreground">
          <span>{wordCount} words</span>
          <span>Minimum 100</span>
        </div>

        {error && (
          <div className="mt-6 text-sm text-destructive border-l-2 border-destructive pl-3 py-1">
            {error}
          </div>
        )}

        {busy ? (
          <div className="mt-12 space-y-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-baseline gap-4 text-base">
                <span className={`font-mono text-xs w-6 ${i < stepIdx ? "text-foreground" : i === stepIdx ? "text-foreground animate-pulse" : "text-muted-foreground"}`}>
                  {i < stepIdx ? "✓" : String(i + 1).padStart(2, "0")}
                </span>
                <span className={i <= stepIdx ? "text-foreground font-display" : "text-muted-foreground font-display"}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={run}
            className="mt-10 bg-foreground text-background px-8 py-4 hover:opacity-90"
          >
            Run assessment →
          </button>
        )}
      </main>
    </div>
  );
}
