import {db,owner,wallet,protect,fail} from '../../../lib/server';
import {evaluate} from '../../../lib/engine';
import type {Plan} from '../../../lib/engine';
import {issueReceipt,SCENARIOS} from '../../../lib/provider';
import type {Scenario} from '../../../lib/provider';
export async function POST(req:Request){try{
 protect(req);const id=owner(req);const body:any=await req.json();if(body.approved!==true)throw new Error('Explicit approval is required.');
 const row:any=await db().prepare('SELECT * FROM plans WHERE id=? AND owner=?').bind(body.planId,id).first();if(!row)throw new Error('Payment plan not found.');
 const plan:Plan=JSON.parse(row.data);if(body.hash!==row.hash)throw new Error('The approved terms were altered. Analyze again.');
 const existing:any=await db().prepare('SELECT id,status FROM transactions WHERE owner=? AND plan_id=?').bind(id,plan.id).first();if(existing)return Response.json({transaction:existing,reused:true});
 if(Date.now()>=row.expires_at)throw new Error('This quote expired. Analyze again and approve the new terms.');
 const account=await wallet(id);if(account.generation!==plan.generation)throw new Error('The sandbox was reset. Analyze again.');
 const invoicePayment:any=await db().prepare('SELECT id,status FROM transactions WHERE owner=? AND generation=? AND invoice_key=?').bind(id,account.generation,plan.invoice.invoiceId).first();if(invoicePayment)return Response.json({transaction:invoicePayment,reused:true});
 if(account.reserve!==plan.reserve)throw new Error('The protected reserve changed. Analyze and approve again.');
 if(!plan.selected)throw new Error('This plan has no eligible route.');
 const current=evaluate(plan.invoice,account.balance,account.reserved,account.reserve);const q=current.quotes.find(q=>q.id===plan.selected!.id);
 if(!q?.eligible||q.debit!==plan.selected.debit||q.remaining!==plan.selected.remaining)throw new Error('Account or deadline constraints changed. Analyze again.');
 const scenario:Scenario=body.simulateTimeout?'timeout':(body.providerScenario||'normal');if(!SCENARIOS.includes(scenario))throw new Error('Unknown provider sandbox scenario.');
 const transaction={id:crypto.randomUUID(),planId:plan.id,invoice:plan.invoice,quote:plan.selected,approval:{hash:plan.hash,approvedAt:new Date().toISOString()},trace:[...plan.trace,{step:'Student approval',status:'passed',detail:'Authenticated approval is bound to this exact plan hash.'},{step:'Reserve sandbox funds',status:'passed',detail:'Funds reserved atomically; duplicate invoice constraint enforced.'},{step:'Submit sandbox transfer',status:scenario==='timeout'?'unknown':'submitted',detail:scenario==='timeout'?'Simulated timeout after provider acceptance. Reconcile this existing transaction; do not submit a second one.':'Sandbox provider accepted the request. Settlement is not yet confirmed.'}]};
 try{const database=db();const providerReceipt=issueReceipt(transaction.id,plan.invoice,plan.selected,scenario);await database.batch([
 database.prepare("INSERT INTO transactions (id,owner,generation,invoice_key,plan_id,data,debit,status,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM accounts WHERE owner=? AND generation=? AND reserve=? AND balance-reserved-?>=reserve AND balance-reserved=?) AND EXISTS (SELECT 1 FROM plans WHERE id=? AND expires_at>?)").bind(transaction.id,id,account.generation,plan.invoice.invoiceId,plan.id,JSON.stringify(transaction),plan.selected.debit,scenario==='timeout'?'UNKNOWN':'SUBMITTED',new Date().toISOString(),id,account.generation,plan.reserve,plan.selected.debit,plan.selected.remaining+plan.selected.debit,plan.id,Date.now()),
 database.prepare('INSERT INTO provider_ledger (id,owner,generation,scenario,status,polls,data,created_at) SELECT ?,?,?,?,?,0,?,? WHERE EXISTS (SELECT 1 FROM transactions WHERE id=?)').bind(transaction.id,id,account.generation,scenario,providerReceipt.status,JSON.stringify(providerReceipt),providerReceipt.issuedAt,transaction.id),
 database.prepare('UPDATE accounts SET reserved=reserved+? WHERE owner=? AND generation=? AND EXISTS (SELECT 1 FROM transactions WHERE id=?)').bind(plan.selected.debit,id,account.generation,transaction.id)
 ]);const inserted=await database.prepare('SELECT id FROM transactions WHERE id=?').bind(transaction.id).first();if(!inserted)throw new Error('Constraints changed.');}
 catch{const duplicate:any=await db().prepare('SELECT id,status FROM transactions WHERE owner=? AND generation=? AND invoice_key=?').bind(id,account.generation,plan.invoice.invoiceId).first();if(duplicate)return Response.json({transaction:duplicate,reused:true});throw new Error('Funds, reserve or quote validity changed. Analyze again.');}
 return Response.json({transaction:{id:transaction.id,status:scenario==='timeout'?'UNKNOWN':'SUBMITTED'}});
 }catch(e){return fail(e);}}
