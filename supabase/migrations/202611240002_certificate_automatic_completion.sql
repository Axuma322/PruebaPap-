-- Definitive, unapplied migration. Run once AFTER 001. No human approvals.
-- Existing research rows are retained. Future participant writes are validated.
begin;

create table public.certificate_demo_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
insert into public.certificate_demo_accounts (user_id)
  select p.id from public.profiles p join auth.users u on u.id=p.id where lower(btrim(p.username))='demo';
alter table public.certificate_demo_accounts enable row level security;
revoke all on public.certificate_demo_accounts from public, anon, authenticated;
grant select, insert on public.certificate_demo_accounts to service_role;

-- New demo identities are recorded automatically, including later renames.
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

create table public.certificate_instruments (
  instrument_key text primary key,
  definition jsonb not null,
  installed_at timestamptz not null default clock_timestamp()
);
alter table public.certificate_instruments enable row level security;
revoke all on public.certificate_instruments from public, anon, authenticated;
grant select on public.certificate_instruments to service_role;

-- BEGIN GENERATED CATALOG
insert into public.certificate_instruments (instrument_key, definition) values
('DNA', $catalog${"kind":"diagnostic","maximum":150,"items":{"1":{"options":{"a":5,"b":3,"c":1,"d":0}},"2":{"options":{"a":1,"b":5,"c":3,"d":0}},"3":{"options":{"a":0,"b":3,"c":5,"d":1}},"4":{"options":{"a":1,"b":5,"c":3,"d":0}},"5":{"options":{"a":1,"b":0,"c":5,"d":3}},"6":{"options":{"a":1,"b":5,"c":3,"d":0}},"7":{"options":{"a":0,"b":5,"c":3,"d":1}},"8":{"options":{"a":1,"b":3,"c":5,"d":0}},"9":{"options":{"a":0,"b":5,"c":3,"d":1}},"10":{"options":{"a":1,"b":5,"c":3,"d":0}},"11":{"options":{"a":0,"b":5,"c":3,"d":1}},"12":{"options":{"a":1,"b":0,"c":5,"d":3}},"13":{"options":{"a":1,"b":5,"c":3,"d":0}},"14":{"options":{"a":1,"b":5,"c":3,"d":0}},"15":{"options":{"a":1,"b":5,"c":0,"d":3}},"16":{"options":{"a":0,"b":5,"c":1,"d":3}},"17":{"options":{"a":1,"b":5,"c":3,"d":0}},"18":{"options":{"a":0,"b":5,"c":1,"d":3}},"19":{"options":{"a":1,"b":0,"c":5,"d":3}},"20":{"options":{"a":5,"b":0,"c":3,"d":1}},"21":{"options":{"a":1,"b":5,"c":3,"d":0}},"22":{"options":{"a":1,"b":5,"c":3,"d":0}},"23":{"options":{"a":0,"b":5,"c":1,"d":3}},"24":{"options":{"a":0,"b":5,"c":3,"d":1}},"25":{"options":{"a":1,"b":5,"c":3,"d":0}},"26":{"options":{"a":0,"b":5,"c":3,"d":1}},"27":{"options":{"a":1,"b":5,"c":3,"d":0}},"28":{"options":{"a":0,"b":5,"c":1,"d":3}},"29":{"options":{"a":1,"b":5,"c":0,"d":3}},"30":{"options":{"a":1,"b":5,"c":3,"d":0}}}}$catalog$::jsonb),
('A', $catalog${"kind":"choice","maximum":20,"items":{"A1":{"options":{"a":1,"b":0,"c":0,"d":0}},"A2":{"options":{"a":0,"b":1,"c":0,"d":0}},"A3":{"options":{"a":0,"b":0,"c":1,"d":0}},"A4":{"options":{"a":0,"b":0,"c":1,"d":0}},"A5":{"options":{"a":0,"b":0,"c":0,"d":1}},"A6":{"options":{"a":0,"b":1,"c":0,"d":0}},"A7":{"options":{"a":0,"b":1,"c":0,"d":0}},"A8":{"options":{"a":0,"b":0,"c":1,"d":0}},"A9":{"options":{"a":0,"b":1,"c":0,"d":0}},"A10":{"options":{"a":0,"b":0,"c":1,"d":0}},"A11":{"options":{"a":0,"b":1,"c":0,"d":0}},"A12":{"options":{"a":1,"b":0,"c":0,"d":0}},"A13":{"options":{"a":0,"b":1,"c":0,"d":0}},"A14":{"options":{"a":1,"b":0,"c":0,"d":0}},"A15":{"options":{"a":0,"b":1,"c":0,"d":0}},"A16":{"options":{"a":0,"b":0,"c":1,"d":0}},"A17":{"options":{"a":0,"b":1,"c":0,"d":0}},"A18":{"options":{"a":0,"b":1,"c":0,"d":0}},"A19":{"options":{"a":0,"b":1,"c":0,"d":0}},"A20":{"options":{"a":0,"b":1,"c":0,"d":0}}}}$catalog$::jsonb),
('B', $catalog${"kind":"likert","maximum":80,"completionOnly":true,"items":{"B-A0":{"block":"A"},"B-A1":{"block":"A"},"B-A2":{"block":"A"},"B-A3":{"block":"A"},"B-A4":{"block":"A"},"B-B0":{"block":"B"},"B-B1":{"block":"B"},"B-B2":{"block":"B"},"B-B3":{"block":"B"},"B-B4":{"block":"B"},"B-C0":{"block":"C"},"B-C1":{"block":"C"},"B-C2":{"block":"C"},"B-C3":{"block":"C"},"B-C4":{"block":"C"},"B-D0":{"block":"D"},"B-D1":{"block":"D"},"B-D2":{"block":"D"},"B-D3":{"block":"D"},"B-D4":{"block":"D"}}}$catalog$::jsonb),
('C', $catalog${"kind":"choice","maximum":10,"items":{"C1":{"options":{"a":1,"b":0,"c":0,"d":0}},"C2":{"options":{"a":0,"b":1,"c":0,"d":0}},"C3":{"options":{"a":1,"b":0,"c":0,"d":0}},"C4":{"options":{"a":0,"b":1,"c":0,"d":0}},"C5":{"options":{"a":1,"b":0,"c":0,"d":0}},"C6":{"options":{"a":0,"b":0,"c":1,"d":0}},"C7":{"options":{"a":0,"b":1,"c":0,"d":0}},"C8":{"options":{"a":1,"b":0,"c":0,"d":0}},"C9":{"options":{"a":0,"b":1,"c":0,"d":0}},"C10":{"options":{"a":0,"b":1,"c":0,"d":0}}}}$catalog$::jsonb),
('D', $catalog${"kind":"likert","maximum":80,"completionOnly":false,"items":{"D1":{"block":"comunidad"},"D2":{"block":"comunidad"},"D3":{"block":"comunidad"},"D4":{"block":"comunidad"},"D5":{"block":"comunidad"},"D6":{"block":"evidencia"},"D7":{"block":"evidencia"},"D8":{"block":"evidencia"},"D9":{"block":"evidencia"},"D10":{"block":"evidencia"},"D11":{"block":"mejora"},"D12":{"block":"mejora"},"D13":{"block":"mejora"},"D14":{"block":"mejora"},"D15":{"block":"mejora"},"D16":{"block":"aplicacion"},"D17":{"block":"aplicacion"},"D18":{"block":"aplicacion"},"D19":{"block":"aplicacion"},"D20":{"block":"aplicacion"}}}$catalog$::jsonb),
('B-legacy', $catalog${"kind":"choice","maximum":10,"items":{"B1":{"options":{"a":0,"b":1,"c":0,"d":0}},"B2":{"options":{"a":0,"b":1,"c":0,"d":0}},"B3":{"options":{"a":0,"b":1,"c":0,"d":0}},"B4":{"options":{"a":0,"b":1,"c":0,"d":0}},"B5":{"options":{"a":1,"b":0,"c":0,"d":0}},"B6":{"options":{"a":0,"b":1,"c":0,"d":0}},"B7":{"options":{"a":0,"b":1,"c":0,"d":0}},"B8":{"options":{"a":1,"b":0,"c":0,"d":0}},"B9":{"options":{"a":0,"b":0,"c":1,"d":0}},"B10":{"options":{"a":0,"b":1,"c":0,"d":0}}}}$catalog$::jsonb);
-- END GENERATED CATALOG

