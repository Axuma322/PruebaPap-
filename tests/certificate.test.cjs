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

test('printable certificate escapes personal data and uses the recorded date', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase/functions/_shared/certificate-template.js'), 'utf8'), context);
  const html = context.PLANNECertificateTemplate.render({full_name:'<script>alert(1)</script>',
    national_id:'<img src=x>',certificate_code:'PLANNE-123',completion_date:'2026-11-24T02:00:00Z'},
    {institution:'Institución & comunidad'});
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Institución &amp; comunidad'));
  assert.ok(html.includes('23 de noviembre de 2026'));
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('PLANNE-123'));
});

test('demonstration certificate is clearly marked', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase/functions/_shared/certificate-template.js'), 'utf8'), context);
  assert.ok(context.PLANNECertificateTemplate.render({demo:true,completion_date:'2026-11-24'}).includes('sin validez'));
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

test('all participant and configurable strings remain text, not HTML or public links', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase/functions/_shared/certificate-template.js'), 'utf8'), context);
  const payload = `"><img src="https://evil.invalid" onerror='alert(1)'>&`;
  const config = Object.fromEntries(['institution','certificateTitle','certificateText','programName','signatureLabel'].map(key=>[key,payload]));
  const html = context.PLANNECertificateTemplate.render({full_name:payload,national_id:payload,
    certificate_code:payload,email:'private@example.com',completion_date:'2026-11-24'}, config);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('src="https://evil.invalid"'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&#39;'));
  assert.ok(html.includes('&amp;'));
  assert.ok(!html.includes('private@example.com'));
  assert.ok(!/<a\b|href=/.test(html));
});
