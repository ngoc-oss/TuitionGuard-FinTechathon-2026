import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export async function resolve(specifier,context,next){
 if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__TUITION_TEST_ENV__;',shortCircuit:true};
 if(specifier.startsWith('.')&&context.parentURL){const u=new URL(specifier,context.parentURL);if(!existsSync(fileURLToPath(u))&&existsSync(fileURLToPath(u)+'.ts'))return next(u.href+'.ts',context);}
 return next(specifier,context);
}