create function public.certificate_answer_score(p_key text, p_answers jsonb, p_recorded_at timestamptz)
returns numeric language plpgsql stable security definer set search_path='' as $$
declare
  key text := p_key;
  spec jsonb;
  cutoff timestamptz;
  item jsonb;
  expected jsonb;
  item_id text;
  selected text;
  total numeric := 0;
  seen text[] := array[]::text[];
  expected_count integer;
begin
  if p_key='B' and p_answers->>'evaluationType' is distinct from 'likert' then key:='B-legacy'; end if;
  select definition, installed_at into spec, cutoff from public.certificate_instruments where instrument_key=key;
  if spec is null or jsonb_typeof(p_answers->'items') is distinct from 'array' then return null; end if;
  if key='B-legacy' and (p_recorded_at is null or p_recorded_at >= cutoff) then return null; end if;
  if key='B' and p_answers->>'instrumentVersion' is distinct from 'B-autoevaluacion-v1' then return null; end if;
  select count(*) into expected_count from jsonb_object_keys(spec->'items');
  if jsonb_array_length(p_answers->'items')<>expected_count then return null; end if;
  for item in select value from jsonb_array_elements(p_answers->'items') loop
    item_id:=case when spec->>'kind'='choice' then item->>'questionId' else item->>'itemId' end;
    if item_id is null or item_id=any(seen) then return null; end if;
    seen:=array_append(seen,item_id);
    expected:=spec->'items'->item_id;
    if expected is null then return null; end if;
    if spec->>'kind'='likert' then
      if item->>'blockId' is distinct from expected->>'block'
        or jsonb_typeof(item->'selectedValue') is distinct from 'number'
        or item->>'selectedValue' not in ('1','2','3','4') then return null; end if;
      total:=total+(item->>'selectedValue')::numeric;
    else
      selected:=item->>'selectedOptionId';
      if selected is null or not (expected->'options' ? selected) then return null; end if;
      total:=total+(expected->'options'->>selected)::numeric;
    end if;
  end loop;
  if p_key='DNA' then return total; end if;
  return round(total*100/(spec->>'maximum')::numeric);
