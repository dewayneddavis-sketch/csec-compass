-- CSEC Compass — Supabase schema for purchase/access gating.
-- Run this in the Supabase SQL editor (project qognlaemukntbqutdcjw)
-- if the `purchases` table does not exist yet.
--
-- Conventions (must match api/purchases/list.js, api/stripe/webhook.js,
-- api/admin/grant-access.js):
--   purchase_type = 'bundle'            -> grants every subject
--   purchase_type = 'school-license-50'
--                 | 'school-license-100'
--                 | 'school-license-150' -> grants every subject (school
--                                          license ladder, one year per
--                                          licence: 50 seats @ $25/student
--                                          = $1,250; 100 @ $20 = $2,000;
--                                          150 @ $15 = $2,250). The tier is
--                                          kept in purchase_type because a
--                                          school may buy the same tier twice.
--   purchase_type = '<subjectId>'       -> grants that one subject
--   subject_id    mirrors purchase_type for subject rows, NULL for bundle/school-license

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text,
  purchase_type text not null,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

-- Defensive: the live DB once carried a stray `purchases_purchase_type_check`
-- CHECK constraint (created outside this repo) that rejected subject-id
-- purchase_type rows (e.g. 'english-a') with a 500 "violates check constraint"
-- on every subject grant, blocking all per-subject purchases. Drop it if
-- present so a fresh or partially-migrated environment can never block
-- subject grants again.
alter table public.purchases drop constraint if exists purchases_purchase_type_check;

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
  -- Show-Your-Work: the student's typed working for THIS question
  -- (Mathematics prove-your-answer feature, 2026-09-18). NULL for subjects
  -- without the feature and for rows written before it shipped.
  working text,
  created_at timestamptz not null default now()
);

-- Idempotent upgrade for databases created before Show-Your-Work shipped.
alter table public.quiz_results add column if not exists working text;

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

-- ===========================================================================
-- user_progress — per-user, per-subject lesson progress (teacher dashboard)
-- Written ONLY by api/progress/sync.js (service role), from the student's own
-- browser after a tick or a finished lab. Read by api/analytics/summary.js
-- (service role) to show a linked teacher lessonsCompleted / quizCompleted per
-- subject, and by api/subjects/list.js.
--   completed_lessons : the lesson ids the student has ticked (a JSON array)
--   quiz_completed    : the end-of-course knowledge check is finished
-- ONE row per (user, subject) — the upsert targets that pair.
-- ===========================================================================
create table if not exists public.user_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null,
  completed_lessons jsonb not null default '[]'::jsonb,
  quiz_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress: no direct client access" on public.user_progress;
create policy "user_progress: no direct client access"
  on public.user_progress for all
  using (false)
  with check (false);

-- ===========================================================================
-- lab_activity — per-student interactive-lab engagement (teacher dashboard)
-- Written by api/analytics/record.js with { kind: "lab" } (service role) and
-- read by api/analytics/summary.js?scope=class (service role). One row per
-- (student, subject, lesson) — the lab for that lesson.
--   opens       : how many times the student opened that lesson's lab
--   completed   : true only when the lab itself reported a finish (labs with a
--                 right answer, e.g. DragDropLabel sets, signal completion);
--                 exploratory labs leave it false and are shown as "opened N
--                 times" rather than a false "done"
--   experiment_type : the lab type routed for that lesson (e.g. "flashcard")
-- ===========================================================================
create table if not exists public.lab_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null,
  lesson_id text not null,
  experiment_type text,
  opens integer not null default 0,
  completed boolean not null default false,
  first_activity_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create unique index if not exists lab_activity_user_lesson_uniq
  on public.lab_activity (user_id, subject_id, lesson_id);

create index if not exists lab_activity_user_idx
  on public.lab_activity (user_id, subject_id);

alter table public.lab_activity enable row level security;

drop policy if exists "lab_activity: no direct client access" on public.lab_activity;
create policy "lab_activity: no direct client access"
  on public.lab_activity for all
  using (false)
  with check (false);

-- ===========================================================================
-- teacher_students — which teacher may see which student (teacher dashboard)
-- ONE row per (teacher, student). Both sides are stored by EMAIL because the
-- owner creates the link in the admin screen (the student may not have signed
-- up yet) and emails are what the owner actually knows.
--   - Links are created/removed ONLY by the owner through
--     api/admin/grant-access.js { action: "teacher-link" | "teacher-unlink" },
--     which is behind the existing OWNER_EMAILS gate.
--   - Reads happen server-side in api/analytics/summary.js?scope=class, which
--     checks the caller's email against TEACHER_EMAILS (env) and then reads
--     only the students linked to that teacher. A teacher never sees another
--     teacher's class, and nobody reads this table from the browser.
-- ===========================================================================
create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  student_email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists teacher_students_pair_uniq
  on public.teacher_students (teacher_email, student_email);

