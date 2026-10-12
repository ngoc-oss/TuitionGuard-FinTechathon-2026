import {db,owner,wallet,protect,sha,groqTools,fail} from '../../../lib/server';
import {orchestrate} from '../../../lib/agent';
import {explain} from '../../../lib/engine';
import type {Plan} from '../../../lib/engine';
export async function POST(req:Request){try{
 protect(req);const id=owner(req);const body:any=await req.json();if(typeof body.invoiceText!=='string'||body.invoiceText.length>16000)throw new Error('Use an invoice with at most 16,000 characters.');
 const account=await wallet(id);const reserve=Number(body.reserve);if(!Number.isSafeInteger(reserve)||reserve<0||reserve>1000000000)throw new Error('Reserve must be a non-negative whole VND amount.');
 const key=req.headers.get('x-groq-key')||'';const result=await orchestrate(body.invoiceText,account,reserve,key?(messages,tools)=>groqTools(key,body.model||'llama-3.3-70b-versatile',messages,tools):undefined);
 if(result.needsInput)return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 const invoice=result.invoice!;const now=Date.now();
 await db().prepare('UPDATE accounts SET reserve=? WHERE owner=? AND generation=?').bind(reserve,id,account.generation).run();
 const already=await db().prepare('SELECT id FROM transactions WHERE owner=? AND generation=? AND invoice_key=?').bind(id,account.generation,invoice.invoiceId).first();
 if(already){result.selected=null;result.quotes=result.quotes!.map(q=>({...q,eligible:false,reasons:[...q.reasons,'This invoice already has a payment in this sandbox session.']}));result.trace!.push({step:'Duplicate invoice check',status:'blocked',detail:'Reconcile the existing payment; do not pay again.'});result.nextActions=['Open the existing receipt and reconcile it. Do not submit this invoice again.'];}
 const plan:Plan={id:crypto.randomUUID(),invoice,quotes:result.quotes!,selected:result.selected!,trace:result.trace!,tools:result.tools,nextActions:result.nextActions,hash:'',expiresAt:now+300000,generation:account.generation,reserve,mode:result.mode,explanation:''};
 plan.explanation=explain(plan);plan.hash=await sha(JSON.stringify({invoice,selected:plan.selected,reserve,expiresAt:plan.expiresAt,generation:plan.generation}));
 await db().prepare('INSERT INTO plans (id,owner,generation,invoice_key,data,hash,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(plan.id,id,account.generation,invoice.invoiceId,JSON.stringify(plan),plan.hash,plan.expiresAt,new Date().toISOString()).run();
 return Response.json({plan},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e);}}
