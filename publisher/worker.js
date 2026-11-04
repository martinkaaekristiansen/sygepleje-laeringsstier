import {MAX_PUBLICATION_BYTES} from '../public/publication.js';
import {PublishError,publishToGitHub} from './github.js';
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const sha=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
export async function passwordMatches(supplied,expected) {
  if(typeof expected!=='string'||expected.length<12||typeof supplied!=='string'||supplied.length>256)return false;
  const [a,b]=await Promise.all([sha(supplied),sha(expected)]);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];return mismatch===0;
}
async function limitedBody(request,parse=true) {
  if(Number(request.headers.get('Content-Length'))>MAX_PUBLICATION_BYTES)throw new PublishError(413,'Læringsstien må højst fylde 4 MB.');
  const reader=request.body?.getReader();if(!reader)throw new PublishError(400,'Indhold mangler.');
  const chunks=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PUBLICATION_BYTES){await reader.cancel();throw new PublishError(413,'Læringsstien må højst fylde 4 MB.');}chunks.push(value);}
  const joined=new Uint8Array(size);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  if(!parse)return joined;
  try{return JSON.parse(new TextDecoder().decode(joined));}catch{throw new PublishError(400,'Indholdet kunne ikke læses.');}
}
export class Publisher {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.queue=Promise.resolve();}
  fetch(request){const job=this.queue.then(()=>this.handle(request));this.queue=job.catch(()=>{});return job;}
  async alarm(){const entries=await this.ctx.storage.list({prefix:'attempt:'});const now=Date.now();for(const [key,value]of entries)if(value.until<=now)await this.ctx.storage.delete(key);if(entries.size)await this.ctx.storage.setAlarm(now+15*60*1000);}
  async handle(request) {
    try {
      if(!this.env.PUBLISH_PASSWORD||!this.env.GITHUB_TOKEN)return json(503,{error:'Ejeren mangler at aktivere publiceringsserverens hemmelige nøgler.'});
      const origin=request.headers.get('Origin');if(origin!==this.env.ALLOWED_ORIGIN)return json(403,{error:'Denne hjemmeside må ikke publicere her.'});
      if(request.method!=='POST'||new URL(request.url).pathname!=='/publish')return json(404,{error:'Ukendt handling.'});
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json(415,{error:'Brug JSON til udgivelse.'});
      // Salted digests expire after 15 minutes. Raw IP addresses and passwords are never stored.
      const fingerprint=[...await sha(`${this.env.PUBLISH_PASSWORD}:${request.headers.get('X-Trusted-IP')||'unknown'}`)].map(n=>n.toString(16).padStart(2,'0')).join('');
      const key=`attempt:${fingerprint}`,now=Date.now(),windowMs=15*60*1000;
      let attempt=await this.ctx.storage.get(key);if(!attempt||attempt.until<=now)attempt={failures:0,requests:0,until:now+windowMs};
      if(attempt.failures>=5||attempt.requests>=30){const response=json(429,{error:'For mange forsøg. Vent 15 minutter, og prøv igen.'});response.headers.set('Retry-After',String(Math.ceil((attempt.until-now)/1000)));return response;}
      attempt.requests++;
      const allowed=await passwordMatches(request.headers.get('X-Publish-Code'),this.env.PUBLISH_PASSWORD);
      if(!allowed)attempt.failures++;
      await this.ctx.storage.put(key,attempt);if(await this.ctx.storage.getAlarm()===null)await this.ctx.storage.setAlarm(now+windowMs);
      if(!allowed)return json(401,{error:'Udgivelseskoden er forkert.'});
      const input=await limitedBody(request);
      const result=await publishToGitHub(this.env,input);
      return json(202,result);
    }catch(error){return json(error instanceof PublishError?error.status:400,{error:error instanceof PublishError?error.message:'Udgivelsen kunne ikke gennemføres. Kontrollér indholdet, og prøv igen. Kladden er bevaret.'});}
    finally {if(request.body&&!request.bodyUsed)try{await request.body.cancel();}catch{}}
  }
}
export default {
  async fetch(request,env) {
    const origin=request.headers.get('Origin');
    if(origin!==env.ALLOWED_ORIGIN)return json(403,{error:'Denne hjemmeside må ikke publicere her.'});
    const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Publish-Code','Access-Control-Expose-Headers':'Retry-After','Vary':'Origin'};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(request.method!=='POST'||new URL(request.url).pathname!=='/publish')return json(404,{error:'Ukendt handling.'});
    if(!env.PUBLISHER)return json(503,{error:'Publiceringsserveren er ikke færdigkonfigureret.'});
    const headers=new Headers(request.headers);headers.set('X-Trusted-IP',request.headers.get('CF-Connecting-IP')||'unknown');
    const stub=env.PUBLISHER.get(env.PUBLISHER.idFromName('publisher'));
    let result;
    try{
      // Finish the bounded upload before crossing the Durable Object boundary.
      // Early auth failures must not leave an incoming request stream in flight.
      const body=await limitedBody(request,false);
      result=await stub.fetch(new Request(request.url,{method:'POST',headers,body}));
    }catch(error){result=json(error instanceof PublishError?error.status:503,{error:error instanceof PublishError?error.message:'Publiceringsserveren er midlertidigt utilgængelig. Prøv igen.'});}
    const response=new Response(result.body,result);for(const [key,value]of Object.entries(cors))response.headers.set(key,value);return response;
  }
};
