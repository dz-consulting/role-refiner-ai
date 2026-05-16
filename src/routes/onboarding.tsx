import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { extractTextFromFile } from "@/lib/cv-extract";
import { AppHeader } from "@/components/AppHeader";
import { PreferencesEditor } from "@/components/PreferencesEditor";
import { Preferences, emptyPreferences } from "@/lib/preferences";
import {
  saveAnonProfile,
  getAnonDailyRemaining,
  incrementAnonDaily,
  saveAnonAssessment,
  newAnonId,
  ANON_DAILY_LIMIT,
} from "@/lib/anon-store";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: requireAuth,
  component: OnboardingPage,
});

type Profile = {
  name: string;
  title: string;
  years_experience: number;
  skills: string[];
  roles: { title: string; company: string; duration: string }[];
  outcomes: string[];
  seniority_signals: string[];
  languages: string[];
};

function OnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<"input" | "processing" | "review" | "preferences" | "saving">("input");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences());
  const [cvText, setCvText] = useState("");
  const [cvFilePath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");

  const jdWords = jd.trim().split(/\s+/).filter(Boolean).length;

  const run = async () => {
    setError(null);
    if (!file) { setError("Upload your CV to continue."); return; }
    if (jdWords < 100) { setError("Paste the full job description (min 100 words)."); return; }

    setStep("processing");
    try {
      setProgress("Reading your CV…");
      const text = await extractTextFromFile(file);
      if (text.length < 200) throw new Error("That CV looks empty. Try another file.");
      setCvText(text);

      setProgress("Extracting structured profile with AI…");
      const { data: ex, error: exErr } = await supabase.functions.invoke("extract-cv", {
        body: { cvText: text },
      });
      if (exErr) throw exErr;
      if (ex?.error) throw new Error(ex.error);
      const extracted: Profile = { ...ex.profile, languages: ex.profile?.languages ?? [] };
      setProfile(extracted);

      const { data: { user } } = await supabase.auth.getUser();
      const profilePayload = {
        name: extracted.name,
        title: extracted.title,
        years_experience: extracted.years_experience,
        skills: extracted.skills,
        roles: extracted.roles,
        outcomes: extracted.outcomes,
        seniority_signals: extracted.seniority_signals,
        languages: extracted.languages,
        preferences,
        raw_text: text,
      };

      if (user) {
        const { error: upErr } = await supabase.from("profiles").upsert({
          user_id: user.id,
          ...profilePayload,
          preferences: preferences as any,
          cv_file_path: cvFilePath,
        }, { onConflict: "user_id" });
        if (upErr) throw upErr;
      } else {
        if (getAnonDailyRemaining() <= 0) {
          throw new Error(`Beta limit reached: ${ANON_DAILY_LIMIT} assessments per day. Sign in to keep going.`);
        }
        saveAnonProfile(profilePayload);
      }

      setProgress("Assessing your fit for this role…");
      const profileForAi = {
        name: extracted.name,
        title: extracted.title,
        years_experience: extracted.years_experience,
        skills: extracted.skills,
        roles: extracted.roles,
        outcomes: extracted.outcomes,
        seniority_signals: extracted.seniority_signals,
        languages: extracted.languages ?? [],
        preferences: {},
      };
      const { data: a, error: aErr } = await supabase.functions.invoke("assess-job", {
        body: { profile: profileForAi, jobDescription: jd },
      });
      if (aErr) throw aErr;
      if (a?.error) throw new Error(a.error);

      if (user) {
        const { data: inserted, error: insErr } = await supabase
          .from("assessments").insert({
            user_id: user.id,
            job_description: jd,
            company: a.company,
            role_title: a.role_title,
            fit_score: a.fit_score,
            fit_label: a.fit_label,
            fit_summary: a.fit_summary,
            job_decoder: a.job_decoder,
            requirements: a.requirements,
            screening_risks: a.screening_risks,
            action_items: a.action_items,
            company_intel: a.company_intel,
            langfuse_assess_trace_id: a.langfuse_assess_trace_id,
          }).select("id").single();
        if (insErr) throw insErr;
        nav({ to: "/assessment/$id", params: { id: inserted.id } });
      } else {
        const id = newAnonId();
        saveAnonAssessment({
          id,
          created_at: new Date().toISOString(),
          job_description: jd,
          company: a.company ?? null,
          role_title: a.role_title ?? null,
          fit_score: a.fit_score ?? null,
          fit_label: a.fit_label ?? null,
          fit_summary: a.fit_summary ?? null,
          job_decoder: a.job_decoder ?? null,
          requirements: a.requirements ?? [],
          screening_risks: a.screening_risks ?? [],
          action_items: a.action_items ?? [],
          company_intel: a.company_intel ?? null,
          intent_to_apply: false,
          status: "assessed",
          feedback: {},
        });
        incrementAnonDaily();
        nav({ to: "/assessment/$id", params: { id } });
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setStep("input");
    }
  };

  const save = async () => {
    if (!profile) return;
    setStep("saving");
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: upErr } = await supabase
          .from("profiles")
          .upsert({
            user_id: user.id,
            name: profile.name,
            title: profile.title,
            years_experience: profile.years_experience,
            skills: profile.skills,
            roles: profile.roles,
            outcomes: profile.outcomes,
            seniority_signals: profile.seniority_signals,
            languages: profile.languages,
            preferences: preferences as any,
            raw_text: cvText,
            cv_file_path: cvFilePath,
          }, { onConflict: "user_id" });
        if (upErr) throw upErr;
      } else {
        saveAnonProfile({
          name: profile.name,
          title: profile.title,
          years_experience: profile.years_experience,
          skills: profile.skills,
          roles: profile.roles,
          outcomes: profile.outcomes,
          seniority_signals: profile.seniority_signals,
          languages: profile.languages,
          preferences,
          raw_text: cvText,
        });
      }
      nav({ to: "/dashboard" });
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
      setStep("review");
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-8 py-24">
        <div className="label-eyebrow">Get started</div>
        <h1 className="font-display text-5xl mt-3">Your CV. The job. One screen.</h1>
        <p className="text-muted-foreground mt-4 text-lg max-w-xl">
          Upload your CV and paste the job description. We'll assess your fit in seconds.
        </p>

        {error && (
          <div className="mt-8 text-sm text-destructive border-l-2 border-destructive pl-3 py-1">
            {error}
          </div>
        )}

        {step === "input" && (
          <div className="mt-12 space-y-12">
            <section>
              <div className="label-eyebrow mb-4">01 · Your CV</div>
              <Uploader file={file} onFile={setFile} />
            </section>

            <section>
              <div className="label-eyebrow mb-4">02 · The job description</div>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={14}
                placeholder="Paste the complete job description here…"
                className="w-full bg-card border border-border p-5 text-sm leading-relaxed focus:outline-none focus:border-foreground resize-y transition-colors"
              />
              <div className="flex items-center justify-between mt-3 text-xs font-mono text-muted-foreground">
                <span>{jdWords} words</span>
                <span>Minimum 100</span>
              </div>
            </section>

            <div className="flex items-center justify-between border-t border-foreground pt-8">
              <div className="font-serif-italic text-muted-foreground text-sm">
                Takes ~20 seconds.
              </div>
              <button
                onClick={run}
                disabled={!file || jdWords < 100}
                className="bg-foreground text-background px-8 py-4 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Run assessment →
              </button>
            </div>
          </div>
        )}

        {(step === "processing" || step === "saving") && (
          <div className="mt-16 py-16 text-center">
            <div className="font-serif-italic text-2xl text-muted-foreground animate-pulse">
              {step === "saving" ? "Saving your profile…" : progress}
            </div>
          </div>
        )}

        {step === "review" && profile && (
          <ProfileEditor
            profile={profile}
            setProfile={setProfile}
            onSave={() => { setError(null); setStep("preferences"); window.scrollTo(0, 0); }}
          />
        )}

        {step === "preferences" && (
          <div className="mt-16 space-y-12">
            <div>
              <div className="label-eyebrow">Step 2 · Preferences</div>
              <h2 className="font-display text-4xl mt-3">What makes a job fit you?</h2>
              <p className="text-muted-foreground mt-3 text-base max-w-xl">
                These signals power every assessment. Skip what you don't care about.
              </p>
            </div>
            <PreferencesEditor value={preferences} onChange={setPreferences} />
            <div className="flex items-center justify-between border-t border-foreground pt-8">
              <button
                onClick={() => setStep("review")}
                className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
              >
                ← Back to profile
              </button>
              <button
                onClick={save}
                className="bg-foreground text-background px-6 py-3 hover:opacity-90"
              >
                Finish setup →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Uploader({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`block border border-dashed py-12 text-center cursor-pointer transition ${
        drag ? "border-foreground bg-foreground/[0.03]" : "border-border hover:border-foreground/60"
      }`}
    >
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <>
          <div className="font-display text-2xl">{file.name}</div>
          <div className="text-sm text-muted-foreground mt-2">Click or drop to replace</div>
        </>
      ) : (
        <>
          <div className="font-display text-2xl">Drop your CV here</div>
          <div className="text-sm text-muted-foreground mt-2">or click to browse · PDF, DOC, DOCX</div>
        </>
      )}
    </label>
  );
}

