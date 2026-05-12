import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FEATURES } from "@/lib/feature-flags";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!FEATURES.requireAuth) {
      throw redirect({ to: "/dashboard" });
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
