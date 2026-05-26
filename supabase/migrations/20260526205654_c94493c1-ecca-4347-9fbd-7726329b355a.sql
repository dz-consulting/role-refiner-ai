
-- Enable RLS on claude_logs and restrict to admins only
ALTER TABLE public.claude_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage claude_logs"
ON public.claude_logs
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add admin management policies on waitlist (SELECT/UPDATE/DELETE)
CREATE POLICY "admins select waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "admins update waitlist"
ON public.waitlist
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admins delete waitlist"
ON public.waitlist
FOR DELETE
TO authenticated
USING (public.is_admin());