function ProfileEditor({
  profile,
  setProfile,
  onSave,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onSave: () => void;
}) {
  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch });

  return (
    <div className="mt-16 space-y-16">
      <section>
        <div className="label-eyebrow mb-6">Identity</div>
        <div className="grid grid-cols-2 gap-8">
          <Field label="Name" value={profile.name} onChange={(v) => update({ name: v })} />
          <Field label="Current title" value={profile.title} onChange={(v) => update({ title: v })} />
          <Field
            label="Years experience"
            type="number"
            value={String(profile.years_experience ?? 0)}
            onChange={(v) => update({ years_experience: parseInt(v) || 0 })}
          />
        </div>
      </section>

      <ListEditor label="Skills" items={profile.skills} onChange={(items) => update({ skills: items })} />
      <ListEditor label="Languages" items={profile.languages ?? []} onChange={(items) => update({ languages: items })} />
      <ListEditor label="Key outcomes" items={profile.outcomes} onChange={(items) => update({ outcomes: items })} multiline />
      <ListEditor label="Seniority signals" items={profile.seniority_signals} onChange={(items) => update({ seniority_signals: items })} />

      <section>
        <div className="label-eyebrow mb-6">Roles</div>
        <div className="space-y-4">
          {profile.roles.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-3">
              <input
                value={r.title}
                onChange={(e) => {
                  const next = [...profile.roles];
                  next[i] = { ...r, title: e.target.value };
                  update({ roles: next });
                }}
                className="bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
              />
              <input
                value={r.company}
                onChange={(e) => {
                  const next = [...profile.roles];
                  next[i] = { ...r, company: e.target.value };
                  update({ roles: next });
                }}
                className="bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
              />
              <input
                value={r.duration}
                onChange={(e) => {
                  const next = [...profile.roles];
                  next[i] = { ...r, duration: e.target.value };
                  update({ roles: next });
                }}
                className="bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-foreground pt-8">
        <div className="font-serif-italic text-muted-foreground">
          Your profile is ready. Edit anything that's off.
        </div>
        <button
          onClick={onSave}
          className="bg-foreground text-background px-6 py-3 hover:opacity-90"
        >
          Continue to preferences →
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="label-eyebrow mb-2">{label}</div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-border focus:border-foreground py-2 text-base focus:outline-none transition-colors"
      />
    </label>
  );
}

function ListEditor({
  label,
  items,
  onChange,
  multiline,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  multiline?: boolean;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-6">
        <div className="label-eyebrow">{label}</div>
        <button
          onClick={() => onChange([...items, ""])}
          className="text-xs font-mono text-muted-foreground hover:text-foreground"
        >
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3 items-start">
            {multiline ? (
              <textarea
                value={it}
                onChange={(e) => {
                  const n = [...items]; n[i] = e.target.value; onChange(n);
                }}
                rows={2}
                className="flex-1 bg-card border border-border focus:border-foreground p-3 text-sm focus:outline-none transition-colors"
              />
            ) : (
              <input
                value={it}
                onChange={(e) => {
                  const n = [...items]; n[i] = e.target.value; onChange(n);
                }}
                className="flex-1 bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none transition-colors"
              />
            )}
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive text-sm pt-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
