import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof) {
        nav({ to: "/onboarding" });
        return;
      }
      setProfile(prof);
      const { data: rows } = await supabase
        .from("assessments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setAssessments(rows ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader email={email} />
        <div className="max-w-6xl mx-auto p-8 font-mono text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const skills: string[] = profile?.skills ?? [];
  const counts = {
    total: assessments.length,
    applied: assessments.filter((a) => a.status === "applied").length,
    inProcess: assessments.filter((a) => a.status === "in_process").length,
  };

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />
      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Profile strip */}
        <section className="border border-border bg-surface rounded-md p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Your profile
            </div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <h1 className="font-display text-3xl tracking-tight">{profile.name || "—"}</h1>
              <span className="text-muted-foreground">·</span>
              <span className="text-lg">{profile.title || "—"}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {profile.years_experience ?? 0} yrs
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-mono px-2 py-1 border border-border rounded text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <Link
            to="/profile"
            className="text-xs font-mono text-muted-foreground hover:text-foreground"
          >
            Edit profile →
          </Link>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-3 gap-4 mt-6">
          <Metric label="Assessed" value={counts.total} />
          <Metric label="Applied" value={counts.applied} />
          <Metric label="In process" value={counts.inProcess} />
        </section>

        {/* Recent assessments */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Recent assessments</h2>
            <Link
              to="/assess"
              className="bg-accent text-accent-foreground font-medium px-5 py-2.5 rounded-md hover:opacity-90"
            >
              + Assess a new job
            </Link>
          </div>

          {assessments.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-6 border border-border rounded-md bg-surface divide-y divide-border">
              {assessments.map((a) => (
                <Link
                  key={a.id}
                  to="/assessment/$id"
                  params={{ id: a.id }}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-surface/60 transition"
                >
                  <div className={`font-mono text-xs px-2 py-1 rounded border w-20 text-center ${labelStyle(a.fit_label)}`}>
                    {a.fit_score ?? "—"}/10
                  </div>
                  <div>
                    <div className="font-medium">{a.role_title || "Untitled role"}</div>
                    <div className="text-xs text-muted-foreground">{a.company || "—"}</div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.fit_label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function labelStyle(label: string | null) {
  if (label === "STRONG FIT") return "border-success/40 text-success";
  if (label === "PARTIAL FIT") return "border-warning/40 text-warning";
  if (label === "POOR FIT") return "border-destructive/40 text-destructive";
  return "border-border text-muted-foreground";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-surface rounded-md p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-4xl mt-2 tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 border border-dashed border-border rounded-md bg-surface/40 p-12 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
        Empty
      </div>
      <h3 className="font-display text-2xl">No assessments yet</h3>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
        Paste a job description to get a real fit score and a tailored CV.
      </p>
      <Link
        to="/assess"
        className="inline-block mt-6 bg-accent text-accent-foreground font-medium px-5 py-2.5 rounded-md hover:opacity-90"
      >
        Assess your first job →
      </Link>
    </div>
  );
}
