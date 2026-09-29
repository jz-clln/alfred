-- supabase/migrations/0004_applications.sql
-- Alfred — Applications Phase 1: the table and the two columns that scope
-- to it. Nothing reads application_id yet (that starts in Phase 2), so this
-- migration is safe to run without changing any existing behavior.

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists applications_owner_id_idx on applications(owner_id);

alter table applications enable row level security;
create policy "Owner can manage their applications" on applications
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Nullable everywhere: freelance work, or anything you don't want to
-- bucket, just stays unassigned rather than being forced into one.
alter table clients add column if not exists application_id uuid references applications(id) on delete set null;
alter table leads add column if not exists application_id uuid references applications(id) on delete set null;

create index if not exists clients_application_id_idx on clients(application_id);
create index if not exists leads_application_id_idx on leads(application_id);

-- projects and everything downstream of leads/clients (sequences,
-- email_messages, meetings, balance_entries) intentionally get no column:
-- projects always have a non-null client_id, and the rest are reachable by
-- joining through lead_id/client_id — so nothing needs a duplicate value
-- that could ever drift out of sync.