import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {runLayoutCase,summarize} from '../lib/layout-eval.ts';
const checks=[];const check=(name,v)=>{assert.ok(v,name);checks.push(name);};
const {cases}=JSON.parse(readFileSync('tests/live-layout-cases.json','utf8'));
const deadline=new Date(Date.now()+48*3600000).toISOString();
// Fake model that behaves like a correct agent: extracts the ground-truth fields (null for the missing one).
function honestModel(c,mutate){let step=0;const names=['read_invoice','verify_recipient','get_transfer_quotes','check_payment_policy'];
 return async()=>{if(step>=4)return {role:'assistant',content:'done'};const name=names[step++];
  let args={};if(name==='read_invoice'){const f={...c.expectedFields,deadline};if(c.missingField)f[c.missingField]=null;args={fields:mutate?mutate(f):f};}
  return {role:'assistant',content:null,tool_calls:[{id:'t'+step,type:'function',function:{name,arguments:JSON.stringify(args)}}],__usage:{promptTokens:50,completionTokens:10,totalTokens:60,model:'fake'}};};}
check('dataset has 20 cases (18 complete, 2 needs_input)',cases.length===20&&cases.filter(c=>c.expectedAction==='needs_input').length===2);
const results=[];for(const c of cases)results.push(await runLayoutCase(c,honestModel(c),deadline));
const sm=summarize(results);
check('a correct agent scores 20/20',sm.passed===20&&sm.extractionPassed===18&&sm.clarificationPassed===2&&sm.fieldsCorrect===sm.fieldsTotal&&sm.fieldsTotal===126);
check('missing-field invoices end in needs_input, not a guess',results.filter(r=>r.expectedAction==='needs_input').every(r=>r.observedAction==='needs_input'));
check('tokens and calls are counted per invoice',results.every(r=>r.modelCalls>=1&&r.usage.totalTokens!=null));
const c1=cases.find(c=>c.expectedAction==='complete');
let r=await runLayoutCase(c1,honestModel(c1,f=>({...f,amount:f.amount+1})),deadline);
check('a wrong amount is FAIL with the field identified',!r.passed&&r.fieldMatches&&r.fieldMatches.amount===false&&r.fieldsCorrect===6);
const c19=cases.find(c=>c.missingField==='deadline');
r=await runLayoutCase(c19,honestModel(c19,f=>({...f,deadline})),deadline);
check('inventing a missing deadline is FAIL',!r.passed&&r.observedAction==='complete');
r=await runLayoutCase(c1,async()=>{throw new Error('HTTP 429');},deadline);
check('provider error is FAIL and counted separately',!r.passed&&r.observedAction==='provider_error'&&summarize([r]).providerErrors===1);
r=await runLayoutCase(c1,async()=>({role:'assistant',content:'Here are the fields: ...'}),deadline);
check('a prose answer without tool calls is FAIL',!r.passed&&r.observedAction==='needs_input');
writeFileSync('public/layout-eval-report.json',JSON.stringify({suite:'layout-eval',scope:'Scoring logic for the 20-invoice live test, exercised with fake models. Not a live model result.',passed:checks.length,checks},null,2)+'\n');
console.log(checks.length+' 20-invoice evaluation checks passed');
