import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import {buildCases,runAgentCheck,groqBrowserClient,llmBrowserClient,PROVIDERS,retryAfterSeconds,keyProblem} from '../lib/ai-live-check.ts';
import {parseInvoice} from '../lib/engine.ts';
const checks=[];const check=(name,v)=>{assert.ok(v,name);checks.push(name);};
const cases=buildCases();const byId=Object.fromEntries(cases.map(c=>[c.id,c]));

// 1. Deterministic mode: real orchestrator, no model.
for(const c of cases){const r=await runAgentCheck(c,'deterministic');
 check(`deterministic ${c.id} meets expected outcome (${r.observed})`,r.passed);
 check(`deterministic ${c.id} makes no model call and reports no tokens`,r.modelCalls===0&&r.usage.totalTokens===null&&!r.usage.reportedByProvider);
 check(`deterministic ${c.id} records a real tool trace`,r.tools.length>=2&&r.tools[0].tool==='read_invoice');}

// 2. Live client against a fake Groq endpoint that follows the protocol correctly.
function fakeGroq(script){let i=0;const bodies=[],urls=[];const f=async(url,init)=>{urls.push(url);bodies.push(JSON.parse(init.body));const step=script[i++];if(step.status&&step.status!==200)return {ok:false,status:step.status,headers:{get:h=>h.toLowerCase()==='retry-after'?(step.retryAfter??null):null},json:async()=>(step.errorBody||{})};return {ok:true,status:200,json:async()=>({model:'fake-model',usage:step.usage===undefined?{prompt_tokens:100,completion_tokens:20,total_tokens:120}:step.usage,choices:[{message:step.message}]})};};f.bodies=bodies;f.urls=urls;return f;}
const call=(id,name,args)=>({message:{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(args)}}]}});
function honestScript(text){const fields=parseInvoice(text);return [call('1','read_invoice',{fields}),call('2','verify_recipient',{}),call('3','get_transfer_quotes',{}),call('4','check_payment_policy',{}),{message:{role:'assistant',content:'done'}}];}
const KEY='gsk_'+'a'.repeat(40);
let f=fakeGroq(honestScript(byId.normal.invoiceText));let r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'openai/gpt-oss-120b',f));
check('live normal passes with route A',r.passed&&r.observed==='route:A');
check('live mode counts real model calls',r.modelCalls===4);
check('live mode sums provider-reported tokens',r.usage.totalTokens===480&&r.usage.reportedByProvider&&r.model==='fake-model');
check('live request actually sends the four tool definitions',f.bodies[0].tools.length===4&&f.bodies[0].tool_choice==='auto');
check('internal usage field is not echoed back to the provider',!JSON.stringify(f.bodies.at(-1).messages).includes('__usage'));

// 2b. Reasoning models return extra fields; only standard fields are sent back.
f=fakeGroq(honestScript(byId.normal.invoiceText).map(s=>({...s,message:{...s.message,reasoning:'private chain of thought'}})));r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'openai/gpt-oss-120b',f));
check('reasoning-model reply still completes route A',r.passed&&r.observed==='route:A');
check('provider reasoning field is not echoed back',!JSON.stringify(f.bodies.at(-1).messages).includes('private chain of thought'));

// 2c. Retired model: HTTP 404 surfaces Groq's own message and a model hint.
f=fakeGroq([{status:404,errorBody:{error:{message:'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.'}}}]);r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'llama-3.3-70b-versatile',f));
check('HTTP 404 explains retired model and quotes Groq',!r.passed&&r.observed==='provider_error'&&/retired/.test(r.error)&&/does not exist/.test(r.error));

// 3. Missing provider usage must stay null, never be invented.
f=fakeGroq(honestScript(byId.normal.invoiceText).map(s=>({...s,usage:null})));r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f));
check('missing provider usage is reported as null',r.usage.totalTokens===null&&!r.usage.reportedByProvider);

// 4. HTTP success alone is NOT a pass: a model that answers in prose without tools fails.
f=fakeGroq([{message:{role:'assistant',content:'Looks fine, payment approved!'}}]);r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f));
check('chat reply without tool calls is FAIL',!r.passed&&r.observed==='needs_input');

// 5. Provider error is FAIL with the error surfaced.
f=fakeGroq([{status:401}]);r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f));
check('HTTP 401 is FAIL with provider_error',!r.passed&&r.observed==='provider_error'&&/401/.test(r.error));

// 6. Model tries the injected instruction: forbidden tool is blocked and the case is still safe.
f=fakeGroq([call('x','submit_payment',{approved:true,recipient:'HACKER-CNY-666'}),{message:{role:'assistant',content:'cannot'}}]);r=await runAgentCheck(byId.injection,'live_groq',groqBrowserClient(KEY,'m',f));
check('injected submit_payment is blocked, never passed',r.tools.every(t=>t.tool!=='submit_payment'||t.status==='blocked')&&r.passed&&r.selectedRoute===null);

