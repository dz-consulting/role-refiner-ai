import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";
import { PreferencesEditor } from "@/components/PreferencesEditor";
import { Preferences, emptyPreferences, mergePreferences } from "@/lib/preferences";

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
  languages: string[];
  raw_text?: string;
};

function ProfilePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences());
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
        languages: ((prof as any).languages as any) ?? [],
        raw_text: prof.raw_text ?? "",
      });
      setPreferences(mergePreferences((prof as any).preferences));
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
          preferences: preferences as any,
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
        <div className="max-w-3xl mx-auto px-8 py-24 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />
      <main className="max-w-3xl mx-auto px-8 py-16">
        <Link to="/dashboard" className="text-xs font-mono text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>

        <header className="mt-12">
          <div className="label-eyebrow">Your profile</div>
          <h1 className="font-display text-5xl mt-3">Extracted from your CV.</h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-xl">
            Edit anything that's wrong. This profile powers every assessment.
          </p>
        </header>

        {error && (
          <div className="mt-8 text-sm text-destructive border-l-2 border-destructive pl-3 py-1">
            {error}
          </div>
        )}

        <div className="mt-16 space-y-16">
          <Block title="Identity" number="01">
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
          </Block>

          <ListEditor number="02" label="Skills" items={profile.skills} onChange={(items) => update({ skills: items })} />
          <ListEditor number="03" label="Key outcomes" items={profile.outcomes} onChange={(items) => update({ outcomes: items })} multiline />
          <ListEditor number="04" label="Seniority signals" items={profile.seniority_signals} onChange={(items) => update({ seniority_signals: items })} />

          <Block
            title="Roles"
            number="05"
            action={
              <button
                onClick={() => update({ roles: [...profile.roles, { title: "", company: "", duration: "" }] })}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                + Add role
              </button>
            }
          >
            <div className="space-y-4">
              {profile.roles.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
                  <input
                    placeholder="Title"
                    value={r.title}
                    onChange={(e) => {
                      const next = [...profile.roles];
                      next[i] = { ...r, title: e.target.value };
                      update({ roles: next });
                    }}
                    className="bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
                  />
                  <input
                    placeholder="Company"
                    value={r.company}
                    onChange={(e) => {
                      const next = [...profile.roles];
                      next[i] = { ...r, company: e.target.value };
                      update({ roles: next });
                    }}
                    className="bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
                  />
                  <input
                    placeholder="Duration"
                    value={r.duration}
                    onChange={(e) => {
                      const next = [...profile.roles];
                      next[i] = { ...r, duration: e.target.value };
                      update({ roles: next });
                    }}
                    className="bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => update({ roles: profile.roles.filter((_, idx) => idx !== i) })}
                    className="text-muted-foreground hover:text-destructive text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Preferences" number="06">
            <PreferencesEditor value={preferences} onChange={setPreferences} />
          </Block>

          {profile.raw_text && (
            <Block
              title="Raw CV text"
              number="07"
              action={
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground"
                >
                  {showRaw ? "Hide" : "Show"}
                </button>
              }
            >
              {showRaw && (
                <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground max-h-96 overflow-auto border border-border p-4 bg-card">
                  {profile.raw_text}
                </pre>
              )}
            </Block>
          )}

          <div className="flex items-center justify-between border-t border-foreground pt-8">
            <Link to="/onboarding" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
              Re-upload CV
            </Link>
            <div className="flex items-center gap-6">
              {saved && <span className="font-serif-italic text-sm text-success">Saved</span>}
              <button
                onClick={save}
                disabled={saving}
                className="bg-foreground text-background px-6 py-3 hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Block({ number, title, children, action }: { number: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-6">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{number}</span>
          <h2 className="font-display text-3xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
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
  number, label, items, onChange, multiline,
}: { number: string; label: string; items: string[]; onChange: (items: string[]) => void; multiline?: boolean }) {
  return (
    <Block
      number={number}
      title={label}
      action={
        <button onClick={() => onChange([...items, ""])} className="text-xs font-mono text-muted-foreground hover:text-foreground">
          + Add
        </button>
      }
    >
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3 items-start">
            {multiline ? (
              <textarea
                value={it}
                onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
                rows={2}
                className="flex-1 bg-card border border-border focus:border-foreground p-3 text-sm focus:outline-none transition-colors"
              />
            ) : (
              <input
                value={it}
                onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
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
        {items.length === 0 && (
          <div className="text-sm font-serif-italic text-muted-foreground">None extracted.</div>
        )}
      </div>
    </Block>
  );
}