create index if not exists teacher_students_teacher_idx
  on public.teacher_students (teacher_email);

alter table public.teacher_students enable row level security;

drop policy if exists "teacher_students: no direct client access" on public.teacher_students;
create policy "teacher_students: no direct client access"
  on public.teacher_students for all
  using (false)
  with check (false);

-- ===========================================================================
-- SCHOOLS — school-admin self-service on top of the links above
-- ---------------------------------------------------------------------------
-- A school licence used to leave the everyday work (who is in which class) with
-- the platform owner. These three tables let ONE designated person at the
-- school keep their own roster and links in order, inside one hard boundary.
--
--   public.schools        one row per school (name + the licence it bought).
--   public.school_admins  email -> school. A school names its own admin when it
--                         buys a licence (api/stripe/webhook.js provisions the
--                         row then); the OWNER can also create/name one in the
--                         admin screen, which stays the oversight + correction
--                         path. This table is the only source of "which school
--                         does this caller administer", so a request body can
--                         never name another school.
--   public.school_members email -> school, role 'teacher' | 'student'. The
--                         roster. BOTH sides of a link must be members of the
--                         same school, so a link can never join a student who
--                         belongs to another school.
--   teacher_students.school_id — who created the link. Rows a school admin
--                         writes carry their school; rows the owner creates
--                         platform-wide keep school_id NULL and are neither
--                         visible nor removable from a school admin's screen.
--
-- Reads and writes: api/admin/grant-access.js { action: "school-*" } only —
-- owner actions ("school-list", "school-create", "school-admin",
-- "school-member") keep the OWNER_EMAILS gate; the link/roster actions
-- ("school-roster", "school-link", "school-unlink", "school-member-add",
-- "school-member-remove") are gated on the caller's school_admins row instead
-- and are scoped to that one school. No browser reads these tables — RLS
-- denies all direct client access, like every other table here.
--
-- Scope note: a school admin links teachers to students and that is ALL they
-- can do. Student progress is untouched by this work: it stays behind
-- api/analytics/summary.js and its TEACHER_EMAILS gate, exactly as before.
-- ===========================================================================
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per school name, so "create the school" twice is a no-op instead of
-- a duplicate school with half its class on each.
create unique index if not exists schools_name_uniq on public.schools (name);

-- The licence the school bought, written by the webhook that recorded the
-- payment (school self-service — api/stripe/webhook.js). `seats` is the LARGEST
-- licence the school holds; both stay NULL for a school created by hand in the
-- admin card, which the card shows as "not on record" rather than guessing.
-- Added after the table itself, so an existing database picks them up here, and
-- the API tolerates a database that has not run this yet.
alter table public.schools add column if not exists license_tier text;
alter table public.schools add column if not exists seats integer;

create table if not exists public.school_admins (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- One admin email administers one school — keeps "which school is this?" a
-- single, unambiguous lookup. Emails are stored lowercased by the API.
create unique index if not exists school_admins_email_uniq on public.school_admins (email);

create index if not exists school_admins_school_idx on public.school_admins (school_id);

create table if not exists public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

create unique index if not exists school_members_uniq
  on public.school_members (school_id, email);

create index if not exists school_members_email_idx on public.school_members (email);

-- Which school owns a link. Existing rows (owner-created, platform-wide) keep
-- NULL — that is deliberate, and it is what keeps them out of reach of a
-- school admin's unlink.
alter table public.teacher_students
  add column if not exists school_id uuid references public.schools (id) on delete set null;

create index if not exists teacher_students_school_idx on public.teacher_students (school_id);

alter table public.schools enable row level security;

drop policy if exists "schools: no direct client access" on public.schools;
create policy "schools: no direct client access"
  on public.schools for all
  using (false)
  with check (false);

alter table public.school_admins enable row level security;

drop policy if exists "school_admins: no direct client access" on public.school_admins;
create policy "school_admins: no direct client access"
  on public.school_admins for all
  using (false)
  with check (false);

alter table public.school_members enable row level security;

drop policy if exists "school_members: no direct client access" on public.school_members;
create policy "school_members: no direct client access"
  on public.school_members for all
  using (false)
  with check (false);
