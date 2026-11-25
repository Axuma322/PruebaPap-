// Development dependencies only; see supabase/README.md. No live services used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const ts=require('typescript');
const pdfLib=require('pdf-lib');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
require('../supabase/functions/_shared/certificate-pdf.js');
const pdf=globalThis.PLANNECertificatePDF;
const brainImage=fs.readFileSync(path.join(root,"assets/cerebro.png"));
const user='10000000-0000-0000-0000-000000000001';
const other='10000000-0000-0000-0000-000000000002';
const demo='10000000-0000-0000-0000-000000000003';

test('single migration: own requests, unique code, saved completion, B=25%, privacy; evaluations untouched',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      create table public.profiles(id uuid,username text);
      create table public.diagnostic_answers(id uuid default gen_random_uuid(),user_id uuid,attempt_type text default 'initial',answers jsonb,score integer,created_at timestamptz default now());
      create table public.quiz_attempts(id uuid default gen_random_uuid(),user_id uuid,stage_key text,passed boolean,answers jsonb,score integer,created_at timestamptz default now());
      create table public.progress(user_id uuid,completed_stages text[]);
      alter table public.quiz_attempts enable row level security;
      create policy own_quizzes on public.quiz_attempts to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,insert,update on public.quiz_attempts to authenticated;
      insert into auth.users values ('${user}'),('${other}'),('${demo}');
      insert into public.profiles values ('${user}','tester'),('${other}','other'),('${demo}','demo');`);
    const policiesBefore=(await db.query("select * from pg_policies where tablename in ('quiz_attempts','diagnostic_answers','progress')")).rows;
    await db.exec(read('supabase/migrations/202611240001_certificate_requests.sql'));
    assert.deepEqual((await db.query("select * from pg_policies where tablename in ('quiz_attempts','diagnostic_answers','progress')")).rows,policiesBefore);
    assert.equal((await db.query("select count(*)::int n from pg_trigger where not tgisinternal and tgrelid in ('public.quiz_attempts'::regclass,'public.diagnostic_answers'::regclass,'public.progress'::regclass)")).rows[0].n,2);
    const setUser=()=>db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`);
    const admin=()=>db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
    const request=()=>db.query(`insert into public.certificate_requests(user_id,full_name,national_id,email) values ('${user}',' Nombre Apellido ',' 0123 ','private@example.com') returning id,certificate_code,completion_date,full_name,national_id`);
    await setUser();await assert.rejects(request,/Complete initial/);await admin();
    await db.exec(`insert into public.diagnostic_answers(user_id,attempt_type,answers,created_at) values
      ('${user}','initial','{"attemptType":"initial"}','2026-11-20'),('${user}','initial','{"attemptType":"final"}','2026-11-23');
      insert into public.quiz_attempts(user_id,stage_key,passed,score,created_at) values
      ('${user}','A',true,70,'2026-11-21'),('${user}','B',true,25,'2026-11-22'),
      ('${user}','C',true,70,'2026-11-22'),('${user}','D',false,25,'2026-11-24');`);
    assert.equal((await db.query('select public.certificate_can_issue($1) value',[user])).rows[0].value,false);
    await db.exec(`update public.quiz_attempts set passed=true,score=70 where stage_key='D'`);
    await setUser();const record=(await request()).rows[0];
    assert.ok(record.certificate_code.startsWith('PLANNE-'));assert.equal(record.full_name,'Nombre Apellido');assert.equal(record.national_id,'0123');
    assert.equal(new Date(record.completion_date).toISOString(),'2026-11-24T00:00:00.000Z');
    await assert.rejects(request,/duplicate/);
    await assert.rejects(()=>db.exec('select certificate_pdf_base64,email_payload from public.certificate_requests'),/permission denied/);
    await assert.rejects(()=>db.exec("update public.certificate_requests set status='sent'"),/permission denied/);
    await assert.rejects(()=>db.query('select public.certificate_can_issue($1)',[other]),/permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
    assert.equal((await db.query('select id,national_id,email from public.certificate_requests')).rows.length,0);
    await assert.rejects(request,/Authenticated owner/);
    await admin();
    await db.exec(`update public.profiles set username='renamed-demo' where id='${demo}'`);
    assert.equal((await db.query('select public.certificate_can_issue($1) value',[demo])).rows[0].value,false);
    assert.equal((await db.query("select to_regclass('public.certificate_completion_reviews') value")).rows[0].value,null);
    assert.equal((await db.query("select to_regclass('public.certificate_instruments') value")).rows[0].value,null);
  } finally {await db.close()}
});

