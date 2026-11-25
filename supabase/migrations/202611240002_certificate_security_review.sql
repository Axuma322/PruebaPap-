-- LOCAL PROPOSAL ONLY. Apply after 001, after reviewing the production ACL audit.
-- Keeps every evaluation and diagnostic row. Does not change their write paths.
begin;

create or replace function public.certificate_diagnostic_type(row_type text, answers jsonb)
returns text language sql immutable set search_path = '' as $$
  select case
    when answers->>'attemptType' in ('initial', 'final') then answers->>'attemptType'
    when row_type in ('initial', 'final') then row_type
    else null
  end;
$$;

-- Preserve known demo identities even if a participant can rename their profile.
create table public.certificate_demo_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
insert into public.certificate_demo_accounts (user_id)
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where lower(btrim(p.username)) = 'demo';
alter table public.certificate_demo_accounts enable row level security;
revoke all on public.certificate_demo_accounts from public, anon, authenticated;
grant select, insert on public.certificate_demo_accounts to service_role;

create table public.certificate_completion_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  approved boolean not null,
  evidence_hash text not null,
  reviewer text not null check (char_length(btrim(reviewer)) between 1 and 160),
  review_notes text not null check (char_length(btrim(review_notes)) between 1 and 4000),
  reviewed_at timestamptz not null default clock_timestamp()
);
create index certificate_completion_reviews_latest on public.certificate_completion_reviews (user_id, reviewed_at desc, id desc);
alter table public.certificate_completion_reviews enable row level security;
revoke all on public.certificate_completion_reviews from public, anon, authenticated;
grant select, insert on public.certificate_completion_reviews to service_role;
-- No browser policies. Reviews are append-only for the backend, including revocations.

create function public.certificate_completion_evidence(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'policy', 'institutional-review-v1',
    'user_id', p_user_id,
    'username', (select p.username from public.profiles p where p.id = p_user_id),
    'diagnostics', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at, d.id)
      from public.diagnostic_answers d where d.user_id = p_user_id), '[]'::jsonb),
    'quizzes', coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at, q.id)
      from public.quiz_attempts q where q.user_id = p_user_id), '[]'::jsonb)
  );
$$;

create function public.certificate_has_required_records(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = p_user_id and lower(btrim(p.username)) <> 'demo')
    and not exists (select 1 from public.certificate_demo_accounts d where d.user_id = p_user_id)
    and exists (select 1 from public.diagnostic_answers d where d.user_id = p_user_id
      and public.certificate_diagnostic_type(d.attempt_type, d.answers::jsonb) = 'initial')
    and exists (select 1 from public.diagnostic_answers d where d.user_id = p_user_id
      and public.certificate_diagnostic_type(d.attempt_type, d.answers::jsonb) = 'final')
    and (select count(distinct q.stage_key) from public.quiz_attempts q
      where q.user_id = p_user_id and q.passed is true and q.stage_key in ('A', 'B', 'C', 'D')) = 4;
$$;

-- This trusted function must only be called AFTER independently verifying the
-- participant's completion, never automatically from client-supplied passed flags.
create function public.review_certificate_completion(p_user_id uuid, p_approved boolean, p_reviewer text, p_notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare review_id uuid;
begin
  if p_approved is null or nullif(btrim(p_reviewer), '') is null or nullif(btrim(p_notes), '') is null then
    raise exception 'Reviewer and independent verification notes required' using errcode = '23514';
  end if;
  if p_approved and not public.certificate_has_required_records(p_user_id) then
    raise exception 'Required records missing or demo account' using errcode = '23514';
  end if;
  -- Bind the review to the exact saved evidence. Any later modification, addition
  -- or deletion invalidates the approval without editing any research data.
  insert into public.certificate_completion_reviews (user_id, approved, evidence_hash, reviewer, review_notes)
    values (p_user_id, p_approved,
      encode(sha256(convert_to(public.certificate_completion_evidence(p_user_id)::text, 'UTF8')), 'hex'),
      btrim(p_reviewer), btrim(p_notes)) returning id into review_id;
  return review_id;
end;
$$;

create function public.certificate_completion_is_verified(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.certificate_has_required_records(p_user_id) and coalesce((
    select r.approved and r.evidence_hash = encode(sha256(convert_to(public.certificate_completion_evidence(p_user_id)::text, 'UTF8')), 'hex')
    from public.certificate_completion_reviews r where r.user_id = p_user_id
    order by r.reviewed_at desc, r.id desc limit 1
  ), false);
$$;

-- Only a boolean about the caller. No user_id parameter, answers, notes or PII.
create function public.certificate_verification_status()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.certificate_completion_is_verified(auth.uid());
$$;

revoke all on function public.certificate_completion_evidence(uuid) from public, anon, authenticated;
revoke all on function public.certificate_has_required_records(uuid) from public, anon, authenticated;
revoke all on function public.review_certificate_completion(uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function public.certificate_completion_is_verified(uuid) from public, anon, authenticated;
revoke all on function public.certificate_verification_status() from public, anon, authenticated;
grant execute on function public.certificate_completion_evidence(uuid) to service_role;
grant execute on function public.certificate_has_required_records(uuid) to service_role;
grant execute on function public.review_certificate_completion(uuid, boolean, text, text) to service_role;
grant execute on function public.certificate_completion_is_verified(uuid) to service_role;
grant execute on function public.certificate_verification_status() to authenticated;

-- Defense in depth: a future permissive policy cannot broaden participant reads.
create policy certificate_requests_owner_boundary on public.certificate_requests
  as restrictive for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.certificate_requests from public, anon, authenticated;
grant select (id, user_id, username, full_name, national_id, email, completion_date,
  certificate_code, status, certificate_sent_at, created_at, updated_at)
  on public.certificate_requests to authenticated;
grant insert (user_id, full_name, national_id, email) on public.certificate_requests to authenticated;

-- The migration is followed below by the updated insert trigger
-- for installations that applied an earlier revision of 001.



create or replace function public.prepare_certificate_request()
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

  -- Same precedence as app.js; two rows with default initial are not a final.
  with attempts as (
    select d.created_at,
      public.certificate_diagnostic_type(d.attempt_type, d.answers::jsonb) as attempt_type
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
revoke all on function public.certificate_diagnostic_type(text, jsonb) from public, anon, authenticated;
grant execute on function public.certificate_diagnostic_type(text, jsonb) to service_role;
revoke all on function public.prepare_certificate_request() from public, anon, authenticated;
alter table public.certificate_requests drop constraint if exists certificate_requests_email_check;
alter table public.certificate_requests add constraint certificate_requests_email_check
  check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') not valid;
alter table public.certificate_requests validate constraint certificate_requests_email_check;

commit;
