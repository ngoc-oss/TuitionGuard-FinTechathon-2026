import {spawnSync} from 'node:child_process';
for(const file of ['engine.test.ts','benchmark.mjs','agent.mjs','routes.mjs','review-regressions.mjs','ai-live-check.mjs','layout-eval.mjs']){const args=['--experimental-strip-types',...(file.endsWith('.ts')?[]:['--loader','./tests/loader.mjs']),'tests/'+file];const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
await import('./consolidate-reports.mjs');
