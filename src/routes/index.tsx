import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getAnonProfile } from "@/lib/anon-store";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
    // Anon users: skip straight to onboarding if no profile, else dashboard.
    if (typeof window !== "undefined") {
      throw redirect({ to: getAnonProfile() ? "/dashboard" : "/auth" });
    }
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
