import {db,owner,wallet,protect,fail,sha} from '../../../lib/server';
import {queryProvider} from '../../../lib/provider-server';
import {compareReceipt} from '../../../lib/provider';
export async function POST(req:Request){try{
 protect(req);const id=owner(req);const body:any=await req.json();const row:any=await db().prepare('SELECT * FROM transactions WHERE id=? AND owner=?').bind(body.transactionId,id).first();if(!row)throw new Error('Transaction not found.');const account=await wallet(id);if(row.generation!==account.generation)throw new Error('This transaction belongs to an earlier demo session.');
 if(['SETTLED','REJECTED'].includes(row.status))return Response.json({ok:true,reused:true,status:row.status});
 const receipt=await queryProvider(row.id,id,account.generation);const data=JSON.parse(row.data);const comparison=compareReceipt(receipt,data);const now=new Date().toISOString();
 data.providerReceipt=receipt;data.reconciliation={...comparison,checkedAt:now,receiptHash:await sha(JSON.stringify(receipt))};
 data.trace.push({step:'query_provider_status',status:'passed',detail:`Read provider ledger ${receipt.providerReference}; provider status ${receipt.status}.`},{step:'compare_receipt',status:comparison.status==='SETTLED'?'passed':comparison.status==='REJECTED'?'rejected':'waiting',detail:comparison.action+(comparison.differences.length?' '+comparison.differences.join('; '):'')});
 const terminal=['SETTLED','REJECTED'].includes(comparison.status);const database=db();
 const validStates="status IN ('SUBMITTED','UNKNOWN','PENDING','REVIEW_REQUIRED')";
 if(terminal){const settled=comparison.status==='SETTLED';await database.batch([
  database.prepare(`UPDATE accounts SET balance=balance-?,reserved=reserved-? WHERE owner=? AND generation=? AND EXISTS (SELECT 1 FROM transactions WHERE id=? AND ${validStates})`).bind(settled?row.debit:0,row.debit,id,account.generation,row.id),
  database.prepare(`UPDATE transactions SET status=?,settled_at=?,data=? WHERE id=? AND owner=? AND generation=? AND ${validStates} AND EXISTS (SELECT 1 FROM accounts WHERE owner=transactions.owner AND generation=transactions.generation)`).bind(comparison.status,settled?now:null,JSON.stringify(data),row.id,id,account.generation)
 ]);}else await database.prepare(`UPDATE transactions SET status=?,data=? WHERE id=? AND owner=? AND generation=? AND ${validStates} AND EXISTS (SELECT 1 FROM accounts WHERE owner=transactions.owner AND generation=transactions.generation)`).bind(comparison.status,JSON.stringify(data),row.id,id,account.generation).run();
 const persisted:any=await database.prepare('SELECT status,data FROM transactions WHERE id=? AND owner=? AND generation=? AND EXISTS (SELECT 1 FROM accounts WHERE owner=transactions.owner AND generation=transactions.generation)').bind(row.id,id,account.generation).first();
 if(!persisted)throw new Error('The sandbox changed during reconciliation. Refresh the account; this operation did not confirm settlement.');
 const saved=JSON.parse(persisted.data).reconciliation;
 return Response.json({ok:true,status:persisted.status,action:saved?.action||comparison.action,differences:saved?.differences||[]});
 }catch(e){return fail(e);}}
