// Browser-safe version of tests/live-groq-evaluation.mjs: runs the bounded agent on the 20 authored
// invoice layouts in tests/live-layout-cases.json and scores field extraction against ground truth.
import {orchestrate} from './agent';
import type {LLM,ProviderUsage} from './ai-live-check';

export type LayoutCase={id:string;layout:string;invoiceText:string;expectedFields:Record<string,string|number>;expectedAction:'complete'|'needs_input';missingField:string|null};
export type LayoutResult={
 id:string;layout:string;expectedAction:LayoutCase['expectedAction'];missingField:string|null;
 observedAction:'complete'|'needs_input'|'provider_error';passed:boolean;
 fieldMatches:Record<string,boolean>|null;fieldsCorrect:number|null;fieldsTotal:number|null;
 modelCalls:number;rateLimitRetries:number;elapsedMs:number;
 usage:{promptTokens:number|null;completionTokens:number|null;totalTokens:number|null};
 tools:{tool:string;status:string}[];error:string|null;
};

export async function runLayoutCase(c:LayoutCase,llm:LLM,deadline:string):Promise<LayoutResult>{
 const raw=c.invoiceText.split('{{DEADLINE}}').join(deadline);
 const expected:Record<string,string|number>={...c.expectedFields,deadline};
 const usage:ProviderUsage[]=[];let calls=0,retries=0;let result:any;let error:string|null=null;
 const start=Date.now();
 try{
  result=await orchestrate(raw,{balance:125000000,reserved:0},18000000,async(messages,tools)=>{
   calls++;const m=await llm(messages,tools);
   if(m?.__usage){usage.push(m.__usage);delete m.__usage;}
   if(typeof m?.__retries==='number'){retries+=m.__retries;delete m.__retries;}
   return m;
  });
 }catch(e){error=e instanceof Error?e.message:'Agent run failed';}
 const observedAction=error?'provider_error':result?.needsInput?'needs_input':'complete';
 const fieldMatches=c.expectedAction==='complete'?Object.fromEntries(Object.keys(expected).map(k=>[k,!result?.needsInput&&result?.invoice?.[k]===expected[k]])):null;
 const passed=!error&&(c.expectedAction==='needs_input'?result?.needsInput===true:!!fieldMatches&&Object.values(fieldMatches).every(Boolean));
 const sum=(k:'promptTokens'|'completionTokens'|'totalTokens')=>usage.length&&usage.every(u=>u[k]!=null)?usage.reduce((a,u)=>a+(u[k] as number),0):null;
 return {
  id:c.id,layout:c.layout,expectedAction:c.expectedAction,missingField:c.missingField,observedAction,passed,
  fieldMatches,fieldsCorrect:fieldMatches?Object.values(fieldMatches).filter(Boolean).length:null,fieldsTotal:fieldMatches?Object.keys(fieldMatches).length:null,
  modelCalls:calls,rateLimitRetries:retries,elapsedMs:Date.now()-start,
  usage:{promptTokens:sum('promptTokens'),completionTokens:sum('completionTokens'),totalTokens:sum('totalTokens')},
  tools:(result?.tools||[]).map((t:any)=>({tool:t.tool,status:t.status})),error,
 };
}

export function summarize(results:LayoutResult[]){
 const complete=results.filter(r=>r.expectedAction==='complete'),missing=results.filter(r=>r.expectedAction==='needs_input');
 const fc=complete.reduce((a,r)=>a+(r.fieldsCorrect??0),0),ft=complete.reduce((a,r)=>a+(r.fieldsTotal??0),0);
 return {
  total:results.length,passed:results.filter(r=>r.passed).length,
  extractionPassed:complete.filter(r=>r.passed).length,extractionTotal:complete.length,
  clarificationPassed:missing.filter(r=>r.passed).length,clarificationTotal:missing.length,
  fieldsCorrect:fc,fieldsTotal:ft,providerErrors:results.filter(r=>r.observedAction==='provider_error').length,
 };
}
