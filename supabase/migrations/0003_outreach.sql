-- supabase/migrations/0003_outreach.sql
-- Alfred — Phase 3: leads, outbound email, follow-up sequences, reminders.
-- Run after 0002_meetings_and_google.sql.

-- ---------- reminder bookkeeping on existing tables ----------
alter table meetings add column if not exists reminder_sent_at timestamptz;
alter table clients add column if not exists last_balance_reminder_at timestamptz;

-- ---------- leads ----------
-- Temperature (cold / warm / hot) is NOT stored. It is computed from the lead
-- and its email history (see lib/leads/score.ts), the same way client balance
-- is derived from the ledger, so it can never drift out of date.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  source text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'replied', 'meeting', 'won', 'lost')),
  email_status text not null default 'unchecked'
    check (email_status in ('unchecked', 'valid', 'invalid', 'risky')),
  notes text,
  last_contacted_at timestamptz,
  last_replied_at timestamptz,
  client_id uuid references clients(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists leads_owner_id_idx on leads(owner_id);

-- ---------- follow-up sequences ----------
create table if not exists sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sequence_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence_id uuid not null references sequences(id) on delete cascade,
  step_no int not null,
  delay_days int not null check (delay_days >= 0),
  subject text not null,
  body text not null,
  unique (sequence_id, step_no)
);

create table if not exists sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence_id uuid not null references sequences(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  next_step_no int not null default 1,
  next_send_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'stopped')),
  created_at timestamptz not null default now(),
  unique (sequence_id, lead_id)
);
create index if not exists enrollments_due_idx
  on sequence_enrollments(status, next_send_at);

-- ---------- email log ----------
create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text not null,
  kind text not null default 'manual'
    check (kind in ('manual', 'follow_up', 'reminder')),
  status text not null default 'sent'
    check (status in ('sent', 'delivered', 'bounced', 'failed')),
  provider_id text,
  error text,
  sequence_id uuid references sequences(id) on delete set null,
  step_no int,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  clicked_at timestamptz
);
create index if not exists email_messages_owner_idx on email_messages(owner_id, sent_at desc);
create index if not exists email_messages_lead_idx on email_messages(lead_id);
create index if not exists email_messages_provider_idx on email_messages(provider_id);

-- ---------- row level security ----------
alter table leads enable row level security;
alter table sequences enable row level security;
alter table sequence_steps enable row level security;
alter table sequence_enrollments enable row level security;
alter table email_messages enable row level security;

create policy "Owner can manage their leads" on leads
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner can manage their sequences" on sequences
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner can manage their sequence steps" on sequence_steps
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner can manage their enrollments" on sequence_enrollments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner can manage their email log" on email_messages
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Note: the cron job and the email webhook use the service role key
-- (lib/supabase/admin.ts), which bypasses RLS, the same way /book does.
