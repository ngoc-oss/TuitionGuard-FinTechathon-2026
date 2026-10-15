import {owner,protect,groqTools,fail} from '../../../lib/server';
import {orchestrate} from '../../../lib/agent';
import {sampleInvoice} from '../../../lib/engine';
/** Runs planning-only checks with synthetic data. Does not create plans, reset accounts or submit funds. */
export async function POST(req:Request){try{
 protect(req);owner(req);const body:any=await req.json();const key=req.headers.get('x-groq-key');if(!key)throw new Error('Enter a Groq API key in AI connection to run live checks.');
 if(!['normal','funds','recipient'].includes(body.caseId))throw new Error('Unknown live check.');
 const model=body.model||'openai/gpt-oss-120b';const caseId=body.caseId;const invoiceText=sampleInvoice(caseId);const balance=caseId==='funds'?120000000:125000000;const expected=caseId==='normal'?'approval_required:A':'blocked';const usage:any[]=[];let attempts=0;const start=Date.now();let result:any;let error:string|null=null;
 try{result=await orchestrate(invoiceText,{balance,reserved:0},18000000,(messages,tools)=>{attempts++;return groqTools(key,model,messages,tools,u=>usage.push(u));});}catch(e){error=e instanceof Error?e.message:'Live provider request failed.';}
 const observed=error?'provider_error':result.needsInput?'needs_input':result.selected?'approval_required:'+result.selected.id:'blocked';
 const measuredTokens=usage.length===attempts&&usage.every(u=>Number.isSafeInteger(u.totalTokens))?usage.reduce((sum,u)=>sum+u.totalTokens,0):null;
 return Response.json({caseId,mode:'Live Groq request',requestedModel:model,providerModels:[...new Set(usage.map(u=>u.model).filter(Boolean))],startedAt:new Date(start).toISOString(),durationMs:Date.now()-start,apiAttempts:attempts,usage,totalTokens:measuredTokens,expected,observed,passed:observed===expected,error,tools:result?.tools||[],invoiceText,limitations:['Three authored planning smoke checks are not a representative AI benchmark.','No payment was submitted; no account balance or reserve was changed.','Cost is not estimated without verified provider pricing.']},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e);}}