test('database enforces initial before stages and final after A-D, even for a direct insert/update',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      create table public.profiles(id uuid,username text);
      create table public.diagnostic_answers(id uuid default gen_random_uuid(),user_id uuid,attempt_type text default 'initial',answers jsonb,created_at timestamptz default now());
      create table public.quiz_attempts(user_id uuid,stage_key text,passed boolean,score integer,created_at timestamptz default now());
      insert into auth.users values ('${user}');insert into public.profiles values ('${user}','tester');
      grant select,insert,update on public.diagnostic_answers,public.quiz_attempts to authenticated;`);
    await db.exec(read('supabase/migrations/202611240001_certificate_requests.sql'));
    // The optional upgrade is safe after the new initial migration too.
    await db.exec(read('supabase/migrations/202611250002_diagnostic_order.sql'));
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`);
    const insertFinal=()=>db.query('insert into public.diagnostic_answers(user_id,answers) values($1,$2)',[user,{attemptType:'final'}]);
    await assert.rejects(()=>db.query(`insert into public.quiz_attempts values('${user}','A',true,70,now())`),/diagnóstico inicial/);
    await assert.rejects(insertFinal,/antes del diagnóstico final/);
    await db.query('insert into public.diagnostic_answers(user_id,answers) values($1,$2)',[user,{attemptType:'initial'}]);
    await assert.rejects(insertFinal,/antes del diagnóstico final/);
    await assert.rejects(()=>db.exec(`update public.diagnostic_answers set answers='{"attemptType":"final"}'`),/antes del diagnóstico final/);
    await db.exec(`insert into public.quiz_attempts values('${user}','A',true,70,now()),('${user}','B',true,25,now()),('${user}','C',true,70,now()),('${user}','D',false,25,now())`);
    await assert.rejects(insertFinal,/antes del diagnóstico final/);
    await db.exec("update public.quiz_attempts set passed=true,score=70 where stage_key='D'");
    await insertFinal();
    assert.equal((await db.query('select count(*)::int n from public.diagnostic_answers')).rows[0].n,2);
  } finally {await db.close()}
});

const sample={full_name:'José María Núñez García',national_id:'1-2345-6789',completion_date:'2026-11-25T12:00:00Z',certificate_code:'PLANNE-PRUEBA'};
async function pdfText(content) {
  const doc=await pdfLib.PDFDocument.load(Buffer.from(content,'base64'));
  const page=doc.getPages()[0];
  const streams=page.node.Contents().asArray().map(ref=>doc.context.lookup(ref));
  const text=streams.map(stream=>Buffer.from(pdfLib.decodePDFRawStream(stream).decode()).toString('latin1'))
    .join('\n').replace(/<([0-9A-F]+)>/gi,(_,hex)=>Buffer.from(hex,'hex').toString('latin1'));
  return {doc,page,text};
}
test('authentic one-page landscape PDF, Spanish accents, exact participant fields and configurable text',async()=>{
  const content=await pdf.render(sample,{certificateText:'Texto institucional configurable para esta prueba.'},pdfLib,brainImage);
  assert.equal(Buffer.from(content,'base64').subarray(0,5).toString(),'%PDF-');
  const {doc,page,text}=await pdfText(content);
  assert.equal(doc.getPageCount(),1);assert.ok(page.getWidth()>page.getHeight());
  for(const value of [sample.full_name,sample.national_id,sample.certificate_code,'25 de noviembre de 2026','PLANNE','Texto institucional configurable'])assert.ok(text.includes(value),value);
  assert.ok(text.includes('Esteban Porras Murillo'));
  assert.ok(text.includes('503180530'));
  assert.ok(!text.includes('pendiente de definir'));
  assert.ok(page.node.Resources().lookup(pdfLib.PDFName.of('XObject'),pdfLib.PDFDict).keys().length > 0);
  assert.deepEqual(fs.readFileSync(path.join(root,'supabase/functions/send-certificate/assets/cerebro.png')),brainImage);
  const demoContent=await pdf.render({...sample,demo:true},{},pdfLib,brainImage);
  assert.ok((await pdfText(demoContent)).text.includes('SIN VALIDEZ'));
  const long=await pdf.render({...sample,full_name:'Nombre compuesto '.repeat(9).trim()},{},pdfLib,brainImage);
  assert.equal((await pdfText(long)).doc.getPageCount(),1);
});

