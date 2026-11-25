const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const pdfLib=require('pdf-lib');
require('../supabase/functions/_shared/certificate-pdf.js');
const root=path.join(__dirname,'..');
const artifactDir=path.join(require('os').tmpdir(),'planne-certificate-browser');fs.mkdirSync(artifactDir,{recursive:true});
const mock=`
window.mockWrites=[];window.mockEmails=[];window.mockDownloads=[];
const scenario=window.testScenario||'complete';
window.supabase={createClient(){return {
auth:{async getSession(){return {data:{session:scenario==='logout'?null:{user:{id:'test-user',email:'tester@usuarios.example.com'}}},error:null}},async signOut(){return {error:null}}},
functions:{async invoke(name,options){if(options.body.action==='download'){mockDownloads.push({name,options});return {data:{filename:'Certificado_PLANNE.pdf',content_type:'application/pdf',content_base64:window.mockDownloadPdf},error:null}}mockEmails.push({name,options});if(window.emailFails)return {error:{message:'offline'}};const r=JSON.parse(localStorage.getItem('mock_request'));r.status='sent';localStorage.setItem('mock_request',JSON.stringify(r));return {data:{status:'sent'},error:null}}},
from(table){let inserted=null;const filters=[];const q={select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},
insert(value){inserted=value;return this},upsert(){return this},maybeSingle(){return this.resolve(true)},single(){return this.resolve(true)},
then(ok,bad){return this.resolve(false).then(ok,bad)},async resolve(single){
if(table==='certificate_requests'){
 if(window.certificateBackendFails)return {error:{message:'unavailable'}};
 await new Promise(r=>setTimeout(r,window.delayCertificate||30));
 let record=JSON.parse(localStorage.getItem('mock_request')||'null');
 if(inserted){mockWrites.push({table,payload:inserted});if(record)return {error:{code:'23505'}};
 record={...inserted,id:'10000000-0000-0000-0000-000000000001',certificate_code:'PLANNE-TEST-123',completion_date:'2026-11-24T12:00:00Z',status:'pending'};localStorage.setItem('mock_request',JSON.stringify(record));}
 return {data:record,error:null};
}
let rows=[];
if(table==='diagnostic_answers'&&inserted){if(inserted.attempt_type==='initial')window.mockInitialSaved=true;else window.mockFinalSaved=true;}
if(table==='profiles')rows=[{id:'test-user',username:scenario==='demo'?'demo':'tester'}];
if(table==='progress')rows=[{user_id:'test-user',diagnostic_completed:scenario!=='no-initial',current_stage:'A',completed_stages:scenario==='no-initial'?[]:['missing-stage','ordered'].includes(scenario)?['A','B','C']:['A','B','C','D']}];
if(table==='diagnostic_answers')rows=(scenario==='no-initial'?window.mockInitialSaved?['initial']:[]:['missing-final','ordered'].includes(scenario)&&!window.mockFinalSaved?['initial']:['initial','final']).map((type,i)=>({id:'dna-'+i,attempt_type:type,answers:{attemptType:type,items:[],totalScore:100,maxScore:150,percentage:67,variableScores:[]},created_at:'2026-11-2'+i+'T00:00:00Z'}));
if(table==='quiz_attempts')rows=(scenario==='no-initial'?[]:['missing-stage','ordered'].includes(scenario)?['A','B','C']:['A','B','C','D']).map(stage_key=>({stage_key,answers:{},passed:true,score:80,created_at:'2026-11-23T00:00:00Z'}));
return {data:single?(rows[0]||null):rows,error:null};
}};return q;}
}}};`;
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';
 if(name==='mock.js'){res.setHeader('Content-Type','application/javascript');res.end(mock);return;}
 try{let bytes=fs.readFileSync(path.join(root,name));if(name==='index.html')bytes=bytes.toString().replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','mock.js');
 res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PLANNE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const errors=[];let externals=[];
 const context=await browser.newContext();
 await context.route('**/*',route=>{if(!route.request().url().startsWith(origin)){externals.push(route.request().url());route.abort()}else route.continue()});
 const mockDownloadPdf=await globalThis.PLANNECertificatePDF.render({full_name:'Nombre Apellido',national_id:'123',completion_date:'2026-11-24T12:00:00Z',certificate_code:'PLANNE-TEST-123'},{},pdfLib,fs.readFileSync(path.join(root,'assets/cerebro.png')));
 await context.addInitScript(pdf=>{window.mockDownloadPdf=pdf;localStorage.setItem('planne:usage-guide-seen','true')},mockDownloadPdf);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForSelector('#certificateDialog[open]');
 assert.equal(await page.locator('#stageGrid .stage-card').count(),4);
 assert.equal(await page.locator('#certificateDemoResetButton').evaluate(e=>e.hidden),true);
 await page.locator('#certificateSubmitButton').click();
 assert.equal(await page.evaluate(()=>mockWrites.length),0);
 await page.locator('#certificateForm [name=full_name]').fill('   ');
 await page.locator('#certificateForm [name=national_id]').fill('123');
 await page.locator('#certificateForm [name=email]').fill('invalid');
 await page.locator('#certificateSubmitButton').click();assert.equal(await page.evaluate(()=>mockWrites.length),0);
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.querySelector('#certificateDialog').scrollWidth<=document.querySelector('#certificateDialog').clientWidth));
  await page.screenshot({path:path.join(artifactDir,'certificate-modal-'+width+'.png')});
 }
 await page.locator('#certificateForm [name=full_name]').fill('Nombre Apellido');
 await page.locator('#certificateForm [name=email]').fill('nombre@example.com');
 await page.locator('#certificateForm').evaluate(form=>{form.requestSubmit();form.requestSubmit()});
 await page.waitForFunction(()=>document.querySelector('#certificateRequestStatus').textContent.includes('fue enviado'));
 assert.equal(await page.evaluate(()=>mockWrites.length),1);assert.equal(await page.evaluate(()=>mockEmails.length),1);
 const downloadPromise=page.waitForEvent('download');await page.locator('#certificatePrintButton').click();const downloaded=await downloadPromise;
 assert.equal(downloaded.suggestedFilename(),'Certificado_PLANNE.pdf');
 await downloaded.saveAs(path.join(artifactDir,'certificate-sample.pdf'));
 assert.equal(fs.readFileSync(path.join(artifactDir,'certificate-sample.pdf')).toString('base64'),mockDownloadPdf);
 assert.equal(await page.evaluate(()=>mockDownloads.length),1);assert.equal(await page.evaluate(()=>mockEmails.length),1);
 await page.locator('#certificateCloseButton').click();
 await page.reload();await page.waitForFunction(()=>document.querySelector('#certificateSummaryStatus').textContent.includes('fue enviado'));
 assert.equal(await page.locator('#certificateDialog').evaluate(d=>d.open),false);
 assert.equal(await page.evaluate(()=>mockWrites.length),0);assert.equal(await page.evaluate(()=>mockEmails.length),0);
 await page.screenshot({path:path.join(artifactDir,'planne-home-blue.png'),fullPage:true});
 await page.locator('#logoutButton').click();assert.equal(await page.locator('#certificateSummary').evaluate(e=>e.hidden),true);
 assert.equal(await page.locator('#certificateForm [name=email]').inputValue(),'');
 for(const scenario of ['missing-final','missing-stage','ordered','no-initial','demo','logout']){
  const ctx=await browser.newContext();const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(s=>{window.testScenario=s;localStorage.setItem('planne:usage-guide-seen','true')},scenario);
  await p.goto(origin);await p.waitForFunction(()=>!document.body.classList.contains('auth-pending'));
  assert.equal(await p.locator('#certificateDialog').evaluate(d=>d.open),false);
  if(scenario==='demo'){
   await p.locator('#certificateOpenButton').click();
   await p.locator('#certificateForm [name=full_name]').fill('Demo Persona');await p.locator('#certificateForm [name=national_id]').fill('DEMO');await p.locator('#certificateForm [name=email]').fill('demo@example.com');
   await p.locator('#certificateSubmitButton').click();
   assert.equal(await p.evaluate(()=>mockWrites.length),0);assert.equal(await p.evaluate(()=>mockEmails.length),0);
   assert.ok((await p.locator('#certificateRequestStatus').innerText()).includes('simulada'));
   const examplePromise=p.waitForEvent('download');
   await p.locator('#certificatePrintButton').click();
   const example=await examplePromise;
   await example.saveAs(path.join(artifactDir,'demo-certificate.pdf'));
   const bytes=fs.readFileSync(path.join(artifactDir,'demo-certificate.pdf'));
   assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
   const exampleDoc=await pdfLib.PDFDocument.load(bytes);assert.equal(exampleDoc.getPageCount(),1);
   const raw=exampleDoc.getPages()[0].node.Contents().asArray().map(ref=>Buffer.from(pdfLib.decodePDFRawStream(exampleDoc.context.lookup(ref)).decode()).toString()).join('\n');
   assert.ok(raw.includes(Buffer.from('SIN VALIDEZ').toString('hex').toUpperCase()));
   assert.equal(await p.evaluate(()=>mockDownloads.length),0);
   await p.setViewportSize({width:390,height:900});
   await p.screenshot({path:path.join(artifactDir,'demo-registered-mobile.png')});
   await p.locator('#certificateDemoResetButton').click();
   assert.equal(await p.locator('#certificateForm [name=full_name]').inputValue(),'');
   assert.equal(await p.locator('#certificateForm').evaluate(e=>e.hidden),false);
   assert.equal(await p.evaluate(()=>mockWrites.length),0);assert.equal(await p.evaluate(()=>mockEmails.length),0);
  }else if(scenario==='logout'){
   await p.setViewportSize({width:390,height:900});await p.screenshot({path:path.join(artifactDir,'planne-login-blue.png')});
   await p.locator('#loginTab').click();assert.equal(await p.locator('#loginForm').evaluate(e=>e.hidden),false);
  }else {
   assert.equal(await p.locator('#certificateSummary').evaluate(e=>e.hidden),true);
   if(scenario==='missing-stage'){
    await p.evaluate(()=>location.hash='#etapa-d');await p.waitForSelector('.likert-form');
    for(const row of await p.locator('.likert-item').all())await row.locator('input').last().check();
    await p.getByRole('button',{name:'Enviar autoevaluación',exact:true}).click();
    await p.waitForSelector('#certificateDialog[open]');
   }
   if(scenario==='missing-final'){
    await p.getByRole('button',{name:'Realizar diagnóstico final',exact:true}).click();
    await p.locator('[name=managerName]').fill('Gestor de prueba');await p.locator('[name=institution]').fill('Institución de prueba');
    await p.locator('.diagnostic-start-form button').click();
    for(let i=0;i<30;i++){
     await p.locator('.diagnostic-option-card').first().click();
     await p.locator('.diagnostic-question-actions .primary-button').click();
    }
    await p.waitForSelector('#certificateDialog[open]');
   }
   if(scenario==='ordered'){
    assert.ok((await p.locator('#diagnosisContent').innerText()).includes('El segundo diagnóstico está pendiente'));
    assert.equal(await p.getByRole('button',{name:'Realizar diagnóstico final',exact:true}).count(),0);
    await p.evaluate(()=>location.hash='#modulo-dna');
    await p.waitForSelector('.diagnosis-detail-view');
    assert.equal(await p.locator('.diagnostic-start-form').count(),0);
    assert.ok((await p.locator('.diagnosis-detail-view').innerText()).includes('Segundo diagnóstico pendiente'));
    await p.getByRole('button',{name:'Continuar con las etapas',exact:true}).click();
    await p.evaluate(()=>location.hash='#etapa-d');await p.waitForSelector('.likert-form');
    for(const row of await p.locator('.likert-item').all())await row.locator('input').last().check();
    await p.getByRole('button',{name:'Enviar autoevaluación',exact:true}).click();
    await p.waitForSelector('.quiz-result-card');
    assert.equal(await p.locator('#certificateDialog').evaluate(d=>d.open),false);
    await p.getByRole('button',{name:'Realizar diagnóstico final',exact:true}).click();
    await p.locator('[name=managerName]').fill('Gestor de prueba');await p.locator('[name=institution]').fill('Institución de prueba');
    await p.locator('.diagnostic-start-form button').click();
    for(let i=0;i<30;i++){await p.locator('.diagnostic-option-card').first().click();await p.locator('.diagnostic-question-actions .primary-button').click();}
    await p.waitForSelector('#certificateDialog[open]');
   }
   if(scenario==='no-initial'){
    assert.equal(await p.locator('#stageGrid button:enabled').count(),0);
    await p.evaluate(()=>location.hash='#etapa-a');await p.waitForFunction(()=>location.hash==='#ruta');
    assert.equal(await p.locator('.evaluation-form').count(),0);
    await p.getByRole('button',{name:'Iniciar diagnóstico inicial',exact:true}).click();
    await p.locator('[name=managerName]').fill('Gestor de prueba');await p.locator('[name=institution]').fill('Institución de prueba');
    await p.locator('.diagnostic-start-form button').click();
    for(let i=0;i<30;i++){await p.locator('.diagnostic-option-card').first().click();await p.locator('.diagnostic-question-actions .primary-button').click();}
    await p.getByRole('button',{name:'Continuar con las etapas',exact:true}).click();
    assert.equal(await p.locator('#stageGrid button:enabled').count(),1);
    assert.equal(await p.getByRole('button',{name:'Realizar diagnóstico final',exact:true}).count(),0);
   }
  }
  await ctx.close();
 }
 // Optional backend failure must keep learning content and input available.
 const failed=await browser.newPage();failed.on('pageerror',e=>errors.push(e.message));
 await failed.addInitScript(()=>{window.certificateBackendFails=true;localStorage.setItem('planne:usage-guide-seen','true')});
 await failed.goto(origin);await failed.waitForSelector('#certificateDialog[open]');
 assert.equal(await failed.locator('#stageGrid .stage-card').count(),4);
 await failed.locator('#certificateForm [name=full_name]').fill('Conservar Nombre');await failed.locator('#certificateForm [name=national_id]').fill('123');await failed.locator('#certificateForm [name=email]').fill('nombre@example.com');
 await failed.locator('#certificateSubmitButton').click();await failed.waitForFunction(()=>document.querySelector('#certificateMessage').textContent.includes('No se pudo registrar'));
 assert.equal(await failed.locator('#certificateForm [name=full_name]').inputValue(),'Conservar Nombre');
 assert.deepEqual(errors,[]);assert.deepEqual(externals,[]);
 console.log('PASS Edge UI: actual app login/session boot, automatic closure, strict completion, form validation/double submit, server record recovery without popup/re-send, HTML/PDF, mobile/desktop, logout cleanup, demo isolation, optional-backend failure, no external requests.');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
