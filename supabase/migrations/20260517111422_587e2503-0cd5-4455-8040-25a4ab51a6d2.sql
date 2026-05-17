
-- Admin gating: env-allowlisted email checked via a SECURITY DEFINER function.
-- The allow-list is stored as a setting on the postgres role so it can be
-- changed without a migration:
--   ALTER DATABASE postgres SET app.admin_emails = 'you@example.com,other@example.com';
-- For now we hard-default to a single email; update via app.admin_emails later.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = any (
        string_to_array(
          lower(coalesce(current_setting('app.admin_emails', true), '')),
          ','
        )
      )
  );
$$;

-- eval_cases: input fixtures
create table public.eval_cases (
  id uuid primary key default gen_random_uuid(),
  profile jsonb not null,
  job_description text not null,
  tags text[] not null default '{}',
  source text not null default 'seed' check (source in ('seed','from_production','from_correction')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.eval_cases enable row level security;
create policy "admins manage eval_cases"
  on public.eval_cases for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger eval_cases_set_updated_at
  before update on public.eval_cases
  for each row execute function public.tg_set_updated_at();

-- eval_runs: one execution of assess-job against a case
create table public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.eval_cases(id) on delete cascade,
  prompt_label text,
  prompt_version int,
  model text,
  langfuse_trace_id text,
  output jsonb,
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);

create index eval_runs_case_id_idx on public.eval_runs(case_id);
create index eval_runs_created_at_idx on public.eval_runs(created_at desc);

alter table public.eval_runs enable row level security;
create policy "admins manage eval_runs"
  on public.eval_runs for all
  using (public.is_admin())
  with check (public.is_admin());

-- eval_scores: one row per check, many per run
create table public.eval_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.eval_runs(id) on delete cascade,
  scorer text not null check (scorer in ('code','heuristic','llm_judge','human')),
  name text not null,
  value numeric,
  passed boolean,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index eval_scores_run_id_idx on public.eval_scores(run_id);
create index eval_scores_scorer_name_idx on public.eval_scores(scorer, name);

alter table public.eval_scores enable row level security;
create policy "admins manage eval_scores"
  on public.eval_scores for all
  using (public.is_admin())
  with check (public.is_admin());

-- eval_review_queue: items needing your attention
create table public.eval_review_queue (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.eval_runs(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  verdict text check (verdict in ('good','bad','needs_prompt_fix')),
  prompt_fix_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index eval_review_queue_status_idx on public.eval_review_queue(status, created_at desc);
create index eval_review_queue_assessment_idx on public.eval_review_queue(assessment_id);

alter table public.eval_review_queue enable row level security;
create policy "admins manage eval_review_queue"
  on public.eval_review_queue for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger eval_review_queue_set_updated_at
  before update on public.eval_review_queue
  for each row execute function public.tg_set_updated_at();
