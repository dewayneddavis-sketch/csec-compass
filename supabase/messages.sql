-- ===========================================================================
-- private_messages — the teacher↔student chat's one table
-- (teacher↔student chat PR 1: data layer + API; the UI ships in the next PR)
--
-- APPLY THIS FILE to the live Supabase project before the chat UI goes out.
-- Nothing else in the repo can create it, and api/messages.js fails closed
-- (403/500, never a partial answer) while it is missing.
--
-- ONE row per message. A "conversation" is every row sharing a thread_key:
-- the two participants' lowercased emails, sorted and joined with "|"
-- (e.g. "ms.brown@school.edu|sam@home.jm"), so both directions land on the
-- same key and no thread row is needed to keep them together.
--
-- WHO MAY WRITE WHAT
--   * api/messages.js is the ONLY writer and the ONLY reader (service role).
--   * The sender is the verified auth token, never the request body:
--     sender_id references auth.users and sender_email is the token's email.
--   * A message may only travel along a link that already exists in
--     teacher_students (teacher_email ↔ student_email — the same linkage the
--     teacher progress dashboard uses). Two people at the same school who are
--     NOT linked cannot message each other; the route answers 403 with zero
--     message data, and this table is not even queried in that case.
--   * sender_role/recipient_role record which side of the link each party was
--     on when the message was sent ('teacher' | 'student').
--
-- IDEMPOTENCY
--   client_id is the sending device's own key (UUID-ish) for one send attempt.
--   The partial unique index below makes a retried send return the ORIGINAL row
--   instead of posting the message twice (ON CONFLICT DO NOTHING semantics come
--   from the route's insert-then-re-select, and the index is what makes the
--   race impossible). NULL client_ids are allowed and are not deduplicated.
-- ===========================================================================
create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_email text not null,
  sender_role text not null check (sender_role in ('teacher', 'student')),
  recipient_email text not null,
  recipient_role text not null check (recipient_role in ('teacher', 'student')),
  body text not null,
  client_id text,
  created_at timestamptz not null default now()
);

-- One conversation, newest first — the exact read the route performs.
create index if not exists private_messages_thread_idx
  on public.private_messages (thread_key, created_at desc);

-- A retried send can only ever store one row.
create unique index if not exists private_messages_sender_client_uniq
  on public.private_messages (sender_id, client_id)
  where client_id is not null;

-- ===========================================================================
-- Row Level Security: clients must NOT read or write private_messages
-- directly. There is no policy that grants anything — every read and write goes
-- through api/messages.js with the service-role key, after the server has
-- checked the caller's token AND the teacher_students link. This is the same
-- deny-all shape as teacher_students / parent_students / purchases.
-- ===========================================================================
alter table public.private_messages enable row level security;

drop policy if exists "private_messages: no direct client access" on public.private_messages;
create policy "private_messages: no direct client access"
  on public.private_messages for all
  using (false)
  with check (false);