test('Edge: real PDF attachment equals downloads, frozen bytes, JWT/ownership, retries/concurrency and no duplicate sends',async()=>{
  const compiled=ts.transpileModule(read('supabase/functions/send-certificate/index.ts'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.equal((compiled.diagnostics||[]).length,0);
  const code=compiled.outputText.replace(/^import .*;$/mg,'').replace(/import\.meta\.url/g,JSON.stringify('file:///test/index.ts'));
  const id='20000000-0000-0000-0000-000000000001';
  const row={...sample,id,user_id:user,username:'tester',email:'private@example.com',status:'pending',certificate_pdf_base64:null,updated_at:new Date().toISOString(),email_first_attempt_at:null,email_payload:null};
  let handler,eligible=false,authValid=true,fetches=0,providerFails=true,lastPayload,updates=0;
  const env={SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-service-key',RESEND_API_KEY:'fake-resend',CERTIFICATE_FROM:'sender@example.com',ALLOWED_ORIGINS:'https://planne.test'};
  const admin={auth:{async getUser(){return {data:{user:authValid?{id:user}:null},error:authValid?null:{}}}},
    async rpc(name,args){assert.equal(name,'certificate_can_issue');assert.equal(args.p_user_id,user);return {data:eligible,error:null}},
    from(){let filters=[],change=null;return {select(){return this},eq(k,v){filters.push([k,v]);return this},is(k,v){filters.push([k,v]);return this},update(value){change=value;return this},
      async maybeSingle(){if(!filters.every(([k,v])=>row[k]===v))return {data:null,error:null};if(change)Object.assign(row,change,{updated_at:new Date(Date.now()+ ++updates).toISOString()});return {data:{...row},error:null}},then(ok,bad){return this.maybeSingle().then(ok,bad)}}}};
  const deno={readFile:async()=>brainImage,env:{get:key=>env[key]},serve:fn=>handler=fn};
  const fakeFetch=async(url,options)=>{fetches++;lastPayload=JSON.parse(options.body);assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'planne-certificate/'+id);return providerFails?new Response('{}',{status:503}):new Response('{"id":"provider-test"}',{status:200})};
  // Same JS realm as pdf-lib; the actual shared renderer is used, not stubbed.
  new Function('Deno','createClient','PDFDocument','StandardFonts','rgb','fetch',code)(deno,()=>admin,pdfLib.PDFDocument,pdfLib.StandardFonts,pdfLib.rgb,fakeFetch);
  const call=async(options={})=>{
    const response=await handler(new Request('https://function.test',{method:'POST',headers:{origin:options.origin||'https://planne.test',authorization:options.noAuth?'':'Bearer test','content-type':'application/json'},body:JSON.stringify({request_id:options.id||id,action:options.action||'send'})}));
    return {status:response.status,body:await response.json()};
  };
  assert.equal((await call({noAuth:true})).status,401);assert.equal((await call({origin:'https://evil.test'})).status,403);
  authValid=false;assert.equal((await call()).status,401);authValid=true;
  assert.equal((await call({id:other})).status,404);assert.equal((await call()).status,403);assert.equal(fetches,0);
  eligible=true;row.username='demo';assert.equal((await call()).status,404);row.username='tester';
  delete env.RESEND_API_KEY;
  const first=await call({action:'download'});assert.equal(first.status,200);assert.equal(fetches,0);
  assert.equal(first.body.filename,'Certificado_PLANNE.pdf');assert.equal(first.body.content_type,'application/pdf');
  const saved=first.body.content_base64;assert.ok((await pdfText(saved)).text.includes(sample.full_name));
  env.RESEND_API_KEY='fake-resend';env.CERTIFICATE_TEXT='Changed after PDF creation';
  assert.equal((await call()).status,502);assert.equal(fetches,1);assert.equal(row.status,'failed');
  const attachment=lastPayload.attachments[0];assert.equal(attachment.filename,'Certificado_PLANNE.pdf');assert.equal(attachment.content_type,'application/pdf');assert.equal(attachment.content,saved);
  assert.ok(lastPayload.html.includes('Felicitaciones'));assert.ok(!lastPayload.html.includes(sample.national_id));
  const original=JSON.stringify(lastPayload);providerFails=false;
  assert.equal((await call()).status,200);assert.equal(JSON.stringify(lastPayload),original);
  assert.equal((await call({action:'download'})).body.content_base64,saved);
  assert.equal((await call()).status,200);assert.equal(fetches,2);
  row.status='pending';row.email_first_attempt_at=null;row.email_payload=null;row.updated_at=new Date().toISOString();
  const parallel=await Promise.all([call(),call(),call()]);assert.ok(parallel.every(r=>[200,202].includes(r.status)));assert.equal(fetches,3);
  assert.equal(row.certificate_pdf_base64,saved);
  row.status='failed';row.email_first_attempt_at=new Date(Date.now()-24*3600_000).toISOString();
  assert.equal((await call()).status,409);assert.equal(fetches,3);
});
