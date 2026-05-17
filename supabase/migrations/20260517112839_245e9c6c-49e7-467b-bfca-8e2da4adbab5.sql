
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.admin_emails a ON lower(a.email) = lower(u.email)
    WHERE u.id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "admins manage admin_emails" ON public.admin_emails;
CREATE POLICY "admins manage admin_emails"
ON public.admin_emails
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

INSERT INTO public.admin_emails (email) VALUES ('david.f.zaki@gmail.com')
ON CONFLICT (email) DO NOTHING;
