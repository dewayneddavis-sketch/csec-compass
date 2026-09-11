-- CSEC Compass — Supabase schema for purchase/access gating.
-- Run this in the Supabase SQL editor (project qognlaemukntbqutdcjw)
-- if the `purchases` table does not exist yet.
--
-- Conventions (must match api/purchases/list.js, api/stripe/webhook.js,
-- api/admin/grant-access.js):
--   purchase_type = 'bundle'            -> grants every subject
--   purchase_type = '<subjectId>'       -> grants that one subject
--   subject_id    mirrors purchase_type for subject rows, NULL for bundle

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text,
  purchase_type text not null,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists purchases_user_bundle_uniq
  on public.purchases (user_id, purchase_type)
  where purchase_type = 'bundle';

-- Row Level Security: clients must NOT read/write purchases directly.
-- All access goes through the server-side service-role key in /api/*.
alter table public.purchases enable row level security;

drop policy if exists "purchases: no direct client access" on public.purchases;
create policy "purchases: no direct client access"
  on public.purchases for all
  using (false)
  with check (false);

-- ===========================================================================
-- quiz_results — per-user, per-question quiz analytics (weak-topic tracking)
-- Used by the weak-topic analytics + targeted revision path feature.
-- Written by api/analytics/record.js (service role), read by
-- api/analytics/summary.js (service role). One row per question answered.
--   quiz_type   : 'knowledge-check' | 'practice' | 'mock'
--   topic       : lesson id from the question's `topic` field
--   attempt_id  : uuid grouping one quiz sitting, so per-attempt scores and
--                 pass-rate trends can be reconstructed from individual rows
-- ===========================================================================
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null,
  quiz_type text not null,
  attempt_id uuid not null,
  question_id text,
  topic text,
  correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists quiz_results_user_subject_idx
  on public.quiz_results (user_id, subject_id, topic);

alter table public.quiz_results enable row level security;

drop policy if exists "quiz_results: no direct client access" on public.quiz_results;
create policy "quiz_results: no direct client access"
  on public.quiz_results for all
  using (false)
  with check (false);

-- ===========================================================================
-- revision_plans — per-user revision planner state (exam dates + week plan)
-- ONE row per user; `plan` is a JSONB blob holding the generated week-by-week
-- plan, completion state, and streak data. Written/read by api/planner/sync.js
-- and api/planner/load.js (service role) when the user is signed in;
-- localStorage is the always-on fallback (works logged-out).
-- ===========================================================================
create table if not exists public.revision_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.revision_plans enable row level security;

drop policy if exists "revision_plans: no direct client access" on public.revision_plans;
create policy "revision_plans: no direct client access"
  on public.revision_plans for all
  using (false)
  with check (false);
