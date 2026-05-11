import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/dashboard" });
    } catch (e: any) {
      setErr(e.message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border bg-surface/40">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl">JobMatch</span>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">AI</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
            Stop guessing whether you're a fit.
          </h1>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            Upload your CV once. Paste any job description. Get an honest, requirement-by-requirement
            assessment and a tailored CV in under a minute.
          </p>
          <div className="mt-12 space-y-3 font-mono text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="text-accent">→</span> Decoded JD intent and seniority signals
            </div>
            <div className="flex items-center gap-3">
              <span className="text-accent">→</span> Brutally honest fit score, no soft language
            </div>
            <div className="flex items-center gap-3">
              <span className="text-accent">→</span> ATS-ready tailored CV, downloadable
            </div>
          </div>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          Built for senior professionals · No hand-holding
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="font-display text-3xl">
              {mode === "signin" ? "Sign in" : "Create account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {mode === "signin" ? "Welcome back." : "Takes 30 seconds."}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {err && (
            <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-foreground font-medium py-2.5 rounded-md hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
