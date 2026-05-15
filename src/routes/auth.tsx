import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const usernameToEmail = (u: string) =>
    `${u.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@users.jobmatch.local`;

  const resolveEmail = (raw: string) => {
    const v = raw.trim();
    if (isEmail(v)) return v.toLowerCase();
    const uname = v.toLowerCase();
    if (!/^[a-z0-9_.-]{3,}$/.test(uname)) {
      throw new Error("Enter a valid email or a username (3+ chars: letters, numbers, . _ -).");
    }
    return usernameToEmail(uname);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const email = resolveEmail(identifier);
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm py-24">
        <div className="font-display text-3xl tracking-tight">JobMatch</div>
        <div className="label-eyebrow mt-1">Your job search, measured</div>

        <h1 className="font-display text-4xl mt-10 leading-[1.05]">
          Find out why you keep getting <span className="font-serif-italic">rejected</span>.
        </h1>
        <p className="text-muted-foreground mt-5 text-base leading-relaxed">
          Most job searches are a black box. We turn yours into a funnel — track every application,
          measure conversion at each stage, and fix the leak that's costing you offers.
        </p>

        {/* Primary CTA — beta guest mode */}
        <div className="mt-8 border border-foreground p-6 bg-surface">
          <div className="label-eyebrow">Beta · No account needed</div>
          <h2 className="font-display text-2xl mt-2 leading-tight">
            Diagnose your first job — <span className="font-serif-italic">free</span>.
          </h2>
          <p className="text-caption mt-2">
            Up to 3 assessments per day. No signup. Your data stays in your browser.
          </p>
          <button
            type="button"
            onClick={() => nav({ to: "/onboarding" })}
            className="w-full mt-5 bg-foreground text-background font-medium py-3 hover:opacity-90 transition"
          >
            Start free →
          </button>
        </div>

        <div className="flex items-center gap-4 mt-10">
          <div className="flex-1 h-px bg-border" />
          <div className="label-eyebrow">Or</div>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="mt-10 space-y-8">
          <h1 className="font-display text-4xl">
            {mode === "signin" ? "Sign in." : "Create account."}
          </h1>

          <div className="space-y-6">
            <Input
              label="Username or email"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="alex@example.com"
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {err && (
            <div className="text-sm text-destructive border-l-2 border-destructive pl-3 py-1">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-foreground text-foreground font-medium py-3 hover:bg-foreground hover:text-background transition disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Don't have an account? Sign up." : "Already have an account? Sign in."}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <div className="label-eyebrow mb-2">{label}</div>
      <input
        {...props}
        className="w-full bg-transparent border-b border-foreground/40 focus:border-foreground py-2 text-base focus:outline-none transition-colors"
      />
    </label>
  );
}
