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
