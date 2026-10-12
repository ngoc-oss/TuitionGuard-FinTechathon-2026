/** Browser-only teaching simulator. Never authorizes or moves real money. */
export const currencies=['VND','CNY','USD'] as const;
export type Currency=typeof currencies[number];
export const base:Record<Currency,number>={VND:1,CNY:3600,USD:25000};
export const initial:Record<Currency,number>={VND:130000000,CNY:36000,USD:5200};
export const reserves:Record<Currency,number>={VND:18000000,CNY:5000,USD:720};
export type Scenario='safe'|'funds'|'recipient'|'pending'|'mismatch'|'timeout'|'rejected'|'limit';
export type Invoice={id:string;student:string;source:Currency;target:Currency;amount:number;recipient:string;deadline:number;walletLimit?:boolean};
export const recipients:Record<Currency,string>={CNY:'DEMO-CN-UNIVERSITY-001',USD:'DEMO-US-UNIVERSITY-001',VND:'DEMO-VN-UNIVERSITY-001'};
export const school:Record<Currency,string>={CNY:'Shenzhen Demo University',USD:'Pacific Demo University',VND:'Hanoi Demo University'};
export type Quote={id:string;rate:number;principal:number;fee:number;total:number;hours:number;eligible:boolean;reasons:string[]};
export type Plan={invoice:Invoice;balance:number;reserve:number;expires:number;quotes:Quote[];selected:Quote|null;fingerprint:string};
export type Transfer={id:string;plan:Plan;status:string;scenario:Scenario;checks:number;corrected:boolean;sample:boolean;events:string[];created:number};
export type Wallet={balance:number;reserved:number};
const unit=(c:Currency)=>c==='VND'?1:100;
const ceil=(n:number,c:Currency)=>Math.ceil((n-1e-8)*unit(c))/unit(c);
const round=(n:number,c:Currency)=>Math.round(n*unit(c))/unit(c);
export function invoice(source:Currency='VND',target:Currency='CNY',now=Date.now()):Invoice{return {id:'TG-'+now,student:'STU-0086',source,target,amount:target==='CNY'?30000:target==='USD'?4000:100000000,recipient:recipients[target],deadline:now+48*3600000};}
export function makePlan(input:Invoice,wallet:Wallet,reserve:number,now=Date.now()):Plan{
 if(!currencies.includes(input.source)||!currencies.includes(input.target)||input.source===input.target)throw Error('currency');
 if(!Number.isFinite(input.amount)||input.amount<=0||input.amount>1e10||Math.abs(input.amount*unit(input.target)-Math.round(input.amount*unit(input.target)))>1e-5)throw Error('amount');
 if(!Number.isFinite(reserve)||reserve<0||reserve>1e12||!Number.isFinite(input.deadline)||!input.id.trim()||!input.student.trim())throw Error('fields');
 const available=round(wallet.balance-wallet.reserved,input.source);
 const providers=[{id:'A',spread:0.002,fee:120000,hours:8},{id:'B',spread:0.001,fee:80000,hours:72},{id:'C',spread:0.005,fee:180000,hours:2},...(input.walletLimit&&input.target==='CNY'?[{id:'W',spread:0,fee:0,hours:1},{id:'L',spread:0,fee:0,hours:1}]:[])];
 const quotes=providers.map(p=>{
  const rate=base[input.target]/base[input.source]*(1+p.spread),principal=ceil(input.amount*rate,input.source),fee=ceil(p.fee/base[input.source],input.source),total=round(principal+fee,input.source);
  const reasons:string[]=[];if(['W','L'].includes(p.id)&&input.amount>10000)reasons.push('limit');if(input.recipient!==recipients[input.target])reasons.push('recipient');if(now+p.hours*3600000>input.deadline)reasons.push('deadline');if(available-total<reserve)reasons.push('funds');
  return {id:p.id,rate,principal,fee,total,hours:p.hours,eligible:!reasons.length,reasons};
 });
 const selected=quotes.filter(q=>q.eligible).sort((a,b)=>a.total-b.total)[0]??null;
 const plan={invoice:{...input},balance:available,reserve,expires:now+300000,quotes,selected};
 return {...plan,fingerprint:JSON.stringify(plan)};
}
export function submit(plan:Plan,wallet:Wallet,approved:boolean,existing:Transfer[],scenario:Scenario,now=Date.now()):{transfer:Transfer;wallet:Wallet}{
 if(!approved)throw Error('approval');if(now>=plan.expires)throw Error('expired');
 const {fingerprint,...payload}=plan;if(JSON.stringify(payload)!==fingerprint)throw Error('changed');
 if(existing.some(t=>!t.sample&&t.plan.invoice.id===plan.invoice.id))throw Error('duplicate');
 if(round(wallet.balance-wallet.reserved,plan.invoice.source)!==plan.balance)throw Error('changed');
 const fresh=makePlan(plan.invoice,wallet,plan.reserve,now);if(!plan.selected||fresh.selected?.id!==plan.selected.id||fresh.selected.total!==plan.selected.total)throw Error('changed');
 const status=scenario==='timeout'?'UNKNOWN':'SUBMITTED';
 return {transfer:{id:'SIM-'+now+'-'+Math.random().toString(36).slice(2,7),plan,status,scenario,checks:0,corrected:false,sample:false,created:now,events:['verified','quoted','policy','approved','reserved',scenario==='timeout'?'unknown':'submitted']},wallet:{...wallet,reserved:round(wallet.reserved+plan.selected.total,plan.invoice.source)}};
}
export function reconcile(t:Transfer,w:Wallet):{transfer:Transfer;wallet:Wallet}{
 if(t.sample||['SETTLED','REJECTED'].includes(t.status))return {transfer:t,wallet:w};
 const x={...t,checks:t.checks+1,events:[...t.events]};const q=t.plan.selected!;const c=t.plan.invoice.source;
 if(t.scenario==='mismatch'&&!t.corrected){x.status='REVIEW_REQUIRED';x.events.push('mismatch');return {transfer:x,wallet:w};}
 if(t.scenario==='pending'&&x.checks===1){x.status='PENDING';x.events.push('pending');return {transfer:x,wallet:w};}
 x.status=t.scenario==='rejected'?'REJECTED':'SETTLED';x.events.push(t.scenario==='rejected'?'released':'settled');
 return {transfer:x,wallet:{balance:round(w.balance-(x.status==='SETTLED'?q.total:0),c),reserved:round(w.reserved-q.total,c)}};
}
export function samples():Transfer[]{
 const time=Date.UTC(2026,9,1,8);
 return (['SETTLED','PENDING','REVIEW_REQUIRED'] as const).map((status,i)=>{
  const source:Currency=i===2?'CNY':'VND',target:Currency=i===1?'USD':'CNY';
  const inv=invoice(i===2?'USD':source,target,time+i*60000);inv.id='EXAMPLE-00'+(i+1);
  const plan=makePlan(inv,{balance:initial[inv.source],reserved:0},reserves[inv.source],time);
  return {id:'EXAMPLE-'+(i+1),plan,status,scenario:i===0?'safe':i===1?'pending':'mismatch',checks:1,corrected:false,sample:true,created:time+i*60000,events:['verified','quoted','policy','approved','reserved',i===0?'settled':i===1?'pending':'mismatch']};
 });
}
