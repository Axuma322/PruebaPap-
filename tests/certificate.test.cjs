const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function loadCertificates() {
  const context = {window: { APP_DATA: {certificate: {}} }, document: {addEventListener() {}}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'certificate.js'), 'utf8'), context);
  return context.window.PLANNECertificates;
}
const complete = () => ({user: {id: 'participant'}, ready: true, demo: false,
  diagnosticAttempts: [{attemptType: 'initial'}, {attemptType: 'final'}], completedStages: ['A','B','C','D']});

test('certificate requires a real loaded session, both DNA attempts and every stage', () => {
  const certificates = loadCertificates();
  assert.equal(certificates.isEligible(complete()), true);
  for (const override of [{user:null}, {ready:false}, {demo:true},
    {diagnosticAttempts:[{attemptType:'initial'}]}, {diagnosticAttempts:[{attemptType:'final'}]}]) {
    assert.equal(certificates.isEligible({...complete(), ...override}), false);
  }
  for (const id of ['A','B','C','D']) {
    const state = complete(); state.completedStages = state.completedStages.filter(x=>x!==id);
    assert.equal(certificates.isEligible(state), false);
  }
});

test('email greeting escapes personal data and announces the actual PDF attachment', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase/functions/_shared/certificate-pdf.js'), 'utf8'), context);
  const html = context.PLANNECertificatePDF.emailMessage({full_name:'<script>alert(1)</script>',certificate_code:'PLANNE-123'});
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Certificado_PLANNE.pdf'));
  assert.ok(html.includes('no constituye una acreditación oficial'));
  assert.ok(html.includes('PLANNE-123'));
});

test('PDF renderer is shared with demo without needing a backend', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase/functions/_shared/certificate-pdf.js'), 'utf8'), context);
  assert.equal(typeof context.PLANNECertificatePDF.render,'function');
  assert.equal(context.PLANNECertificatePDF.escape('"<&'), '&quot;&lt;&amp;');
});

test('legacy default initial cannot hide an explicit final and chronology cannot invent a final', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const fn = app.slice(app.indexOf('  function normalizeDiagnosticAttempt('), app.indexOf('  async function loadDiagnosticAttempts('));
  const context = {normalizeDiagnosticAnswers: value=>value, Date};
  vm.runInNewContext(fn, context);
  const normalize = context.normalizeDiagnosticAttempt;
  assert.equal(normalize({attempt_type:'initial', answers:{attemptType:'final'}}).attemptType, 'final');
  assert.equal(normalize({attempt_type:'final', answers:{attemptType:'initial'}}).attemptType, 'initial');
  assert.equal(normalize({attempt_type:'final', answers:{}}).attemptType, 'final');
  assert.equal(normalize({attempt_type:null, answers:{}}).attemptType, 'unknown');
  const rows = [0,1].map(()=>({attempt_type:'initial',answers:{}})).map(normalize);
  assert.ok(rows.every(r=>r.attemptType==='initial'));
});

test('participant strings in email remain escaped text, not HTML or public links', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase/functions/_shared/certificate-pdf.js'), 'utf8'), context);
  const payload = `"><img src="https://evil.invalid" onerror='alert(1)'>&`;
  const html = context.PLANNECertificatePDF.emailMessage({full_name:payload,national_id:payload,
    certificate_code:payload,email:'private@example.com',completion_date:'2026-11-24'});
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('src="https://evil.invalid"'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&#39;'));
  assert.ok(html.includes('&amp;'));
  assert.ok(!html.includes('private@example.com'));
  assert.ok(!/<a\b|href=/.test(html));
});

test('required order is initial DNA, all four stages, final DNA; demo stays free', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const functions=app.slice(app.indexOf('  function getNextDiagnosticAttemptType('),app.indexOf('  function getDiagnosticAttemptLabel('));
  const state={demo:false,initial:false,final:false,stages:[]};
  const context={isDemoMode:()=>state.demo,isDiagnosticCompleted:()=>state.initial,
    getDiagnosticAttemptByType:type=>state[type]?{}:null,
    getLearningProgressForRender:()=>({completedStages:state.stages}),
    isStageCompleted:(id,progress)=>progress.completedStages.includes(id)};
  vm.runInNewContext(functions,context);
  assert.equal(context.getNextDiagnosticAttemptType(),'initial');
  state.initial=true;assert.equal(context.getNextDiagnosticAttemptType(),null);assert.equal(context.isFinalDiagnosticLocked(),true);
  state.stages=['D'];assert.equal(context.getNextDiagnosticAttemptType(),null);
  state.stages=['A','B','C'];assert.equal(context.getNextDiagnosticAttemptType(),null);
  state.stages.push('D');assert.equal(context.getNextDiagnosticAttemptType(),'final');assert.equal(context.isFinalDiagnosticLocked(),false);
  state.final=true;assert.equal(context.getNextDiagnosticAttemptType(),null);
  state.demo=true;state.stages=[];assert.equal(context.getNextDiagnosticAttemptType(),'demo');
});
