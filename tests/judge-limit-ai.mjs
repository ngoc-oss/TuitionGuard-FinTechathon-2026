import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {evaluateAgentSimulation} from '../lib/judge-ai.ts';
import {invoice,makePlan,initial,reserves} from '../lib/judge-engine.ts';
const results=evaluateAgentSimulation();assert.equal(results.length,7);assert.ok(results.every(x=>x.passed));
for(const source of ['VND','USD'])for(const amount of [9999,10000,10000.01,30000]){const p=makePlan({...invoice(source,'CNY'),amount,walletLimit:true},{balance:initial[source],reserved:0},reserves[source]);const channels=p.quotes.filter(x=>['W','L'].includes(x.id));assert.equal(channels.length,2);assert.ok(channels.every(x=>x.reasons.includes('limit')===(amount>10000)));}
writeFileSync('public/judge-limit-ai-report.json',JSON.stringify({scope:'Synthetic deterministic simulator tests, NOT live AI or official wallet limits',thresholdChecks:8,scriptedAgentChecks:7,results},null,2));console.log('8 wallet threshold checks and 7 simulated agent checks passed');
