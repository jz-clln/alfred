-- supabase/migrations/0002_meetings_and_google.sql
-- Alfred — Phase 2 schema: Google Calendar connection + meetings
-- Run this in the Supabase SQL editor after 0001_init.sql.

-- ---------- google_tokens ----------
-- Single-user app, so this only ever holds one row. Access/refresh tokens
-- for the Calendar API, separate from Supabase Auth's own session.
create table if not exists google_tokens (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table google_tokens enable row level security;

create policy "Owner can manage their google tokens" on google_tokens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- meetings ----------
-- Mirrors events created on your Google Calendar so they can be linked to
-- a client and listed in the app. client_id is nullable because a public
-- booking may come from someone who isn't a client yet.
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  google_event_id text,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  booked_by_client boolean not null default false,
  booker_name text,
  booker_email text,
  created_at timestamptz not null default now()
);

create index if not exists meetings_owner_id_idx on meetings(owner_id);
create index if not exists meetings_client_id_idx on meetings(client_id);

alter table meetings enable row level security;

create policy "Owner can manage their meetings" on meetings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Note: the public /book page writes to google_tokens and meetings using
-- the Supabase service role key (server-only), which bypasses RLS by
-- design — that's how an unauthenticated visitor can book a slot without
-- a public policy existing on either table.