-- supabase/migrations/0006_inbound_email.sql
-- Alfred: replies from leads and clients, read from Gmail.
-- Run in the Supabase SQL editor after 0005_client_currency.sql.

create table if not exists public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  gmail_message_id text not null,
  gmail_thread_id text,
  from_email text not null,
  from_name text,
  subject text,
  snippet text,
  body_text text,
  received_at timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, gmail_message_id)
);

create index if not exists inbound_emails_owner_received_idx on public.inbound_emails(owner_id, received_at desc);
create index if not exists inbound_emails_lead_idx on public.inbound_emails(lead_id);
create index if not exists inbound_emails_client_idx on public.inbound_emails(client_id);
create index if not exists inbound_emails_unread_idx on public.inbound_emails(owner_id) where read_at is null;

alter table public.inbound_emails enable row level security;
create policy "Owner can manage their inbound emails" on public.inbound_emails
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Where the last Gmail check stopped, so each sync only looks at new mail.
alter table public.google_tokens add column if not exists gmail_synced_at timestamptz;

-- Realtime: turn it on for THIS table only. Row level security still applies,
-- so you only ever receive your own rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inbound_emails'
  ) then
    alter publication supabase_realtime add table public.inbound_emails;
  end if;
end $$;
