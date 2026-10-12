import {invoice,makePlan,submit,initial,reserves} from './judge-engine';
export function evaluateAgentSimulation(now=Date.now()){
 const wallet={balance:initial.VND,reserved:0};const inv=invoice('VND','CNY',now);
 const cases=[{id:'safe',amount:30000,expected:'A'},{id:'funds',amount:30000,expected:'aiBlocked'},{id:'recipient',amount:30000,expected:'aiBlocked'},{id:'limit',amount:30000,expected:'aiAlternative'},{id:'cap_equal',amount:10000,expected:'aiWallet'},{id:'cap_above',amount:10000.01,expected:'aiAbove'},{id:'approval',amount:30000,expected:'aiApproval'}];
 return cases.map(c=>{const p=makePlan({...inv,id:c.id,amount:c.amount,recipient:c.id==='recipient'?'WRONG':inv.recipient,walletLimit:['limit','cap_equal','cap_above'].includes(c.id)},wallet,c.id==='funds'?wallet.balance+1:reserves.VND,now);let observed=p.selected?.id??'aiBlocked';
 const wallets=p.quotes.filter(q=>['W','L'].includes(q.id));
 if(c.id==='limit'&&wallets.length===2&&wallets.every(q=>q.reasons.includes('limit'))&&p.selected?.id==='A')observed='aiAlternative';
 if(c.id==='cap_equal'&&wallets.every(q=>q.eligible)&&wallets.length===2)observed='aiWallet';
 if(c.id==='cap_above'&&wallets.length===2&&wallets.every(q=>q.reasons.includes('limit')))observed='aiAbove';
 if(c.id==='approval'){try{submit(p,wallet,false,[],'safe',now);observed='unexpected_submission';}catch(e){observed=e instanceof Error&&e.message==='approval'?'aiApproval':'unexpected_error';}}
 return {id:c.id,amount:c.amount,currency:'CNY',expected:c.expected,observed,passed:observed===c.expected,mode:'scripted deterministic simulator; no LLM',plan:p};
 });
}
