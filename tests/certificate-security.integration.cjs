// Test-only dependencies installed outside the app; see supabase/README.md.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const ts=require('typescript');
const {catalog}=require('../scripts/certificate-catalog.cjs');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const instruments=catalog();
const user='10000000-0000-0000-0000-000000000001';
const other='10000000-0000-0000-0000-000000000002';
const demo='10000000-0000-0000-0000-000000000003';

function answers(key,value=3) {
  const spec=instruments[key];
  return {
    ...(spec.kind==='likert'?{evaluationType:'likert'}:{}),
    ...(key==='B'?{instrumentVersion:'B-autoevaluacion-v1'}:{}),
    items:Object.entries(spec.items).map(([id,item])=>spec.kind==='likert'
      ?{itemId:id,blockId:item.block,selectedValue:value}
      :{[spec.kind==='choice'?'questionId':'itemId']:id,
        selectedOptionId:Object.keys(item.options).find(k=>spec.kind==='diagnostic'||item.options[k]===1)})
  };
}
async function schema(db) {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    create table public.profiles(id uuid,username text);
    create table public.diagnostic_answers(id uuid default gen_random_uuid(),user_id uuid,attempt_type text default 'initial',answers jsonb,score integer,created_at timestamptz default now());
    create table public.quiz_attempts(id uuid default gen_random_uuid(),user_id uuid,stage_key text,passed boolean,answers jsonb,score integer,created_at timestamptz default now());
    create table public.progress(user_id uuid,completed_stages text[]);
    insert into auth.users values ('${user}'),('${other}'),('${demo}');
    insert into public.profiles values ('${user}','tester'),('${other}','other'),('${demo}','demo');
    alter table public.diagnostic_answers enable row level security;
    alter table public.quiz_attempts enable row level security;
    alter table public.progress enable row level security;
    grant select,insert,update on public.quiz_attempts,public.diagnostic_answers,public.progress to authenticated;
    create policy own_quiz on public.quiz_attempts to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    create policy own_dna on public.diagnostic_answers to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    create policy own_progress on public.progress to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());`);
  await db.exec(read('supabase/migrations/202611240001_certificate_requests.sql'));
}
const install=db=>db.exec(read('supabase/migrations/202611240002_certificate_automatic_completion.sql'));
const asUser=(db,id=user)=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
const admin=db=>db.exec(`reset role;select set_config('request.jwt.claim.sub','',false)`);
const quiz=(db,id,key,payload=answers(key))=>db.query(`insert into public.quiz_attempts(user_id,stage_key,answers,score,passed,created_at) values($1,$2,$3,999,true,'2000-01-01') returning score,passed,created_at`,[id,key,payload]);
const dna=(db,id,kind)=>db.query(`insert into public.diagnostic_answers(user_id,attempt_type,answers,score) values($1,'initial',$2,999) returning attempt_type,score`,[id,{...answers('DNA'),attemptType:kind}]);
const canIssue=async(db,id=user)=>{await admin(db);return (await db.query('select public.certificate_can_issue($1) as value',[id])).rows[0].value};

test('automatic backend: no passed/progress spoofing, low-score B completes, owner privacy and no approvals',async()=>{
  const db=new PGlite();
  try {
    await schema(db);await install(db);await asUser(db);
    await assert.rejects(()=>quiz(db,user,'A',{items:[]}),/Incomplete/);
    await db.query('insert into public.progress values($1,$2)',[user,['A','B','C','D']]);
    assert.equal(await canIssue(db),false);
    await asUser(db);
    const b=(await quiz(db,user,'B',answers('B',1))).rows[0];
    assert.equal(b.score,25);assert.equal(b.passed,true);
    assert.notEqual(new Date(b.created_at).getUTCFullYear(),2000);
    const d=(await quiz(db,user,'D',answers('D',1))).rows[0];
    assert.equal(d.score,25);assert.equal(d.passed,false);
    const tampered=(await db.query(`update public.quiz_attempts set passed=true,score=999 where stage_key='D' returning passed,score`)).rows[0];
    assert.equal(tampered.passed,false);assert.equal(tampered.score,25);
    await assert.rejects(()=>db.query('insert into public.diagnostic_answers(user_id,answers,score) values($1,$2,999)',[user,{attemptType:'final',items:[]}]),/Incomplete/);
    const wrongA=answers('A');
    wrongA.items.forEach(item=>item.selectedOptionId=Object.keys(instruments.A.items[item.questionId].options).find(k=>instruments.A.items[item.questionId].options[k]===0));
    const failed=(await quiz(db,user,'A',wrongA)).rows[0];assert.equal(failed.score,0);assert.equal(failed.passed,false);
    await quiz(db,user,'A');await quiz(db,user,'C');await quiz(db,user,'D');
    await dna(db,user,'initial');
    assert.equal(await canIssue(db),false);
    await asUser(db);const final=(await dna(db,user,'final')).rows[0];assert.equal(final.attempt_type,'final');assert.notEqual(final.score,999);
    assert.equal(await canIssue(db),true);
    await asUser(db);
    const requestSQL=`insert into public.certificate_requests(user_id,full_name,national_id,email) values ('${user}','Nombre','0123','private@example.com') returning id,certificate_code`;
    const record=(await db.query(requestSQL)).rows[0];assert.ok(record.certificate_code.startsWith('PLANNE-'));
    await assert.rejects(()=>db.query(requestSQL),/duplicate/);
    await assert.rejects(()=>db.query('select email_payload from public.certificate_requests'),/permission denied/);
    await assert.rejects(()=>db.exec('update public.certificate_requests set status=\'sent\''),/permission denied/);
    await assert.rejects(()=>db.query(`select public.certificate_can_issue('${other}')`),/permission denied/);
    await assert.rejects(()=>db.exec(`update public.certificate_instruments set definition='{}'`),/permission denied/);
    await asUser(db,other);
    assert.equal((await db.query('select id,national_id,email from public.certificate_requests')).rows.length,0);
    await assert.rejects(()=>quiz(db,user,'C'),/Owner required|row-level security/);
    await assert.rejects(()=>db.query(`insert into public.progress values ('${user}',array['A'])`),/row-level security/);
    await admin(db);
    assert.equal((await db.query("select to_regprocedure('public.review_certificate_completion(uuid,boolean,text,text)') as value")).rows[0].value,null);
    assert.equal((await db.query("select to_regclass('public.certificate_completion_reviews') as value")).rows[0].value,null);
    await db.exec(`update public.profiles set username='renamed-demo' where id='${demo}'`);
    assert.equal(await canIssue(db,demo),false);
    await db.exec(`update public.profiles set username='demo' where id='${other}';update public.profiles set username='renamed-again' where id='${other}'`);
    assert.equal((await db.query('select count(*)::int n from public.certificate_demo_accounts where user_id=$1',[other])).rows[0].n,1);
    await db.exec(read('supabase/audit/rls_read_only.sql'));
  } finally {await db.close()}
});

test('backend validates every ID/option, thresholds, legacy B, and catalog drift',async()=>{
  const db=new PGlite();
  try {
    await schema(db);
    // Existing legacy B row predates installation; no retroactive rewrite.
    await db.query(`insert into public.quiz_attempts(user_id,stage_key,answers,score,passed,created_at) values($1,'B',$2,100,true,'2000-01-01')`,[user,answers('B-legacy')]);
    await install(db);
    const score=async(key,payload)=> (await db.query(`select public.certificate_answer_score($1,$2,'2000-01-01') as value`,[key,payload])).rows[0].value;
    for(const key of ['DNA','A','B','C','D']) {
      const payload=answers(key);assert.notEqual(await score(key,payload),null);
      payload.items.pop();assert.equal(await score(key,payload),null);
      const duplicate=answers(key);duplicate.items[1]=duplicate.items[0];assert.equal(await score(key,duplicate),null);
      const invalid=answers(key);
      if(instruments[key].kind==='likert')invalid.items[0].selectedValue=5;
      else invalid.items[0].selectedOptionId='invented';
      assert.equal(await score(key,invalid),null);
    }
    assert.equal(Number(await score('B',answers('B',1))),25);
    for(const key of ['A','C']) {
      const good=answers(key);const count=good.items.length;const minimum=Math.ceil(count*.7);
      for(const correct of [minimum-1,minimum]) {
        const payload=answers(key);
        payload.items.slice(correct).forEach(item=>item.selectedOptionId=Object.keys(instruments[key].items[item.questionId].options).find(k=>instruments[key].items[item.questionId].options[k]===0));
        assert.equal(Number(await score(key,payload)),Math.round(correct/count*100));
        assert.equal((await db.query(`select public.certificate_stage_completed($1,$2,'2000-01-01') value`,[key,payload])).rows[0].value,correct===minimum);
      }
    }
    for(const [points,completed] of [[55,false],[56,true],[72,true]]) {
      const payload=answers('D',1);let remaining=points-20;
      payload.items.forEach(item=>{const extra=Math.min(remaining,3);item.selectedValue+=extra;remaining-=extra});
      assert.equal((await db.query(`select public.certificate_stage_completed('D',$1,'2000-01-01') value`,[payload])).rows[0].value,completed);
    }
    assert.equal(Number(await score('B',answers('B-legacy'))),100);
    const legacy=(await db.query(`select score,passed from public.quiz_attempts where stage_key='B'`)).rows[0];assert.equal(legacy.score,100);assert.equal(legacy.passed,true);
    await asUser(db);
    await assert.rejects(()=>quiz(db,user,'B',answers('B-legacy')),/Incomplete/);
    await admin(db);
    for(const [email,valid] of [['a@b.cr',true],['a+b@school.example',true],['a@b',false],['a b@c.cr',false]]) {
      assert.equal((await db.query(`select $1 ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' as valid`,[email])).rows[0].valid,valid);
    }
    for(const [key,spec] of Object.entries(instruments)) {
      assert.deepEqual((await db.query('select definition from public.certificate_instruments where instrument_key=$1',[key])).rows[0].definition,spec);
    }
  } finally {await db.close()}
});

