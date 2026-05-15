import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ email: _email }: { email?: string | null }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl tracking-tight">
          JobMatch
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          {signedIn && (
            <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
              Profile
            </Link>
          )}
          {signedIn ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link to="/auth" className="text-foreground hover:opacity-80 transition-opacity">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
