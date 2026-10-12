import {spawnSync} from 'node:child_process';import {readFileSync,writeFileSync} from 'node:fs';
for(const file of ['engine.test.ts','benchmark.mjs','agent.mjs','routes.mjs','review-regressions.mjs']){const args=['--experimental-strip-types',...(file.endsWith('.ts')?[]:['--loader','./tests/loader.mjs']),'tests/'+file];const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
await import('./consolidate-reports.mjs');
