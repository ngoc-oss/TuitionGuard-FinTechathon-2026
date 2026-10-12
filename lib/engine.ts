export const UNIVERSITY={name:'Demo International University',account:'UNIVERSITY-CNY-001',version:1};
export type Invoice={invoiceId:string;studentReference:string;institution:string;amount:number;currency:string;recipient:string;deadline:string};
export type Quote={id:string;name:string;rate:number;bps:number;fixed:number;hours:number;debit:number;fee:number;remaining:number;eligible:boolean;reasons:string[]};
export type ToolEvent={tool:string;startedAt:string;durationMs:number;input:unknown;output:unknown;status:string};
export type Plan={id:string;invoice:Invoice;quotes:Quote[];selected:Quote|null;hash:string;expiresAt:number;generation:string;reserve:number;trace:{step:string;status:string;detail:string}[];mode:string;explanation:string;tools?:ToolEvent[];nextActions?:string[]};
export function sampleInvoice(scenario='normal'){
 return `Institution: ${UNIVERSITY.name}\nInvoice ID: TG-2026-001\nStudent reference: STU-0086\nTuition amount: 30000 CNY\nRecipient account: ${scenario==='recipient'?'UNVERIFIED-CNY-999':UNIVERSITY.account}\nDeadline: ${new Date(Date.now()+48*3600000).toISOString()}`;
}
export function parseInvoice(input:string):Invoice{
 let obj:any={};
 if(typeof input!=='string'||input.length>16000)throw new Error('Invoice text is invalid or too long.');
 if(input.trim().startsWith('{')){try{obj=JSON.parse(input);}catch{throw new Error('The invoice JSON is invalid.');}
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('Invoice JSON must be an object.');
  for(const key of ['invoiceId','studentReference','institution','amount','currency','recipient','deadline'])if((input.match(new RegExp('\"'+key+'\"\\s*:', 'g'))||[]).length>1)throw new Error('Ambiguous invoice: duplicate JSON field '+key+'.');}
 else{
  for(const label of ['Institution','Invoice ID','Student reference','Recipient account','Deadline','Tuition amount'])if((input.match(new RegExp('^'+label+'\\s*:', 'gim'))||[]).length>1)throw new Error('Ambiguous invoice: duplicate '+label+'.');
  const line=(label:string)=>input.match(new RegExp('^'+label+'\\s*:\\s*(.+)$','im'))?.[1]?.trim();
  const moneyLines=input.match(/^[ \t]*(?:Tuition amount|Amount)[ \t]*:[^\r\n]*$/gim)||[];
  if(moneyLines.length>1)throw new Error('Ambiguous invoice: multiple amount fields.');
  const money=moneyLines[0]?.match(/^[ \t]*(?:Tuition amount|Amount)[ \t]*:[ \t]*((?:\d+|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?)[ \t]+([A-Z]{3})[ \t]*$/i);
  if(moneyLines.length&&!money)throw new Error('Invalid amount format. Use 30000 CNY or 30,000.00 CNY.');
  obj={invoiceId:line('Invoice ID'),studentReference:line('Student reference'),institution:line('Institution'),amount:money?Number(money[1].replace(/,/g,'')):null,currency:money?.[2]?.toUpperCase(),recipient:line('Recipient account'),deadline:line('Deadline')};
 }
 const missing=['invoiceId','studentReference','institution','amount','currency','recipient','deadline'].filter(k=>obj[k]==null||obj[k]==='');
 if(missing.length)throw new Error('Please provide these invoice fields: '+missing.join(', ')+'. Use the editable example format or connect AI for varied layouts.');
 if(typeof obj.amount!=='number'||!Number.isFinite(obj.amount)||obj.amount<=0||obj.amount>1000000||Math.abs(obj.amount*100-Math.round(obj.amount*100))>0.00001)throw new Error('Tuition amount must be positive, at most 1,000,000 and have at most two decimals.');
 if(!validDeadline(obj.deadline))throw new Error('Enter a real calendar date as an ISO timestamp with an explicit time zone.');
 for(const k of ['invoiceId','studentReference','institution','currency','recipient']){if(typeof obj[k]!=='string'||!obj[k].trim()||obj[k].length>180)throw new Error('An invoice field is invalid.');}
 return {invoiceId:obj.invoiceId.trim(),studentReference:obj.studentReference.trim(),institution:obj.institution.trim(),amount:obj.amount,currency:obj.currency.trim().toUpperCase(),recipient:obj.recipient.trim(),deadline:new Date(obj.deadline).toISOString()};
}
export function validDeadline(value:unknown):value is string{
 if(typeof value!=='string')return false;
 const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);if(!m)return false;
 const [,year,month,day,hour,minute,second,zone]=m;const y=Number(year),mo=Number(month),d=Number(day);
 if(y<2000||y>2100||mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate()||Number(hour)>23||Number(minute)>59||Number(second)>59)return false;
 if(zone!=='Z'){const [h,min]=zone.slice(1).split(':').map(Number);if(h>14||min>59||(h===14&&min!==0))return false;}
 return Number.isFinite(Date.parse(value));
}
export function calculate(amount:number,rate:number,bps:number,fixed:number){
 const cents=BigInt(Math.round(amount*100));const raw=cents*BigInt(rate)*BigInt(10000+bps);
 const debit=Number((raw+500000n)/1000000n)+fixed;
 const principal=Number((cents*BigInt(rate)+50n)/100n);
 return {debit,fee:debit-principal};
}
export function evaluate(invoice:Invoice,balance:number,reserved:number,reserve:number,now=Date.now()):{quotes:Quote[],selected:Quote|null,trace:Plan['trace']} {
 const verified=invoice.recipient===UNIVERSITY.account&&invoice.institution===UNIVERSITY.name;
 const configs=[{id:'A',name:'Campus Transfer',rate:3500,bps:50,fixed:100000,hours:24},{id:'B',name:'Economy Remit',rate:3480,bps:20,fixed:250000,hours:72},{id:'C',name:'Express Tuition',rate:3520,bps:0,fixed:50000,hours:24}];
 const quotes=configs.map(q=>{
  const {debit,fee}=calculate(invoice.amount,q.rate,q.bps,q.fixed);const remaining=balance-reserved-debit;const reasons:string[]=[];
  if(!verified)reasons.push('Recipient does not match the verified university directory.');
  if(invoice.currency!=='CNY')reasons.push('This sandbox supports tuition in CNY only.');
  if(now+q.hours*3600000>Date.parse(invoice.deadline))reasons.push('Arrival would be after the tuition deadline.');
  if(remaining<reserve)reasons.push(`Living-expense reserve would be short by ${Math.max(0,reserve-remaining).toLocaleString('en-US')} VND.`);
  if(debit>500000000)reasons.push('Exceeds the sandbox transaction limit of 500,000,000 VND.');
  return {...q,debit,fee,remaining,eligible:reasons.length===0,reasons};
 });
 const selected=[...quotes].filter(q=>q.eligible).sort((a,b)=>a.debit-b.debit||a.hours-b.hours||a.id.localeCompare(b.id))[0]??null;
 return {quotes,selected,trace:[
  {step:'Read invoice',status:'passed',detail:`${invoice.invoiceId}: ${invoice.amount.toLocaleString('en-US')} ${invoice.currency}; all required fields provided.`},
  {step:'Verify recipient',status:verified?'passed':'blocked',detail:verified?'Account matches directory version 1.':'The account or institution does not match the trusted demo directory.'},
  {step:'Compare transfer routes',status:'passed',detail:'Three fixed sandbox quotes calculated with integer arithmetic. Rates are illustrative, not live market quotes.'},
  {step:'Check deadline and reserve',status:selected?'passed':'blocked',detail:selected?`${selected.name} meets all constraints.`:'No route meets every required constraint.'},
  {step:'Request student approval',status:selected?'waiting':'blocked',detail:selected?'Exact terms must be approved before any funds are reserved.':'Execution is blocked. Correct the invoice or account settings and analyze again.'},
 ]};
}
export function explain(plan:Pick<Plan,'selected'|'quotes'|'invoice'>){
 if(plan.selected){const q=plan.selected;return `${q.name} is the lowest-cost eligible route. It debits ${q.debit.toLocaleString('en-US')} VND, delivers ${plan.invoice.amount.toLocaleString('en-US')} CNY in the sandbox within ${q.hours} hours, and leaves ${q.remaining.toLocaleString('en-US')} VND available. Approve the exact terms to continue.`;}
 return 'Payment paused. '+[...new Set(plan.quotes.flatMap(q=>q.reasons))].join(' ');
}

export function recoveryActions(invoice:Invoice,quotes:Quote[],balance:number,reserved:number,reserve:number,now=Date.now()){
 const actions:string[]=[];
 if(invoice.recipient!==UNIVERSITY.account||invoice.institution!==UNIVERSITY.name)actions.push('Verify the recipient through a trusted university channel. Do not use an account supplied only in an unverified message.');
 if(invoice.currency!=='CNY')actions.push('Use a supported CNY invoice. Other currency corridors are outside this MVP.');
 const onTime=quotes.filter(q=>now+q.hours*3600000<=Date.parse(invoice.deadline));
 if(!onTime.length)actions.push('Request a verified deadline extension or a supported faster provider. No route can arrive in time.');
 if(onTime.length){const cheapest=[...onTime].sort((a,b)=>a.debit-b.debit)[0];const shortfall=cheapest.debit+reserve-(balance-reserved);if(shortfall>0)actions.push(`Add at least ${shortfall.toLocaleString('en-US')} VND in this sandbox to meet the lowest on-time debit while keeping the protected reserve. The agent will not reduce your reserve.`);}
 if(quotes.every(q=>q.debit>500000000))actions.push('The amount exceeds the sandbox limit. Escalate for manual review.');
 return actions;
}
