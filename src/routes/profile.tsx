import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  component: ProfilePage,
});

type Profile = {
  name: string;
  title: string;
  years_experience: number;
  skills: string[];
  roles: { title: string; company: string; duration: string }[];
  outcomes: string[];
  seniority_signals: string[];
  raw_text?: string;
};

function ProfilePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof) { nav({ to: "/onboarding" }); return; }
      setProfile({
        name: prof.name ?? "",
        title: prof.title ?? "",
        years_experience: prof.years_experience ?? 0,
        skills: (prof.skills as any) ?? [],
        roles: (prof.roles as any) ?? [],
        outcomes: (prof.outcomes as any) ?? [],
        seniority_signals: (prof.seniority_signals as any) ?? [],
        raw_text: prof.raw_text ?? "",
      });
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<Profile>) =>
    setProfile((p) => (p ? { ...p, ...patch } : p));

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          title: profile.title,
          years_experience: profile.years_experience,
          skills: profile.skills,
          roles: profile.roles,
          outcomes: profile.outcomes,
          seniority_signals: profile.seniority_signals,
        })
        .eq("user_id", user.id);
      if (upErr) throw upErr;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen">
        <AppHeader email={email} />
        <div className="max-w-4xl mx-auto p-8 font-mono text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent mb-2">
              Your profile
            </div>
            <h1 className="font-display text-4xl tracking-tight">Extracted from your CV</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Edit anything that's wrong. This profile powers every assessment.
            </p>
          </div>
          <Link to="/dashboard" className="text-xs font-mono text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>

        {error && (
          <div className="mt-6 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-8">
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

          <ListEditor label="Skills" items={profile.skills} onChange={(items) => update({ skills: items })} />
          <ListEditor label="Key outcomes" items={profile.outcomes} onChange={(items) => update({ outcomes: items })} multiline />
          <ListEditor label="Seniority signals" items={profile.seniority_signals} onChange={(items) => update({ seniority_signals: items })} />

          <div className="border border-border rounded-md bg-surface p-6">
            <div className="flex items-center justify-between">
              <SectionLabel>Roles</SectionLabel>
              <button
                onClick={() => update({ roles: [...profile.roles, { title: "", company: "", duration: "" }] })}
                className="text-xs font-mono text-accent hover:underline"
              >
                + Add role
              </button>
            </div>
            <div className="space-y-3 mt-4">
              {profile.roles.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
                  <input
                    placeholder="Title"
                    value={r.title}
                    onChange={(e) => {
                      const next = [...profile.roles];
                      next[i] = { ...r, title: e.target.value };
                      update({ roles: next });
                    }}
                    className="bg-input border border-border rounded px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Company"
                    value={r.company}
                    onChange={(e) => {
                      const next = [...profile.roles];
                      next[i] = { ...r, company: e.target.value };
                      update({ roles: next });
                    }}
                    className="bg-input border border-border rounded px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Duration"
                    value={r.duration}
                    onChange={(e) => {
                      const next = [...profile.roles];
                      next[i] = { ...r, duration: e.target.value };
                      update({ roles: next });
                    }}
                    className="bg-input border border-border rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => update({ roles: profile.roles.filter((_, idx) => idx !== i) })}
                    className="text-muted-foreground hover:text-destructive text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {profile.raw_text && (
            <div className="border border-border rounded-md bg-surface p-6">
              <div className="flex items-center justify-between">
                <SectionLabel>Raw CV text</SectionLabel>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-xs font-mono text-accent hover:underline"
                >
                  {showRaw ? "Hide" : "Show"}
                </button>
              </div>
              {showRaw && (
                <pre className="mt-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground max-h-96 overflow-auto border border-border rounded p-3 bg-background">
                  {profile.raw_text}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-6">
            <Link to="/onboarding" className="text-xs font-mono text-muted-foreground hover:text-foreground">
              Re-upload CV →
            </Link>
            <div className="flex items-center gap-4">
              {saved && <span className="font-mono text-xs text-success">Saved</span>}
              <button
                onClick={save}
                disabled={saving}
                className="bg-accent text-accent-foreground font-medium px-6 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </main>
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
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
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
  label, items, onChange, multiline,
}: { label: string; items: string[]; onChange: (items: string[]) => void; multiline?: boolean }) {
  return (
    <div className="border border-border rounded-md bg-surface p-6">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <button onClick={() => onChange([...items, ""])} className="text-xs font-mono text-accent hover:underline">
          + Add
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            {multiline ? (
              <textarea
                value={it}
                onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
                rows={2}
                className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={it}
                onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
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
        {items.length === 0 && (
          <div className="text-xs font-mono text-muted-foreground italic">None extracted</div>
        )}
      </div>
    </div>
  );
}
