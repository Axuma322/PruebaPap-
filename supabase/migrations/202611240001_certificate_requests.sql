-- DEFINITIVE INITIAL MIGRATION: run only this file, once, on the existing schema.
-- No changes to evaluations, their rules, results, progress, grants or policies.
begin;

create table public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  national_id text not null check (char_length(btrim(national_id)) between 1 and 40),
  email text not null check (char_length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  completion_date timestamptz not null,
  certificate_code text not null unique default ('PLANNE-' || upper(replace(gen_random_uuid()::text,'-',''))),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  certificate_pdf_base64 text,
  certificate_sent_at timestamptz,
  email_delivery_id text,
  email_first_attempt_at timestamptz,
  email_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Remember demo identities even if their profile name is changed later.
create table public.certificate_demo_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
insert into public.certificate_demo_accounts(user_id)
  select p.id from public.profiles p join auth.users u on u.id=p.id where lower(btrim(p.username))='demo';
alter table public.certificate_demo_accounts enable row level security;
revoke all on public.certificate_demo_accounts from public,anon,authenticated;
grant select,insert on public.certificate_demo_accounts to service_role;
create function public.track_planne_demo_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if lower(btrim(new.username))='demo' then
    insert into public.certificate_demo_accounts(user_id) values(new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.track_planne_demo_profile() from public,anon,authenticated;
create trigger planne_track_demo_profile after insert or update of username on public.profiles
  for each row execute function public.track_planne_demo_profile();

create function public.certificate_diagnostic_type(row_type text,answers jsonb)
returns text language sql immutable set search_path='' as $$
  select case
    when answers->>'attemptType' in ('initial','final') then answers->>'attemptType'
    when row_type in ('initial','final') then row_type
    else null end;
$$;
revoke all on function public.certificate_diagnostic_type(text,jsonb) from public,anon,authenticated;

-- Participation constancy: use the existing application's saved completion.
-- B's passed=true means all items completed; A/C/D keep their existing rules.
-- This is not independent verification of client-supplied evaluation results.
create function public.certificate_can_issue(p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=p_user_id and lower(btrim(p.username))<>'demo')
    and not exists(select 1 from public.certificate_demo_accounts d where d.user_id=p_user_id)
    and exists(select 1 from public.diagnostic_answers d where d.user_id=p_user_id
      and public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='initial')
    and exists(select 1 from public.diagnostic_answers d where d.user_id=p_user_id
      and public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='final')
    and (select count(distinct q.stage_key) from public.quiz_attempts q where q.user_id=p_user_id
      and q.stage_key in ('A','B','C','D') and q.passed is true)=4;
$$;
revoke all on function public.certificate_can_issue(uuid) from public,anon,authenticated;
grant execute on function public.certificate_can_issue(uuid) to service_role;

create function public.prepare_certificate_request()
returns trigger language plpgsql security definer set search_path='' as $$
declare initial_at timestamptz;final_at timestamptz;stages_at timestamptz;
begin
  if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Authenticated owner required' using errcode='42501'; end if;
  if not public.certificate_can_issue(new.user_id) then
    raise exception 'Complete initial/final DNA and stages A-D; demo cannot issue' using errcode='23514';
  end if;
  select p.username into new.username from public.profiles p where p.id=new.user_id;
  select min(d.created_at) filter(where public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='initial'),
    min(d.created_at) filter(where public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='final')
    into initial_at,final_at from public.diagnostic_answers d where d.user_id=new.user_id;
  select max(first_at) into stages_at from (
    select min(q.created_at) first_at from public.quiz_attempts q where q.user_id=new.user_id
      and q.passed is true and q.stage_key in ('A','B','C','D') group by q.stage_key
  ) stages;
  new.full_name:=btrim(new.full_name);new.national_id:=btrim(new.national_id);new.email:=btrim(new.email);
  new.completion_date:=greatest(initial_at,final_at,stages_at);
  return new;
end;
$$;
revoke all on function public.prepare_certificate_request() from public,anon,authenticated;
create trigger certificate_request_prepare before insert on public.certificate_requests
  for each row execute function public.prepare_certificate_request();

create function public.touch_certificate_request()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=clock_timestamp();return new;end;
$$;
revoke all on function public.touch_certificate_request() from public,anon,authenticated;
create trigger certificate_request_touch before update on public.certificate_requests
  for each row execute function public.touch_certificate_request();

alter table public.certificate_requests enable row level security;
revoke all on public.certificate_requests from public,anon,authenticated;
grant select(id,user_id,username,full_name,national_id,email,completion_date,certificate_code,status,certificate_sent_at,created_at,updated_at)
  on public.certificate_requests to authenticated;
grant insert(user_id,full_name,national_id,email) on public.certificate_requests to authenticated;
grant all on public.certificate_requests to service_role;
create policy certificate_requests_select_own on public.certificate_requests
  for select to authenticated using((select auth.uid())=user_id);
create policy certificate_requests_owner_boundary on public.certificate_requests
  as restrictive for select to authenticated using((select auth.uid())=user_id);
create policy certificate_requests_insert_own on public.certificate_requests
  for insert to authenticated with check((select auth.uid())=user_id);
commit;
