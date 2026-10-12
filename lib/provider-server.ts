import {db} from './server';
import type {ProviderReceipt} from './provider';
/** Reads only the provider's separate ledger; never constructs a receipt from transaction data. */
export async function queryProvider(id:string,owner:string,generation:string){
 const database=db();const row:any=await database.prepare('SELECT * FROM provider_ledger WHERE id=? AND owner=? AND generation=?').bind(id,owner,generation).first();
 if(!row)throw new Error('Provider receipt unavailable. Keep funds reserved and retry reconciliation.');
 if(row.scenario==='pending'&&row.status==='PENDING'){
  await database.prepare("UPDATE provider_ledger SET polls=polls+1,status=CASE WHEN polls>=1 THEN 'SETTLED' ELSE 'PENDING' END WHERE id=? AND owner=? AND generation=? AND status='PENDING'").bind(id,owner,generation).run();
 }
 const fresh:any=await database.prepare('SELECT * FROM provider_ledger WHERE id=? AND owner=? AND generation=?').bind(id,owner,generation).first();
 const receipt:ProviderReceipt={...JSON.parse(fresh.data),status:fresh.status};return receipt;
}
