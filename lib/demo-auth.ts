/** UI simulation only. Never verifies email ownership or authenticates server APIs. */
export type DemoAccount={email:string;name:string};
export type DemoChallenge={email:string;name:string;mode:'register'|'login';code:string;expires:number;attempts:number};
export function startDemoChallenge(mode:'register'|'login',email:string,name:string,accounts:DemoAccount[],now=Date.now()):DemoChallenge{
 email=email.trim().toLowerCase();name=name.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('authEmailError');
 const account=accounts.find(a=>a.email===email);
 if(mode==='register'&&account)throw Error('authExists');
 if(mode==='login'&&!account)throw Error('authMissing');
 if(mode==='register'&&(!name||name.length>80))throw Error('authNameError');
 return {email,name:account?.name??name,mode,code:String(Math.floor(100000+Math.random()*900000)),expires:now+120000,attempts:0};
}
export function verifyDemoChallenge(challenge:DemoChallenge,code:string,now=Date.now()):{account?:DemoAccount;challenge:DemoChallenge;error?:string}{
 if(now>=challenge.expires)return {challenge,error:'authExpired'};
 if(challenge.attempts>=5)return {challenge,error:'authLocked'};
 const updated={...challenge,attempts:challenge.attempts+1};
 if(code.trim()!==challenge.code)return {challenge:updated,error:updated.attempts>=5?'authLocked':'authWrong'};
 return {challenge:updated,account:{email:challenge.email,name:challenge.name}};
}
