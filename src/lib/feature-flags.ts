import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Feature flags. Flip a value to true/false to enable/disable a feature
 * across the whole app. Keep these grouped by domain.
 *
 * NOTE on `requireAuth = false`:
 * - The /auth gate is skipped, so you can browse pages freely.
 * - The Supabase database still uses Row-Level Security, so reads/writes
 *   that depend on auth.uid() will return empty / fail until you sign in.
 *   Use this for UI work, not for end-to-end testing of data flows.
 */
export const FEATURES = {
  requireAuth: true,
  showHeader: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}

/**
 * Use inside a route's `beforeLoad` to enforce sign-in.
 * No-op when the `requireAuth` flag is off.
 */
export async function requireAuth() {
  if (!FEATURES.requireAuth) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw redirect({ to: "/auth" });
}