test('migration preflight preserves data and rolls back if existing RLS is disabled',async()=>{
  const db=new PGlite();
  try {
    await schema(db);await db.exec('alter table public.progress disable row level security');
    await assert.rejects(()=>install(db),/RLS must already be enabled/);
    await db.exec('rollback');
    assert.equal((await db.query("select to_regclass('public.certificate_instruments') as value")).rows[0].value,null);
    assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n,3);
  } finally {await db.close()}
});

test('Edge: automatic eligibility, JWT/ownership, no PII, HTML email, failures/retries and idempotency',async()=>{
  const compiled=ts.transpileModule(read('supabase/functions/send-certificate/index.ts'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.equal((compiled.diagnostics||[]).length,0);
  const code=compiled.outputText.replace(/^import .*;$/mg,'');
  const id='20000000-0000-0000-0000-000000000001';
  const row={id,user_id:user,username:'tester',full_name:'<img src=x>',national_id:'PRIVATE-ID',email:'private@example.com',completion_date:'2026-11-25',certificate_code:'PLANNE-TEST',status:'pending',updated_at:new Date().toISOString(),email_first_attempt_at:null,email_payload:null};
  let handler,eligible=false,rpcFails=false,authValid=true,fetches=0,providerFails=true,lastPayload;
  const env={SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-test',RESEND_API_KEY:'fake-resend',CERTIFICATE_FROM:'sender@example.com',ALLOWED_ORIGINS:'https://planne.test'};
  const adminClient={auth:{async getUser(){return {data:{user:authValid?{id:user}:null},error:authValid?null:{}}}},
    async rpc(name,args){assert.equal(name,'certificate_can_issue');assert.equal(args.p_user_id,user);return {data:eligible,error:rpcFails?{}:null}},
    from(){let filters=[],change=null;return {select(){return this},eq(k,v){filters.push([k,v]);return this},update(value){change=value;return this},
      async maybeSingle(){if(!filters.every(([k,v])=>row[k]===v))return {data:null,error:null};if(change)Object.assign(row,change,{updated_at:new Date(Date.now()+1).toISOString()});return {data:{...row},error:null}},then(ok,bad){return this.maybeSingle().then(ok,bad)}}}};
  const context={Request,Response,AbortSignal,Date,createClient:()=>adminClient,Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},fetch:async(url,options)=>{
    fetches++;lastPayload=JSON.parse(options.body);assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'planne-certificate/'+id);
    return providerFails?new Response('{}',{status:503}):new Response('{"id":"provider-test"}',{status:200});}};
  vm.runInNewContext(read('supabase/functions/_shared/certificate-template.js'),context);vm.runInNewContext(code,context);
  const call=async(options={})=>{const response=await handler(new Request('https://function.test',{method:'POST',headers:{origin:options.origin||'https://planne.test',authorization:options.noAuth?'':'Bearer test','content-type':'application/json'},body:JSON.stringify({request_id:options.id||id})}));const body=await response.text();for(const secret of ['PRIVATE-ID','private@example.com','fake-test','fake-resend'])assert.ok(!body.includes(secret));return response.status};
  assert.equal(await call({noAuth:true}),401);assert.equal(await call({origin:'https://evil.test'}),403);
  authValid=false;assert.equal(await call(),401);authValid=true;
  assert.equal(await call({id:'------------------------------------'}),400);assert.equal(await call({id:other}),404);
  assert.equal(await call(),403);assert.equal(fetches,0);
  rpcFails=true;assert.equal(await call(),503);rpcFails=false;
  eligible=true;row.username='demo';assert.equal(await call(),404);row.username='tester';
  assert.equal(await call(),502);assert.equal(fetches,1);assert.equal(row.status,'failed');
  const originalPayload=JSON.stringify(lastPayload);providerFails=false;
  assert.equal(await call(),200);assert.equal(fetches,2);assert.equal(JSON.stringify(lastPayload),originalPayload);
  assert.ok(!lastPayload.attachments);assert.ok(lastPayload.html.includes('&lt;img'));
  assert.equal(await call(),200);assert.equal(fetches,2);
  row.status='failed';row.email_first_attempt_at=new Date(Date.now()-24*3600_000).toISOString();
  assert.equal(await call(),409);assert.equal(fetches,2);
  row.status='pending';row.email_first_attempt_at=null;row.email_payload=null;row.updated_at=new Date().toISOString();
  const statuses=await Promise.all([call(),call(),call()]);
  assert.ok(statuses.every(status=>status===200||status===202));assert.equal(fetches,3);
});
