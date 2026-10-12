import { env } from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('Storage is temporarily unavailable.');return env.DB;}
export function owner(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)throw new Error('Sign in with ChatGPT to use your private sandbox.');return id;}
export function protect(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('Cross-origin requests are not allowed.');}
export async function wallet(id:string){
 const database=db();await database.prepare('INSERT OR IGNORE INTO accounts (owner,balance,reserved,reserve,generation,created_at) VALUES (?,125000000,0,18000000,?,?)').bind(id,crypto.randomUUID(),new Date().toISOString()).run();
 return await database.prepare('SELECT * FROM accounts WHERE owner = ?').bind(id).first<any>();
}
export async function sha(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function fail(e:unknown){const message=e instanceof Error?e.message:'Request failed.';const status=message.startsWith('Sign in')?401:400;return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
export async function groq(key:string,model:string,messages:any[],json=false){
 if(key.length<12||key.length>300)throw new Error('Enter a valid Groq API key.');
 if(!/^[a-zA-Z0-9/_.:-]{1,100}$/.test(model))throw new Error('The model ID is invalid.');
 const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages,temperature:0.1,max_completion_tokens:1000,...(json?{response_format:{type:'json_object'}}:{})}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error(`AI provider returned ${response.status}. Check your key, model access or quota. No payment was performed.`);
 const result:any=await response.json();const text=result.choices?.[0]?.message?.content;if(typeof text!=='string')throw new Error('The AI provider returned no usable response.');return text;
}
export async function groqTools(key:string,model:string,messages:any[],tools:any[],recordUsage?:(usage:{promptTokens:number|null;completionTokens:number|null;totalTokens:number|null;model:string|null})=>void){
 if(key.length<12||key.length>300||!/^[a-zA-Z0-9/_.:-]{1,100}$/.test(model))throw new Error('Invalid Groq key or model.');
 const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages,tools,tool_choice:'auto',temperature:0.1,max_completion_tokens:1400}),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error(`AI provider returned ${r.status}. Check model support, key and quota. No transfer was performed.`);
 const data:any=await r.json();if(!data.choices?.[0]?.message)throw new Error('AI returned no agent message.');
 recordUsage?.({promptTokens:Number.isSafeInteger(data.usage?.prompt_tokens)?data.usage.prompt_tokens:null,completionTokens:Number.isSafeInteger(data.usage?.completion_tokens)?data.usage.completion_tokens:null,totalTokens:Number.isSafeInteger(data.usage?.total_tokens)?data.usage.total_tokens:null,model:typeof data.model==='string'?data.model:null});return data.choices[0].message;
}
