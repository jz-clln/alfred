begin;

alter table public.leads add column temperature_override text
  check (temperature_override in ('hot', 'warm', 'cold'));

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  lead_id uuid references public.leads(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  kind text not null check (kind in ('proposal', 'quote')),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null check (length(trim(description)) between 1 and 20000),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency in ('PHP', 'USD')),
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'accepted', 'declined')),
  project_id uuid unique references public.projects(id) on delete set null,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(lead_id, client_id) = 1)
);
create index proposals_owner_created_idx on public.proposals(owner_id, created_at desc);
create index proposals_application_idx on public.proposals(application_id);
alter table public.proposals enable row level security;
create policy "Owner manages proposals" on public.proposals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Acceptance and project creation are one transaction. Locking the proposal
-- makes retries return the same project instead of creating duplicates.
create function public.accept_proposal(proposal_id uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  proposal public.proposals%rowtype;
  recipient_lead public.leads%rowtype;
  recipient_client public.clients%rowtype;
  new_project_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into proposal from public.proposals
    where id = proposal_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Proposal unavailable.'; end if;
  if proposal.status = 'accepted' then
    if proposal.project_id is null then raise exception 'The accepted project was removed.'; end if;
    return proposal.project_id;
  end if;
  if proposal.status <> 'sent' then raise exception 'Only a sent proposal can be accepted.'; end if;
  if proposal.valid_until < (now() at time zone 'Asia/Manila')::date then
    raise exception 'This proposal has expired. Create a new draft.';
  end if;

  if proposal.lead_id is not null then
    select * into recipient_lead from public.leads
      where id = proposal.lead_id and owner_id = auth.uid() for update;
    if not found or recipient_lead.application_id is distinct from proposal.application_id then
      raise exception 'Recipient application changed. Create a new draft.';
    end if;
    if recipient_lead.client_id is null then
      insert into public.clients(owner_id, application_id, name, email, notes, currency)
        values (auth.uid(), proposal.application_id, recipient_lead.name, recipient_lead.email,
          recipient_lead.company, proposal.currency) returning * into recipient_client;
      update public.leads set client_id = recipient_client.id where id = recipient_lead.id;
    else
      select * into recipient_client from public.clients
        where id = recipient_lead.client_id and owner_id = auth.uid() for update;
      if not found then raise exception 'Client unavailable.'; end if;
    end if;
    update public.leads set stage = 'won' where id = recipient_lead.id;
    update public.sequence_enrollments set status = 'stopped'
      where lead_id = recipient_lead.id and owner_id = auth.uid() and status = 'active';
  else
    select * into recipient_client from public.clients
      where id = proposal.client_id and owner_id = auth.uid() for update;
    if not found then raise exception 'Client unavailable.'; end if;
  end if;
  if recipient_client.application_id is distinct from proposal.application_id then
    raise exception 'Recipient application changed. Create a new draft.';
  end if;

  insert into public.projects(owner_id, client_id, name, status, notes)
    values (auth.uid(), recipient_client.id, proposal.title, 'active',
      proposal.description || E'\n\nAccepted ' || proposal.kind || ': ' || proposal.amount::text || ' ' || proposal.currency ||
      E'\nReference: ' || proposal.id::text)
    returning id into new_project_id;
  update public.proposals set status = 'accepted', accepted_at = now(), project_id = new_project_id where id = proposal.id;
  return new_project_id;
end;
$$;
revoke all on function public.accept_proposal(uuid) from public, anon;
grant execute on function public.accept_proposal(uuid) to authenticated;
commit;
