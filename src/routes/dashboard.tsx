import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
        <div className="max-w-4xl mx-auto px-8 py-24 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />
      <main className="max-w-3xl mx-auto px-8 py-24">
        {/* Greeting */}
        <div className="label-eyebrow">Welcome back</div>
        <h1 className="font-display text-5xl mt-3">
          {profile.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg">
          {profile.title ? `${profile.title} · ${profile.years_experience ?? 0} years` : "Your profile is ready."}{" "}
          <Link to="/profile" className="underline underline-offset-4 hover:text-foreground">edit</Link>
        </p>

        {/* Primary CTA */}
        <div className="mt-16">
          <Link
            to="/assess"
            className="inline-block bg-foreground text-background px-8 py-4 text-base hover:opacity-90 transition"
          >
            Assess a new job →
          </Link>
        </div>

        {/* Assessments */}
        <div className="mt-24">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Assessments</h2>
            <span className="label-eyebrow">{assessments.length} total</span>
          </div>

          <div className="editorial-rule mt-4" />

          {assessments.length === 0 ? (
            <p className="mt-12 text-muted-foreground italic font-display text-xl">
              Nothing yet. Paste a job description to begin.
            </p>
          ) : (
            <ul>
              {assessments.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/assessment/$id"
                    params={{ id: a.id }}
                    className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6 py-6 border-b border-border hover:bg-foreground/[0.02] transition px-1 -mx-1"
                  >
                    <div className="font-display text-3xl tabular-nums w-14">
                      {a.fit_score ?? "—"}
                    </div>
                    <div>
                      <div className="font-display text-xl leading-tight">{a.role_title || "Untitled role"}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {a.company || "—"} · <span className="font-serif-italic">{(a.fit_label ?? "").toLowerCase()}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