end;
$$;

create function public.certificate_stage_completed(p_stage text,p_answers jsonb,p_recorded_at timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.certificate_answer_score(p_stage,p_answers,p_recorded_at) >=
    case when p_stage='B' and p_answers->>'evaluationType'='likert' then 0 else 70 end, false);
$$;

create function public.certificate_can_issue(p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=p_user_id and lower(btrim(p.username))<>'demo')
    and not exists(select 1 from public.certificate_demo_accounts d where d.user_id=p_user_id)
    and exists(select 1 from public.diagnostic_answers d where d.user_id=p_user_id
      and public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='initial'
      and public.certificate_answer_score('DNA',d.answers::jsonb,d.created_at) is not null)
    and exists(select 1 from public.diagnostic_answers d where d.user_id=p_user_id
      and public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='final'
      and public.certificate_answer_score('DNA',d.answers::jsonb,d.created_at) is not null)
    and (select count(distinct q.stage_key) from public.quiz_attempts q where q.user_id=p_user_id
      and q.stage_key in ('A','B','C','D') and q.passed is true
      and public.certificate_stage_completed(q.stage_key,q.answers::jsonb,q.created_at))=4;
$$;

-- Preserve direct browser writes used by the existing app, but derive the grade
-- and completion in PostgreSQL. Client-supplied score/correct/passed are ignored.
create function public.validate_planne_quiz_submission()
returns trigger language plpgsql security definer set search_path='' as $$
declare calculated numeric;
begin
  if auth.uid() is null then return new; end if;
  if new.stage_key not in ('A','B','C','D') then raise exception 'Unknown stage' using errcode='23514'; end if;
  if new.user_id<>auth.uid() or (tg_op='UPDATE' and old.user_id<>auth.uid()) then
    raise exception 'Owner required' using errcode='42501';
  end if;
  if tg_op='INSERT' then new.created_at:=clock_timestamp(); else new.created_at:=old.created_at; end if;
  calculated:=public.certificate_answer_score(new.stage_key,new.answers::jsonb,new.created_at);
  if calculated is null then raise exception 'Incomplete or unsupported stage responses' using errcode='23514'; end if;
  new.score:=calculated;
  new.passed:=public.certificate_stage_completed(new.stage_key,new.answers::jsonb,new.created_at);
  new.answers:=new.answers::jsonb || jsonb_build_object('score',calculated,'percentage',calculated,'passed',new.passed);
  return new;
