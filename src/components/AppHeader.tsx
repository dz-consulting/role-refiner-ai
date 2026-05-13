import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ email: _email }: { email?: string | null }) {
  return (
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl tracking-tight">
          JobMatch
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            Profile
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
