-- Only needed if the certificate migration 001 was applied before this change.
-- The current 001 already includes this guard. Safe to apply afterwards as well.
-- No result is deleted, regraded or modified; applies to future participant writes.
begin;

create or replace function public.enforce_planne_diagnostic_order()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;
begin
  -- Preserve administrative imports/maintenance of historical data.
  if auth.uid() is null then return new; end if;
  if new.user_id<>auth.uid() or (tg_op='UPDATE' and old.user_id<>auth.uid()) then
    raise exception 'Authenticated owner required' using errcode='42501';
  end if;
  if tg_table_name='quiz_attempts' then
    if not exists(select 1 from public.diagnostic_answers d where d.user_id=new.user_id
      and public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='initial') then
      raise exception 'Complete el diagnóstico inicial antes de realizar las etapas' using errcode='23514';
    end if;
    return new;
  end if;
  kind:=public.certificate_diagnostic_type(new.attempt_type,new.answers::jsonb);
  if kind='final' then
    if not exists(select 1 from public.diagnostic_answers d where d.user_id=new.user_id
      and d.id is distinct from new.id
      and public.certificate_diagnostic_type(d.attempt_type,d.answers::jsonb)='initial')
      or (select count(distinct q.stage_key) from public.quiz_attempts q where q.user_id=new.user_id
        and q.stage_key in ('A','B','C','D') and q.passed is true)<>4 then
      raise exception 'Complete el diagnóstico inicial y las etapas A, B, C y D antes del diagnóstico final' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_planne_diagnostic_order() from public,anon,authenticated;

do $$
begin
  if not exists(select 1 from pg_trigger where tgname='planne_diagnostic_order' and tgrelid='public.diagnostic_answers'::regclass) then
    create trigger planne_diagnostic_order before insert or update on public.diagnostic_answers
      for each row execute function public.enforce_planne_diagnostic_order();
  end if;
  if not exists(select 1 from pg_trigger where tgname='planne_initial_before_stages' and tgrelid='public.quiz_attempts'::regclass) then
    create trigger planne_initial_before_stages before insert or update on public.quiz_attempts
      for each row execute function public.enforce_planne_diagnostic_order();
  end if;
end;
$$;

commit;
