import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {currencies,base,initial,reserves,invoice,makePlan,submit,reconcile,samples} from '../lib/judge-engine.ts';
import {strings} from '../lib/judge-i18n.ts';
const checks=[];function check(name,fn){fn();checks.push(name)};
const now=Date.UTC(2026,9,10);let routes=0;
for(const source of currencies)for(const target of currencies){if(source===target)continue;routes++;const w={balance:initial[source],reserved:0},inv=invoice(source,target,now),p=makePlan(inv,w,reserves[source],now);
 check(`${source}-${target}: eligible with explicit FX`,()=>{assert.ok(p.selected);assert.equal(p.selected.rate,base[target]/base[source]*1.002);assert.ok(p.quotes.find(q=>q.id==='B').reasons.includes('deadline'))});
 check(`${source}-${target}: needs human approval`,()=>assert.throws(()=>submit(p,w,false,[],'safe',now),/approval/));
 const paid=submit(p,w,true,[],'safe',now);const settled=reconcile(paid.transfer,paid.wallet);
 check(`${source}-${target}: reserve and settle once`,()=>{assert.equal(paid.wallet.balance,w.balance);assert.equal(paid.wallet.reserved,p.selected.total);assert.equal(settled.transfer.status,'SETTLED');assert.equal(settled.wallet.reserved,0);assert.ok(settled.wallet.balance>=reserves[source]);assert.deepEqual(reconcile(settled.transfer,settled.wallet),settled)});
 check(`${source}-${target}: duplicate prevented`,()=>assert.throws(()=>submit(p,w,true,[paid.transfer],'safe',now),/duplicate/));
 check(`${source}-${target}: reserve protection`,()=>assert.equal(makePlan(inv,w,w.balance+1,now).selected,null));
 check(`${source}-${target}: wrong recipient blocked`,()=>assert.equal(makePlan({...inv,recipient:'BAD'},w,0,now).selected,null));
}
const inv=invoice('VND','CNY',now),w={balance:initial.VND,reserved:0},p=makePlan(inv,w,reserves.VND,now);
check('Expired approval blocked',()=>assert.throws(()=>submit(p,w,true,[],'safe',now+300000),/expired/));
check('Changed amount blocked',()=>assert.throws(()=>submit({...p,invoice:{...inv,amount:1}},w,true,[],'safe',now),/changed/));
check('Changed balance blocked',()=>assert.throws(()=>submit(p,{...w,balance:w.balance-1},true,[],'safe',now),/changed/));
check('Same currency rejected',()=>assert.throws(()=>makePlan({...inv,target:'VND'},w,0,now),/currency/));
check('Currency precision validated',()=>assert.throws(()=>makePlan({...inv,amount:1.001},w,0,now),/amount/));
for(const scenario of ['pending','mismatch','timeout','rejected']){
 const a=submit(p,w,true,[],scenario,now);let b=reconcile(a.transfer,a.wallet);
 check(`${scenario}: expected intermediate result`,()=>assert.equal(b.transfer.status,{pending:'PENDING',mismatch:'REVIEW_REQUIRED',timeout:'SETTLED',rejected:'REJECTED'}[scenario]));
 if(scenario==='mismatch'){check('Mismatch holds balance and reservation',()=>assert.deepEqual(b.wallet,a.wallet));b=reconcile({...b.transfer,corrected:true},b.wallet)}else if(scenario==='pending')b=reconcile(b.transfer,b.wallet);
 check(`${scenario}: completes without duplicate debit`,()=>{assert.equal(b.wallet.reserved,0);assert.equal(b.transfer.status,scenario==='rejected'?'REJECTED':'SETTLED');assert.equal(b.wallet.balance,scenario==='rejected'?w.balance:w.balance-p.selected.total)});
}
check('Sample receipts read-only, complete and currency-diverse',()=>{const fixtures=samples();assert.equal(fixtures.length,3);for(const x of fixtures){assert.ok(x.sample&&x.plan.selected);assert.deepEqual(reconcile(x,w),{transfer:x,wallet:w})}assert.equal(new Set(fixtures.flatMap(x=>[x.plan.invoice.source,x.plan.invoice.target])).size,3)});
check('Every UI string has English Vietnamese Chinese',()=>{for(const [key,value] of Object.entries(strings)){assert.equal(value.length,3,key);assert.ok(value.every(x=>typeof x==='string'&&x.length>0),key)}});
writeFileSync('public/judge-test-report.json',JSON.stringify({scope:'Browser simulator engine unit tests; not browser UI or live AI tests',currencyDirections:routes,passed:checks.length,total:checks.length,checks},null,2));console.log(`${checks.length} public simulation checks passed across ${routes} currency directions.`);
