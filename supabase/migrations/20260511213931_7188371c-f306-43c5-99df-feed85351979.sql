
-- Profiles: one per user, holds extracted CV data
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  title text,
  years_experience integer,
  skills jsonb default '[]'::jsonb,
  roles jsonb default '[]'::jsonb,
  outcomes jsonb default '[]'::jsonb,
  seniority_signals jsonb default '[]'::jsonb,
  raw_text text,
  cv_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users select own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "users delete own profile" on public.profiles for delete using (auth.uid() = user_id);

-- Assessments
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_description text not null,
  company text,
  role_title text,
  fit_score numeric,
  fit_label text,
  fit_summary text,
  job_decoder jsonb,
  requirements jsonb,
  screening_risks jsonb,
  status text not null default 'assessed', -- assessed | applied | in_process | skipped
  tailored_cv jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessments enable row level security;

create policy "users select own assessments" on public.assessments for select using (auth.uid() = user_id);
create policy "users insert own assessments" on public.assessments for insert with check (auth.uid() = user_id);
create policy "users update own assessments" on public.assessments for update using (auth.uid() = user_id);
create policy "users delete own assessments" on public.assessments for delete using (auth.uid() = user_id);

create index assessments_user_created_idx on public.assessments(user_id, created_at desc);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger assessments_updated_at before update on public.assessments
  for each row execute function public.tg_set_updated_at();

-- CV storage bucket (private)
insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false)
on conflict (id) do nothing;

create policy "users read own cvs" on storage.objects for select
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users upload own cvs" on storage.objects for insert
  with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users update own cvs" on storage.objects for update
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users delete own cvs" on storage.objects for delete
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
