// Backend snapshot of the existing instruments. No packages or network required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function catalog() {
  const context = {window:{}};
  const source = fs.readFileSync(path.join(root,'data.js'),'utf8')
    .replace('  rfanQuizzes.B = {','  window.legacyB = rfanQuizzes.B;\n  rfanQuizzes.B = {');
  vm.runInNewContext(source,context);
  const data = context.window.APP_DATA;
  const result = {DNA:{kind:'diagnostic',maximum:150,items:{}}};
  data.diagnosticItems.forEach(item=>{
    result.DNA.items[String(item.id)] = {options:Object.fromEntries(item.options.map(o=>[o.id,o.score]))};
  });
  function quizSpec(id,quiz) {
    if(quiz.type==='likert') {
      const items={};
      quiz.blocks.forEach(block=>block.items.forEach((item,index)=>{
        items[item.id || block.id+'-'+(index+1)]={block:block.id};
      }));
      return {kind:'likert',maximum:Object.keys(items).length*4,completionOnly:id==='B',items};
    }
    return {kind:'choice',maximum:quiz.questions.length,items:Object.fromEntries(quiz.questions.map((q,index)=>[
      q.id||id+(index+1),{options:Object.fromEntries(q.options.map((o,i)=>[o.id||String.fromCharCode(97+i),o.correct?1:0]))}
    ]))};
  }
  data.learningPath.stages.forEach(stage=>result[stage.id]=quizSpec(stage.id,stage.quiz));
  result['B-legacy']=quizSpec('B',context.window.legacyB);
  return JSON.parse(JSON.stringify(result));
}
module.exports={catalog};
if(require.main===module) {
  const file=path.join(root,'supabase/migrations/202611240002_certificate_automatic_completion.sql');
  const text=fs.readFileSync(file,'utf8');
  const generated='-- BEGIN GENERATED CATALOG\ninsert into public.certificate_instruments (instrument_key, definition) values\n'
    +Object.entries(catalog()).map(([key,value])=>`('${key}', $catalog$${JSON.stringify(value)}$catalog$::jsonb)`).join(',\n')+';\n-- END GENERATED CATALOG';
  const next=text.replace(/-- BEGIN GENERATED CATALOG[\s\S]*?-- END GENERATED CATALOG/,generated);
  if(process.argv.includes('--check')) {
    if(next!==text) {console.error('Catalog differs from data.js. Regenerate before deploying.');process.exitCode=1;}
    else console.log('Backend catalog matches data.js.');
  } else fs.writeFileSync(file,next,'utf8');
}
