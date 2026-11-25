-- READ-ONLY INSPECTION, not a migration. Run as an administrator and return only
-- metadata. No participant names, cédulas, emails, answers, tokens or secrets.
begin read only;

select n.nspname as schema_name, c.relname as table_name,
  c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
  pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
  ('profiles','progress','diagnostic_answers','quiz_attempts','certificate_requests','certificate_completion_reviews');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename in
  ('profiles','progress','diagnostic_answers','quiz_attempts','certificate_requests','certificate_completion_reviews')
order by tablename, policyname;

select r.role_name, t.table_name,
  has_table_privilege(r.role_name, t.oid, 'SELECT') as can_select,
  has_table_privilege(r.role_name, t.oid, 'INSERT') as can_insert,
  has_table_privilege(r.role_name, t.oid, 'UPDATE') as can_update,
  has_table_privilege(r.role_name, t.oid, 'DELETE') as can_delete
from (values ('anon'),('authenticated'),('service_role')) r(role_name)
cross join (
  select c.oid, c.relname as table_name from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in
    ('profiles','progress','diagnostic_answers','quiz_attempts','certificate_requests','certificate_completion_reviews')
) t order by table_name, role_name;

select c.relname as table_name, a.attname as column_name,
  has_column_privilege('authenticated', c.oid, a.attnum, 'SELECT') as authenticated_select,
  has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT') as authenticated_insert,
  has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE') as authenticated_update,
  pg_get_expr(d.adbin, d.adrelid) as column_default
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
where n.nspname = 'public' and c.relname in
  ('profiles','progress','diagnostic_answers','quiz_attempts','certificate_requests','certificate_completion_reviews')
order by c.relname, a.attnum;

-- Review reachable SECURITY DEFINER routines too: RLS alone does not describe
-- privileges reachable through RPC. Source bodies intentionally are not printed.
select p.oid::regprocedure::text as routine, p.prosecdef as security_definer, p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef order by routine;

select r.rolname, r.rolsuper, r.rolbypassrls
from pg_roles r where r.rolname in ('anon','authenticated','authenticator','service_role');

select t.tgname, t.tgrelid::regclass::text as table_name, p.oid::regprocedure::text as routine, t.tgenabled
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal and t.tgrelid in (
  select c.oid from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in
    ('diagnostic_answers','quiz_attempts','certificate_requests','certificate_completion_reviews')
);

commit;
