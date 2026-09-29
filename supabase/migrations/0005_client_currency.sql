-- Existing balances were entered in USD. Never relabel or convert those values.
begin;
alter table public.clients add column currency text not null default 'USD'
  check (currency in ('PHP', 'USD'));
-- New clients, including converted leads, start in PHP unless explicitly chosen.
alter table public.clients alter column currency set default 'PHP';

alter table public.balance_entries add column currency text;
update public.balance_entries e set currency = c.currency from public.clients c where c.id = e.client_id;
alter table public.balance_entries alter column currency set not null;
alter table public.balance_entries add constraint balance_entries_currency_check check (currency in ('PHP', 'USD'));

-- A client has one ledger currency. Prevent historical amounts from being relabeled.
create function public.guard_client_currency() returns trigger language plpgsql
set search_path = public as $$
begin
  if new.currency is distinct from old.currency and exists (
    select 1 from public.balance_entries where client_id = old.id
  ) then
    raise exception 'Currency cannot change after ledger entries exist.';
  end if;
  return new;
end;
$$;
create trigger guard_client_currency before update of currency on public.clients
for each row execute function public.guard_client_currency();

-- Lock the client row so changing currency and adding an entry cannot race.
create function public.guard_entry_currency() returns trigger language plpgsql
set search_path = public as $$
declare client_currency text;
begin
  select currency into client_currency from public.clients where id = new.client_id for update;
  if client_currency is null then raise exception 'Client unavailable.'; end if;
  if new.currency is null then new.currency := client_currency; end if;
  if new.currency <> client_currency then
    raise exception 'Entry currency does not match the client. Reload and try again.';
  end if;
  return new;
end;
$$;
create trigger guard_entry_currency before insert or update on public.balance_entries
for each row execute function public.guard_entry_currency();
commit;