end;
$$;
create trigger planne_validate_quiz before insert or update on public.quiz_attempts
  for each row execute function public.validate_planne_quiz_submission();

create function public.validate_planne_diagnostic_submission()
returns trigger language plpgsql security definer set search_path='' as $$
declare calculated numeric; kind text;
begin
  if auth.uid() is null then return new; end if;
  if new.user_id<>auth.uid() or (tg_op='UPDATE' and old.user_id<>auth.uid()) then
    raise exception 'Owner required' using errcode='42501';
  end if;
  if tg_op='INSERT' then new.created_at:=clock_timestamp(); else new.created_at:=old.created_at; end if;
  kind:=public.certificate_diagnostic_type(new.attempt_type,new.answers::jsonb);
  calculated:=public.certificate_answer_score('DNA',new.answers::jsonb,new.created_at);
  if kind is null or calculated is null then raise exception 'Incomplete diagnostic responses or missing type' using errcode='23514'; end if;
  new.attempt_type:=kind;
  new.score:=calculated;
  new.answers:=new.answers::jsonb || jsonb_build_object('attemptType',kind,'totalScore',calculated,'maxScore',150,'percentage',round(calculated*100/150));
  return new;
end;
$$;
create trigger planne_validate_diagnostic before insert or update on public.diagnostic_answers
  for each row execute function public.validate_planne_diagnostic_submission();

-- Add owner boundaries; do not remove existing policies or their grants.
-- Preconditions prevent a silent install on tables whose RLS is disabled.
do $$
declare t text;
begin
  foreach t in array array['quiz_attempts','diagnostic_answers','progress'] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity) then
      raise exception 'RLS must already be enabled on public.%: inspect audit/rls_read_only.sql first',t;
    end if;
    execute format('create policy planne_owner_boundary on public.%I as restrictive for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
  end loop;
end;
$$;

create or replace function public.prepare_certificate_request()
returns trigger language plpgsql security definer set search_path='' as $$
declare participant text; initial_at timestamptz; final_at timestamptz; stages_at timestamptz;
begin
  if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Owner required' using errcode='42501'; end if;
  if not public.certificate_can_issue(new.user_id) then
    raise exception 'Complete initial/final DNA and stages A-D with valid responses; demo cannot issue' using errcode='23514';
  end if;
  select p.username into participant from public.profiles p where p.id=new.user_id;
  select min(d.created_at) filter(where public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='initial'),
    min(d.created_at) filter(where public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='final')
    into initial_at,final_at from public.diagnostic_answers d where d.user_id=new.user_id
      and public.certificate_answer_score('DNA',d.answers::jsonb,d.created_at) is not null;
  select max(first_at) into stages_at from (
    select min(q.created_at) first_at from public.quiz_attempts q where q.user_id=new.user_id
      and q.passed is true and q.stage_key in ('A','B','C','D')
      and public.certificate_stage_completed(q.stage_key,q.answers::jsonb,q.created_at) group by q.stage_key
  ) stages;
  new.username:=participant;
  new.full_name:=btrim(new.full_name);new.national_id:=btrim(new.national_id);new.email:=btrim(new.email);
  new.completion_date:=greatest(initial_at,final_at,stages_at);
  new.completion_snapshot:=jsonb_build_object('policy','automatic-response-validation-v1',
    'diagnostic_initial_at',initial_at,'diagnostic_final_at',final_at,'stages',jsonb_build_array('A','B','C','D'),
    'stage_b_passed_meaning','all 20 Likert items completed; legacy B threshold preserved');
  return new;
end;
$$;

revoke all on function public.certificate_answer_score(text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.certificate_stage_completed(text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.certificate_can_issue(uuid) from public,anon,authenticated;
grant execute on function public.certificate_can_issue(uuid) to service_role;
revoke all on function public.validate_planne_quiz_submission() from public,anon,authenticated;
revoke all on function public.validate_planne_diagnostic_submission() from public,anon,authenticated;
revoke all on function public.prepare_certificate_request() from public,anon,authenticated;

create policy certificate_requests_owner_boundary on public.certificate_requests
  as restrictive for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.certificate_requests from public,anon,authenticated;
grant select(id,user_id,username,full_name,national_id,email,completion_date,certificate_code,status,certificate_sent_at,created_at,updated_at)
  on public.certificate_requests to authenticated;
grant insert(user_id,full_name,national_id,email) on public.certificate_requests to authenticated;
commit;
