/** Independent sandbox provider contract. No real money or real bank calls. */
export const SCENARIOS=['normal','timeout','pending','rejected','amount_mismatch','recipient_mismatch'] as const;
export type Scenario=typeof SCENARIOS[number];
export type ProviderReceipt={providerReference:string;invoiceId:string;studentReference:string;recipient:string;currency:string;amount:number;debit:number;provider:string;status:'PENDING'|'SETTLED'|'REJECTED';issuedAt:string;issuer:'TuitionGuard sandbox provider';scenario:Scenario};
export function issueReceipt(reference:string,invoice:{invoiceId:string;studentReference:string;recipient:string;currency:string;amount:number},quote:{debit:number;id:string},scenario:Scenario,now=new Date().toISOString()):ProviderReceipt{
 return {providerReference:reference,invoiceId:invoice.invoiceId,studentReference:invoice.studentReference,recipient:scenario==='recipient_mismatch'?'WRONG-SANDBOX-ACCOUNT':invoice.recipient,currency:invoice.currency,amount:scenario==='amount_mismatch'?invoice.amount-1:invoice.amount,debit:quote.debit,provider:quote.id,status:scenario==='pending'?'PENDING':scenario==='rejected'?'REJECTED':'SETTLED',issuedAt:now,issuer:'TuitionGuard sandbox provider',scenario};
}
export function compareReceipt(receipt:ProviderReceipt,expected:{id:string;invoice:any;quote:any}){
 const differences:string[]=[];
 if(!receipt||typeof receipt!=='object')return {status:'REVIEW_REQUIRED',differences:['Missing or invalid provider receipt'],action:'Keep funds reserved until a valid provider receipt is available.'};
 if(!['PENDING','SETTLED','REJECTED'].includes(receipt.status))differences.push('Unknown or missing provider status');
 if(receipt.issuer!=='TuitionGuard sandbox provider')differences.push('Unknown receipt issuer');
 if(typeof receipt.issuedAt!=='string'||!Number.isFinite(Date.parse(receipt.issuedAt)))differences.push('Invalid receipt timestamp');
 for(const [field,wanted] of Object.entries({providerReference:expected.id,invoiceId:expected.invoice.invoiceId,studentReference:expected.invoice.studentReference,recipient:expected.invoice.recipient,currency:expected.invoice.currency,amount:expected.invoice.amount,debit:expected.quote.debit,provider:expected.quote.id}))if((receipt as any)[field]!==wanted)differences.push(`${field} does not match approved terms`);
 if(differences.length)return {status:'REVIEW_REQUIRED',differences,action:'Keep funds reserved. Investigate the provider receipt; never submit another transfer.'};
 if(receipt.status==='PENDING')return {status:'PENDING',differences,action:'Provider is still processing. Check this transaction again; do not resubmit.'};
 if(receipt.status==='REJECTED')return {status:'REJECTED',differences,action:'Provider rejected the transfer. Release the reservation without debiting the account.'};
 return {status:'SETTLED',differences,action:'Receipt matches every approved field. Settle the debit exactly once.'};
}
