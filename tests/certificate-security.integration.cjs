// Optional test-only dependencies, installed outside the repo; see supabase/README.md.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {PGlite} = require('@electric-sql/pglite');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const user = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const demo = '10000000-0000-0000-0000-000000000003';

test('PostgreSQL: legacy normalization, untrusted results cannot authorize emission, private data and reviews', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.profiles(id uuid,username text);
      create table public.diagnostic_answers(id uuid default gen_random_uuid(),user_id uuid,attempt_type text default 'initial',answers jsonb,score integer,created_at timestamptz default now());
      create table public.quiz_attempts(id uuid default gen_random_uuid(),user_id uuid,stage_key text,passed boolean,answers jsonb,score integer,created_at timestamptz default now());
      insert into auth.users values ('${user}'),('${other}'),('${demo}');
      insert into public.profiles values ('${user}','tester'),('${other}','other'),('${demo}','demo');
      -- Deliberately simulate vulnerable owner-only result policies. This is NOT
      -- a claim about deployed policies: prove issuance remains blocked even here.
      alter table public.quiz_attempts enable row level security;
      alter table public.diagnostic_answers enable row level security;
      grant select,insert,update on public.quiz_attempts,public.diagnostic_answers to authenticated;
      create policy own_quizzes on public.quiz_attempts to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());
      create policy own_diagnostics on public.diagnostic_answers to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());
    `);
    await db.exec(read('supabase/migrations/202611240001_certificate_requests.sql'));
    await db.exec(read('supabase/migrations/202611240002_certificate_security_review.sql'));
    const asUser = async id => db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
    const verified = async () => (await db.query('select public.certificate_verification_status() as value')).rows[0].value;
    const approve = async (approved=true) => {
      await db.exec('reset role');
      await db.query('select public.review_certificate_completion($1,$2,$3,$4)',[user,approved,'Reviewer test','Independent evidence checked in test fixture']);
    };
    await asUser(user);
    const requestSQL = `insert into public.certificate_requests(user_id,full_name,national_id,email) values ('${user}','Nombre','0123','private@example.com') returning id,certificate_code`;
    await assert.rejects(()=>db.query(requestSQL),/Complete initial/);
    // A forged passed flag and invented diagnoses are NOT trusted evidence.
    await db.exec(`insert into public.quiz_attempts(user_id,stage_key,passed,answers,score)
      select '${user}', s, true, '{}', 100 from unnest(array['A','B','C','D']) s;
      insert into public.diagnostic_answers(user_id,answers,created_at) values
      ('${user}','{"attemptType":"initial"}','2026-11-20'),
      ('${user}','{"attemptType":"final"}','2026-11-23');`);
    assert.equal(await verified(),false);
    const registered = (await db.query(requestSQL)).rows[0];
    assert.ok(registered.certificate_code.startsWith('PLANNE-'));
    assert.equal(await verified(),false);
    await assert.rejects(()=>db.query(requestSQL),/duplicate/);
    await assert.rejects(()=>db.exec('select email_payload from public.certificate_requests'),/permission denied/);
    await assert.rejects(()=>db.exec('select * from public.certificate_completion_reviews'),/permission denied/);
    await assert.rejects(()=>db.exec(`select public.review_certificate_completion('${user}',true,'spoof','forged')`),/permission denied/);
    await assert.rejects(()=>db.exec(`select public.certificate_completion_is_verified('${other}')`),/permission denied/);
    await assert.rejects(()=>db.exec(`select public.certificate_completion_evidence('${other}')`),/permission denied/);
    await assert.rejects(()=>db.exec(`update public.certificate_requests set status='sent'`),/permission denied/);
    await db.exec('reset role; create policy accidental_permissive_read on public.certificate_requests for select to authenticated using (true)');
    await asUser(other);
    assert.equal((await db.query('select id,full_name,national_id,email from public.certificate_requests')).rows.length,0);
    assert.equal(await verified(),false);
    await db.exec('reset role');
    // SQL/frontend precedence match; neither chronology nor defaults invent finals.
    assert.equal((await db.query(`select public.certificate_diagnostic_type('initial','{"attemptType":"final"}') as kind`)).rows[0].kind,'final');
    assert.equal((await db.query(`select public.certificate_diagnostic_type(null,'{}') as kind`)).rows[0].kind,null);
    await db.exec(`insert into public.diagnostic_answers(user_id,answers) values ('${other}','{}'),('${other}','{}');
      insert into public.quiz_attempts(user_id,stage_key,passed) select '${other}',s,true from unnest(array['A','B','C','D']) s;`);
    assert.equal((await db.query(`select public.certificate_has_required_records('${other}') as value`)).rows[0].value,false);
    // An authorized review is an independent trust decision, not an auto-backfill.
    await approve(); await asUser(user); assert.equal(await verified(),true);
    await db.exec(`update public.quiz_attempts set answers='{"tampered":true}' where stage_key='B'`);
    assert.equal(await verified(),false);
    await approve(); await asUser(user); assert.equal(await verified(),true);
    await approve(false); await asUser(user); assert.equal(await verified(),false);
    await db.exec('reset role');
    assert.equal((await db.query(`select count(*)::int as n from public.certificate_completion_reviews where user_id='${user}'`)).rows[0].n,3);
    await db.exec(`update public.profiles set username='renamed-demo' where id='${demo}';
      insert into public.diagnostic_answers(user_id,answers) values ('${demo}','{"attemptType":"initial"}'),('${demo}','{"attemptType":"final"}');
      insert into public.quiz_attempts(user_id,stage_key,passed) select '${demo}',s,true from unnest(array['A','B','C','D']) s;`);
    await assert.rejects(()=>db.exec(`select public.review_certificate_completion('${demo}',true,'Reviewer','Independent evidence')`),/demo/);
    // The regex is deliberately independent of SQL string escape settings.
    for (const setting of ['on']) {
      await db.exec(`set standard_conforming_strings = ${setting}`);
      for (const [email,valid] of [['a@b.cr',true],['a+b@school.example',true],['a@bXcr',false],['a@b',false],['a b@c.cr',false],['a@b\\Xcr',false]]) {
        // Simple SQL protocol: PGlite's parameter parser rejects non-standard
        // strings when this setting is off. Dollar quoting preserves test bytes.
        assert.equal((await db.exec(`select $email$${email}$email$ ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' as valid`))[0].rows[0].valid,valid);
      }
    }
    await assert.rejects(()=>db.exec('set standard_conforming_strings=off'),/non-standard string literals are not supported/);
    t.diagnostic('PGlite rejects standard_conforming_strings=off; regex tested with on. The new [.] expression contains no string escapes.');
    // The inspection file is executable read-only SQL and reads no participant rows.
    await db.exec('set standard_conforming_strings=on');
    await db.exec(read('supabase/audit/rls_read_only.sql'));
  } finally { await db.close(); }
});

