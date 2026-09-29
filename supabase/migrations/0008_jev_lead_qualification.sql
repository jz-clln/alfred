-- Persist model output separately from the owner's manual override.
alter table public.leads add column if not exists jev_assessment jsonb;
alter table public.leads add column if not exists jev_input_hash text;
comment on column public.leads.jev_assessment is 'JEV temperature, confidence, intent probabilities, model and evaluation time. Existing owner RLS applies.';
