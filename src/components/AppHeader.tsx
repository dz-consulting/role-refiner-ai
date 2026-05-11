import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur supports-[backdrop-filter]:bg-surface/40 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-baseline gap-2 group">
          <span className="font-display text-2xl tracking-tight">JobMatch</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">AI</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {email && <span className="font-mono text-xs text-muted-foreground">{email}</span>}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