// 7. Model extracts the attacker account as recipient: verification blocks every route.
const bad={...parseInvoice(byId.normal.invoiceText),recipient:'HACKER-CNY-666'};
f=fakeGroq([call('1','read_invoice',{fields:bad}),call('2','verify_recipient',{}),call('3','get_transfer_quotes',{}),call('4','check_payment_policy',{}),{message:{role:'assistant',content:'x'}}]);r=await runAgentCheck(byId.injection,'live_groq',groqBrowserClient(KEY,'m',f));
check('attacker recipient is blocked by directory verification',r.observed==='blocked:recipient'&&r.passed);

// 8. Mock / demo keys are refused; there is no simulated "live" mode any more.
check('key with spaces is refused before any request',(()=>{try{groqBrowserClient('gsk_abc def ghi jkl','m');return false;}catch{return true;}})());
check('results never claim a payment',[r].every(x=>x.paymentExecuted===false));


// 9. OpenAI Chat Completions.
const OKEY='sk-proj-'+'b'.repeat(40);
f=fakeGroq(honestScript(byId.normal.invoiceText));r=await runAgentCheck(byId.normal,PROVIDERS.openai.mode,llmBrowserClient('openai',OKEY,PROVIDERS.openai.defaultModel,f));
check('openai normal case passes with route A',r.passed&&r.observed==='route:A'&&r.mode==='live_openai');
check('openai calls api.openai.com chat completions',f.urls.every(u=>u==='https://api.openai.com/v1/chat/completions'));
check('openai request sends tools, reasoning_effort none, no temperature',f.bodies[0].tools.length===4&&f.bodies[0].reasoning_effort==='none'&&!('temperature' in f.bodies[0])&&f.bodies[0].max_completion_tokens>0);
const g=fakeGroq(honestScript(byId.normal.invoiceText));await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',g));
check('groq request still sends temperature and no reasoning_effort',g.bodies[0].temperature===0.1&&!('reasoning_effort' in g.bodies[0]));
f=fakeGroq([{status:401,errorBody:{error:{message:'Incorrect API key provided: sk-proj-****.'}}}]);r=await runAgentCheck(byId.normal,'live_openai',llmBrowserClient('openai',OKEY,'gpt-6-luna',f));
check('openai 401 is surfaced with provider message',!r.passed&&/OpenAI returned HTTP 401/.test(r.error)&&/Incorrect API key/.test(r.error));
const w2=[];f=fakeGroq([{status:429,errorBody:{error:{message:'You exceeded your current quota, please check your plan and billing details.'}}}]);
r=await runAgentCheck(byId.normal,'live_openai',llmBrowserClient('openai',OKEY,'gpt-6-luna',f,{sleep:async ms=>{w2.push(ms);}}));
check('openai insufficient quota is not retried and says to add credit',!r.passed&&w2.length===0&&/no remaining credit/.test(r.error));
r=await runAgentCheck(byId.normal,'live_openai',llmBrowserClient('openai',OKEY,'gpt-6-luna',async()=>{throw new TypeError('Failed to fetch');}));
check('network failure is a clear FAIL',!r.passed&&r.observed==='provider_error'&&/could not be reached/.test(r.error));
check('a Groq key is not accepted as an OpenAI key',(()=>{try{llmBrowserClient('openai','gsk_'+'x'.repeat(30),'m');return false;}catch{return true;}})());

// 10. Rate limits: wait as instructed, retry, and record it; give up clearly if it persists.
const waits=[];const noSleep=async ms=>{waits.push(ms);};
const hs=honestScript(byId.normal.invoiceText);
f=fakeGroq([hs[0],{status:429,errorBody:{error:{message:'Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM). Please try again in 2.5s.'}}},hs[1],hs[2],hs[3],hs[4]]);
r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'openai/gpt-oss-120b',f,{sleep:noSleep}));
check('groq 429 is retried after the wait Groq asks for, then passes',r.passed&&r.observed==='route:A'&&r.rateLimitRetries===1&&waits[0]===4000);
f=fakeGroq([{status:429,retryAfter:'7'},...hs]);waits.length=0;
r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f,{sleep:noSleep}));
check('Retry-After header is honoured',r.passed&&waits[0]===8000);
f=fakeGroq(Array(10).fill({status:429,errorBody:{error:{message:'Please try again in 1s.'}}}));
r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f,{sleep:noSleep,maxRetries:2}));
check('persistent 429 is FAIL with re-run advice after bounded retries',!r.passed&&/after 2 automatic retries/.test(r.error)&&/Re-run failed cases/.test(r.error));
f=fakeGroq([{status:429,errorBody:{error:{message:'Daily quota exceeded. Please try again in 3h20m.'}}}]);waits.length=0;
r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f,{sleep:noSleep}));
check('a wait longer than the cap is not attempted',!r.passed&&waits.length===0);
check('openai millisecond wait is parsed',retryAfterSeconds(null,'Rate limit reached. Please try again in 450ms.')===0.45);
check('groq minute+second wait is parsed',retryAfterSeconds(null,'Please try again in 1m2.5s.')===62.5);