test('Edge: no delivery without trusted verification, no PII in responses, exact ownership and HTML delivery', async () => {
  const compiled = ts.transpileModule(read('supabase/functions/send-certificate/index.ts'),{
    reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.equal((compiled.diagnostics||[]).length,0);
  const code = compiled.outputText.replace(/^import .*;$/mg,'');
  const id = '20000000-0000-0000-0000-000000000001';
  let row = {id,user_id:user,username:'tester',full_name:'<img src=x>',national_id:'PRIVATE-ID',email:'private@example.com',
    completion_date:'2026-11-24',certificate_code:'PLANNE-TEST',status:'pending',updated_at:new Date().toISOString(),email_first_attempt_at:null,email_payload:null};
  let handler, trusted=false, rpcFails=false, authValid=true, fetches=0, lastPayload;
  const env={SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-test',RESEND_API_KEY:'fake-resend',CERTIFICATE_FROM:'sender@example.com',ALLOWED_ORIGINS:'https://planne.test'};
  const admin={auth:{async getUser(){return {data:{user:authValid?{id:user}:null},error:authValid?null:{}}}},
    async rpc(name,args){assert.equal(name,'certificate_completion_is_verified');assert.equal(args.p_user_id,user);return {data:trusted,error:rpcFails?{}:null}},
    from(){let filters=[],change=null;return {select(){return this},eq(k,v){filters.push([k,v]);return this},update(value){change=value;return this},
      async maybeSingle(){if(!filters.every(([k,v])=>row[k]===v))return {data:null,error:null};if(change)Object.assign(row,change,{updated_at:new Date(Date.now()+1).toISOString()});return {data:{...row},error:null}},
      then(ok,bad){return this.maybeSingle().then(ok,bad)}}}};
  const context={Request,Response,AbortSignal,Date,createClient:()=>admin,Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},
    fetch:async(url,options)=>{fetches++;lastPayload=JSON.parse(options.body);assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'planne-certificate/'+id);return new Response('{"id":"provider-test"}',{status:200})}};
  vm.runInNewContext(read('supabase/functions/_shared/certificate-template.js'),context);
  vm.runInNewContext(code,context);
  const call=async(options={})=>{
    const response=await handler(new Request('https://function.test',{method:'POST',headers:{origin:options.origin||'https://planne.test',authorization:options.noAuth?'':'Bearer test','content-type':'application/json'},body:JSON.stringify({request_id:options.id||id})}));
    const body=await response.text();
    for(const secret of ['PRIVATE-ID','private@example.com','fake-test','fake-resend'])assert.ok(!body.includes(secret));
    return response.status;
  };
  assert.equal(await call({noAuth:true}),401);
  assert.equal(await call({origin:'https://evil.test'}),403);
  authValid=false;assert.equal(await call(),401);authValid=true;
  assert.equal(await call({id:'------------------------------------'}),400);
  assert.equal(await call({id:other}),404);
  assert.equal(await call(),403);assert.equal(fetches,0);
  rpcFails=true;assert.equal(await call(),503);assert.equal(fetches,0);rpcFails=false;
  row.username='demo';trusted=true;assert.equal(await call(),404);assert.equal(fetches,0);row.username='tester';
  assert.equal(await call(),200);assert.equal(fetches,1);
  assert.ok(!lastPayload.attachments);assert.ok(lastPayload.html.includes('&lt;img'));
  assert.equal(await call(),200);assert.equal(fetches,1);
  trusted=false;assert.equal(await call(),403);assert.equal(fetches,1);
});

test('migration 002 also upgrades an old 001 without its new helper and preserves existing requests', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.profiles(id uuid,username text);
      create table public.diagnostic_answers(id uuid default gen_random_uuid(),user_id uuid,attempt_type text,answers jsonb,created_at timestamptz default now());
      create table public.quiz_attempts(id uuid default gen_random_uuid(),user_id uuid,stage_key text,passed boolean,created_at timestamptz default now());
      insert into auth.users values ('${user}');insert into public.profiles values ('${user}','tester');
      insert into public.diagnostic_answers(user_id,attempt_type,answers) values ('${user}','initial','{"attemptType":"initial"}'),('${user}','final','{"attemptType":"final"}');
      insert into public.quiz_attempts(user_id,stage_key,passed) select '${user}',s,true from unnest(array['A','B','C','D']) s;`);
    // Reproduce the previous deployment contract: no diagnostic helper and a
    // column-first coalesce. No need for a Git checkout or a live database.
    const old = read('supabase/migrations/202611240001_certificate_requests.sql')
      .replace(/create function public\.certificate_diagnostic_type[\s\S]*?grant execute on function public\.certificate_diagnostic_type\(text, jsonb\) to service_role;/,'')
      .replace('public.certificate_diagnostic_type(d.attempt_type, d.answers::jsonb)','coalesce(d.attempt_type, d.answers->>\'attemptType\')');
    await db.exec(old);
    assert.equal((await db.query("select to_regprocedure('public.certificate_diagnostic_type(text,jsonb)') as value")).rows[0].value,null);
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`);
    const previous=(await db.query(`insert into public.certificate_requests(user_id,full_name,national_id,email) values ('${user}','Previous','0123','previous@example.com') returning id,certificate_code,created_at`)).rows[0];
    await db.exec('reset role');
    await db.exec(read('supabase/migrations/202611240002_certificate_security_review.sql'));
    const after=(await db.query('select id,certificate_code,created_at from public.certificate_requests')).rows[0];
    assert.deepEqual(after,previous);
    assert.equal((await db.query(`select public.certificate_completion_is_verified('${user}') as value`)).rows[0].value,false);
    assert.equal((await db.query('select count(*)::int as value from public.quiz_attempts')).rows[0].value,4);
    assert.equal((await db.query('select count(*)::int as value from public.diagnostic_answers')).rows[0].value,2);
  } finally { await db.close(); }
});
