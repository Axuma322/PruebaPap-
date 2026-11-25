-- Additive migration. Review and run once against the existing PLANNE schema.
-- No existing progress, answers or quiz attempts are modified.
begin;

create table public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  national_id text not null check (char_length(btrim(national_id)) between 1 and 40),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  completion_date timestamptz not null,
  certificate_code text not null unique default ('PLANNE-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  completion_snapshot jsonb not null default '{}'::jsonb,
  certificate_sent_at timestamptz,
  email_delivery_id text,
  email_first_attempt_at timestamptz,
  email_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.prepare_certificate_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  participant text;
  initial_at timestamptz;
  final_at timestamptz;
  stages_done integer;
  stages_at timestamptz;
  stages_snapshot jsonb;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Authenticated owner required' using errcode = '42501';
  end if;
  select p.username into participant from public.profiles p where p.id = new.user_id;
  if participant is null or lower(btrim(participant)) = 'demo' then
    raise exception 'Demo or missing profile cannot request certificates' using errcode = '42501';
  end if;

  -- Match normalizeDiagnosticAttempt: older rows without a type are interpreted
  -- in chronological order (first = initial, subsequent = final).
  with attempts as (
    select d.created_at,
      coalesce(d.attempt_type, d.answers->>'attemptType',
        case when row_number() over (order by d.created_at, d.id) = 1 then 'initial' else 'final' end
      ) as attempt_type
    from public.diagnostic_answers d where d.user_id = new.user_id
  )
  select min(d.created_at) filter (where d.attempt_type = 'initial'),
         min(d.created_at) filter (where d.attempt_type = 'final')
    into initial_at, final_at
    from attempts d;

  select count(*), max(first_completed_at),
         jsonb_object_agg(stage_key, jsonb_build_object('completed_at', first_completed_at))
    into stages_done, stages_at, stages_snapshot
    from (
      select q.stage_key, min(q.created_at) as first_completed_at
      from public.quiz_attempts q
      where q.user_id = new.user_id and q.passed is true and q.stage_key in ('A', 'B', 'C', 'D')
      group by q.stage_key
    ) completed;

  if initial_at is null or final_at is null or stages_done <> 4 then
    raise exception 'Complete initial/final DNA and stages A-D before requesting a certificate' using errcode = '23514';
  end if;

  new.username := participant;
  new.full_name := btrim(new.full_name);
  new.national_id := btrim(new.national_id);
  new.email := btrim(new.email);
  new.completion_date := greatest(initial_at, final_at, stages_at);
  new.completion_snapshot := jsonb_build_object(
    'policy', 'initial-final-dna-and-stages-v1',
    'diagnostic_initial_at', initial_at, 'diagnostic_final_at', final_at,
    'stages', stages_snapshot,
    'stage_b_passed_meaning', 'completion for B-autoevaluacion-v1; legacy approval preserved'
  );
  return new;
end;
$$;

revoke all on function public.prepare_certificate_request() from public;
create trigger certificate_request_prepare before insert on public.certificate_requests
  for each row execute function public.prepare_certificate_request();

create function public.touch_certificate_request()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_certificate_request() from public;
create trigger certificate_request_touch before update on public.certificate_requests
  for each row execute function public.touch_certificate_request();

alter table public.certificate_requests enable row level security;
revoke all on public.certificate_requests from anon, authenticated;
grant select on public.certificate_requests to authenticated;
-- The client cannot choose status, dates, code, username or delivery metadata.
grant insert (user_id, full_name, national_id, email) on public.certificate_requests to authenticated;
grant all on public.certificate_requests to service_role;
create policy certificate_requests_select_own on public.certificate_requests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy certificate_requests_insert_own on public.certificate_requests
  for insert to authenticated with check ((select auth.uid()) = user_id);

commit;
