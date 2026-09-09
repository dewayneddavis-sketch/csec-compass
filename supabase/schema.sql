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
