-- Alfred — Phase 1 schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------- clients ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'paused', 'past')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on clients(owner_id);

-- ---------- projects ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  start_date date,
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on projects(owner_id);
create index if not exists projects_client_id_idx on projects(client_id);

-- ---------- balance_entries ----------
-- One row per invoice issued or payment received. The client's running
-- balance is derived (see the view below) rather than stored, so it can
-- never drift out of sync with the ledger.
create table if not exists balance_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  type text not null check (type in ('invoice', 'payment')),
  amount numeric(12, 2) not null check (amount > 0),
  memo text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists balance_entries_owner_id_idx on balance_entries(owner_id);
create index if not exists balance_entries_client_id_idx on balance_entries(client_id);

-- ---------- derived balance per client ----------
create or replace view client_balances as
select
  client_id,
  coalesce(sum(case when type = 'invoice' then amount else 0 end), 0)
    - coalesce(sum(case when type = 'payment' then amount else 0 end), 0) as balance
from balance_entries
group by client_id;

-- ---------- row level security ----------
-- Single-user app: every row is scoped to owner_id = auth.uid(), so even
-- though there's only one of you, the data is never reachable without your
-- session.
alter table clients enable row level security;
alter table projects enable row level security;
alter table balance_entries enable row level security;

create policy "Owner can manage their clients" on clients
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owner can manage their projects" on projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owner can manage their balance entries" on balance_entries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
