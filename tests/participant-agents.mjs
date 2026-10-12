import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {evaluateParticipants,cleanEvidence,release,proposeRelease} from '../lib/participant-agents.ts';
const results=evaluateParticipants();assert.equal(results.length,13);assert.ok(results.every(r=>r.passed));
const e=cleanEvidence();let s={released:[],confirmed:['enrollment','teaching','completion'],consent:true};
assert.throws(()=>release({...e,dispute:true},s,true,'enrollment'));
for(const id of ['enrollment','teaching','completion'])s=release(e,s,true,id);
assert.equal(proposeRelease(e,s).state,'COMPLETE');assert.throws(()=>release(e,s,true,'completion'));
writeFileSync('public/participant-agent-report.json',JSON.stringify({scope:'Scripted agents with synthetic evidence; not live AI, blockchain or financial execution',checks:16,passed:16,interactiveChecks:results,additionalChecks:['Risk change blocks approved milestone','All milestones complete in order','Completed milestone cannot release again']},null,2));console.log('16 participant-agent assertions passed');
