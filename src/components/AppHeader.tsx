import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ email: _email }: { email?: string | null }) {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-base">
          JobMatch
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/profile" className="hover:text-foreground transition-colors">
            Profile
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