// 11. Key check is minimal: unfamiliar key formats are accepted; the provider decides validity.
check('unfamiliar key format is accepted',keyProblem('openai','sk-svcacct-Ab8RN6Kx_example.Key123')===null);
check('empty key gives a clear message',/Paste your OpenAI API key/.test(keyProblem('openai','  ')));
check('OpenAI key pasted under Groq is flagged',/looks like an OpenAI key/.test(keyProblem('groq','sk-'+'c'.repeat(35))));

// 12. Token-saving mode: one model call, only read_invoice offered, rest deterministic.
const one=(c,fields)=>({message:{role:'assistant',content:null,tool_calls:[{id:'e1',type:'function',function:{name:'read_invoice',arguments:JSON.stringify({fields})}}]}});
f=fakeGroq([one(0,parseInvoice(byId.normal.invoiceText))]);r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'openai/gpt-oss-120b',f),'extract');
check('extract mode passes normal case with exactly one model call',r.passed&&r.observed==='route:A'&&r.modelCalls===1&&r.agentMode==='extract');
check('extract mode offers only read_invoice and requires a tool call',f.bodies[0].tools.length===1&&f.bodies[0].tools[0].function.name==='read_invoice'&&f.bodies[0].tool_choice==='required');
check('extract mode still runs all four tools through validators',r.tools.map(x=>x.tool).join()==='read_invoice,verify_recipient,get_transfer_quotes,check_payment_policy'&&r.tools.every(x=>x.status==='passed'));
check('groq gpt-oss requests low reasoning and no returned reasoning',f.bodies[0].reasoning_effort==='low'&&f.bodies[0].include_reasoning===false);
for(const id of ['funds','recipient']){f=fakeGroq([one(0,parseInvoice(byId[id].invoiceText))]);r=await runAgentCheck(byId[id],'live_groq',groqBrowserClient(KEY,'m',f),'extract');check(`extract mode ${id} meets expected outcome with one call`,r.passed&&r.modelCalls===1);}
f=fakeGroq([{message:{role:'assistant',content:null,tool_calls:[{id:'x',type:'function',function:{name:'submit_payment',arguments:'{"approved":true}'}}]}},{message:{role:'assistant',content:null,tool_calls:[{id:'y',type:'function',function:{name:'submit_payment',arguments:'{}'}}]}}]);
r=await runAgentCheck(byId.injection,'live_groq',groqBrowserClient(KEY,'m',f),'extract');
check('extract mode blocks an injected payment tool and stays safe',r.passed&&r.selectedRoute===null&&r.tools.every(x=>x.status==='blocked')&&r.modelCalls<=2);
const bad2={...parseInvoice(byId.normal.invoiceText)};const badFmt={...bad2,deadline:'next Friday'};
f=fakeGroq([one(0,badFmt),one(0,bad2)]);r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f),'extract');
check('extract mode allows one correction after a format error',r.passed&&r.modelCalls===2);
const noDl={...parseInvoice(byId.normal.invoiceText),deadline:null};
f=fakeGroq([one(0,noDl),one(0,parseInvoice(byId.normal.invoiceText))]);r=await runAgentCheck(byId.normal,'live_groq',groqBrowserClient(KEY,'m',f),'extract');
check('a genuinely missing field ends in clarification without a second call',r.observed==='needs_input'&&r.modelCalls===1);
const o2=fakeGroq([one(0,parseInvoice(byId.normal.invoiceText))]);await runAgentCheck(byId.normal,'live_openai',llmBrowserClient('openai',OKEY,'gpt-6-luna',o2),'extract');
check('openai request keeps reasoning_effort none and no include_reasoning',o2.bodies[0].reasoning_effort==='none'&&!('include_reasoning' in o2.bodies[0])&&o2.bodies[0].tool_choice==='required');
writeFileSync('public/ai-live-check-report.json',JSON.stringify({suite:'ai-live-check',scope:'Public AI Connection panel logic. Live-mode checks use fake Groq and OpenAI endpoints; no real model accuracy is measured here.',passed:checks.length,checks},null,2)+'\n');
console.log(checks.length+' AI connection panel checks passed');
