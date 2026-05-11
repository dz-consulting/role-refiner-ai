import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/cv-extract";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
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
};

function OnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<"upload" | "extracting" | "review" | "saving">("upload");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cvText, setCvText] = useState("");
  const [cvFilePath, setCvFilePath] = useState("");

  const handleFile = async (file: File) => {
    setError(null);
    setStep("extracting");
    try {
      setProgress("Reading your CV...");
      const text = await extractTextFromFile(file);
      if (text.length < 200) throw new Error("That CV looks empty. Try another file.");
      setCvText(text);

      setProgress("Uploading...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file);
      if (upErr) throw upErr;
      setCvFilePath(path);

      setProgress("Extracting structured profile with AI...");
      const { data, error: fnErr } = await supabase.functions.invoke("extract-cv", {
        body: { cvText: text },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setProfile(data.profile);
      setStep("review");
    } catch (e: any) {
      setError(e.message ?? "Failed to process CV");
      setStep("upload");
    }
  };

  const save = async () => {
    if (!profile) return;
    setStep("saving");
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
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
          raw_text: cvText,
          cv_file_path: cvFilePath,
        }, { onConflict: "user_id" });
      if (upErr) throw upErr;
      nav({ to: "/dashboard" });
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
      setStep("review");
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-8 py-16">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
          Step 1 of 1 · Onboarding
        </div>
        <h1 className="font-display text-4xl tracking-tight">Upload your CV</h1>
        <p className="text-muted-foreground mt-3">
          One upload powers every assessment after this. PDF or Word.
        </p>

        {error && (
          <div className="mt-6 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        {step === "upload" && <Uploader onFile={handleFile} />}

        {(step === "extracting" || step === "saving") && (
          <div className="mt-10 border border-border rounded-md p-10 bg-surface text-center">
            <div className="font-mono text-xs text-muted-foreground animate-pulse">
              {step === "saving" ? "Saving your profile..." : progress}
            </div>
          </div>
        )}

        {step === "review" && profile && (
          <ProfileEditor profile={profile} setProfile={setProfile} onSave={save} />
        )}
      </main>
    </div>
  );
}

function Uploader({ onFile }: { onFile: (f: File) => void }) {
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
      className={`mt-10 block border-2 border-dashed rounded-md p-16 text-center cursor-pointer transition ${
        drag ? "border-accent bg-accent/5" : "border-border bg-surface hover:bg-surface/70"
      }`}
    >
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="font-display text-2xl">Drop your CV here</div>
      <div className="text-sm text-muted-foreground mt-2">or click to browse · PDF, DOC, DOCX</div>
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
    <div className="mt-10 space-y-8">
      <div className="border border-border rounded-md bg-surface p-6">
        <SectionLabel>Identity</SectionLabel>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Name" value={profile.name} onChange={(v) => update({ name: v })} />
          <Field label="Current title" value={profile.title} onChange={(v) => update({ title: v })} />
          <Field
            label="Years experience"
            type="number"
            value={String(profile.years_experience ?? 0)}
            onChange={(v) => update({ years_experience: parseInt(v) || 0 })}
          />
        </div>
      </div>

      <ListEditor
        label="Skills"
        items={profile.skills}
        onChange={(items) => update({ skills: items })}
      />
      <ListEditor
        label="Key outcomes"
        items={profile.outcomes}
        onChange={(items) => update({ outcomes: items })}
        multiline
      />
      <ListEditor
        label="Seniority signals"
        items={profile.seniority_signals}
        onChange={(items) => update({ seniority_signals: items })}
      />

      <div className="border border-border rounded-md bg-surface p-6">
        <SectionLabel>Roles</SectionLabel>
        <div className="space-y-3 mt-4">
          {profile.roles.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-3">
              <input
                value={r.title}
                onChange={(e) => {
                  const next = [...profile.roles];
                  next[i] = { ...r, title: e.target.value };
                  update({ roles: next });
                }}
                className="bg-input border border-border rounded px-3 py-2 text-sm"
              />
              <input
                value={r.company}
                onChange={(e) => {
                  const next = [...profile.roles];
                  next[i] = { ...r, company: e.target.value };
                  update({ roles: next });
                }}
                className="bg-input border border-border rounded px-3 py-2 text-sm"
              />
              <input
                value={r.duration}
                onChange={(e) => {
                  const next = [...profile.roles];
                  next[i] = { ...r, duration: e.target.value };
                  update({ roles: next });
                }}
                className="bg-input border border-border rounded px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <div className="text-sm text-muted-foreground">
          Your profile is ready. Edit anything that's off.
        </div>
        <button
          onClick={onSave}
          className="bg-accent text-accent-foreground font-medium px-6 py-2.5 rounded-md hover:opacity-90"
        >
          Save and continue →
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
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
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
    <div className="border border-border rounded-md bg-surface p-6">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <button
          onClick={() => onChange([...items, ""])}
          className="text-xs font-mono text-accent hover:underline"
        >
          + Add
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            {multiline ? (
              <textarea
                value={it}
                onChange={(e) => {
                  const n = [...items]; n[i] = e.target.value; onChange(n);
                }}
                rows={2}
                className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={it}
                onChange={(e) => {
                  const n = [...items]; n[i] = e.target.value; onChange(n);
                }}
                className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm"
              />
            )}
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive text-sm px-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
