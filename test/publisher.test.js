import test from 'node:test';
import assert from 'node:assert/strict';
import {Publisher,passwordMatches,default as worker} from '../publisher/worker.js';
import {publishToGitHub} from '../publisher/github.js';
import {emptyState} from '../public/model.js';
import {makeDocument} from '../public/publication.js';
const env={PUBLISH_PASSWORD:'only-a-test-password-1928',GITHUB_TOKEN:'test-token',GITHUB_REPOSITORY:'martinkaaekristiansen/sygepleje-laeringsstier',GITHUB_BRANCH:'main',ALLOWED_ORIGIN:'https://martinkaaekristiansen.github.io'};
function github(initial) {
 let document=initial,sha='initial-sha';const writes=[];let status=200;
 return {writes,setStatus(value){status=value;},document:()=>document,fetch:async(url,options={})=>{
  assert.ok(url.startsWith(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/content/paths/`));assert.equal(options.headers.Authorization,'Bearer test-token');assert.equal(options.redirect,'error');
  if(status!==200)return new Response('{}',{status});
  if(options.method==='PUT') {const body=JSON.parse(options.body);if(document&&body.sha!==sha)return new Response('{}',{status:409});assert.equal(body.branch,'main');writes.push(body);document=JSON.parse(Buffer.from(body.content,'base64').toString());sha='next-sha';return Response.json({commit:{sha:'a'.repeat(40)}},{status:201});}
  return document?Response.json({sha,encoding:'base64',content:Buffer.from(JSON.stringify(document)).toString('base64')}):new Response('{}',{status:404});
 }};
}
const context=()=>{const values=new Map();return {storage:{async get(k){return structuredClone(values.get(k));},async put(k,v){values.set(k,structuredClone(v));},async delete(k){values.delete(k);},async getAlarm(){return null;},async setAlarm(){},async list(){return values;}},values};};
const request=(code=env.PUBLISH_PASSWORD,body={action:'publish',path:emptyState().paths[0],baseRevision:null})=>new Request('https://publisher.test/publish',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'X-Trusted-IP':'192.0.2.1','Content-Type':'application/json','X-Publish-Code':code},body:JSON.stringify(body)});
test('password is verified server-side and the editor PIN cannot publish',async()=>{
 assert.ok(await passwordMatches(env.PUBLISH_PASSWORD,env.PUBLISH_PASSWORD));assert.equal(await passwordMatches('7269',env.PUBLISH_PASSWORD),false);assert.equal(await passwordMatches('',env.PUBLISH_PASSWORD),false);
});
test('unauthorized requests never reach GitHub; five failures block even a correct sixth attempt',async()=>{
 const ctx=context(),p=new Publisher(ctx,env);for(let i=0;i<5;i++)assert.equal((await p.fetch(request('wrong'))).status,401);assert.equal((await p.fetch(request())).status,429);assert.ok(!JSON.stringify([...ctx.values]).includes(env.PUBLISH_PASSWORD));assert.ok(!JSON.stringify([...ctx.values]).includes('192.0.2.1'));
});
test('origin restrictions, missing credentials and malformed payloads fail closed',async()=>{
 assert.equal((await worker.fetch(new Request('https://publisher.test/publish',{headers:{Origin:'https://untrusted.test'}}),env)).status,403);
 assert.equal((await new Publisher(context(),{...env,GITHUB_TOKEN:''}).fetch(request())).status,503);
 assert.equal((await new Publisher(context(),env).fetch(request(env.PUBLISH_PASSWORD,{action:'publish',path:{},baseRevision:null}))).status,400);
});
test('publish writes only one content file, with no password or student data, and repeated submissions are idempotent',async()=>{
 const mock=github(),path=emptyState().paths[0];path.notes='student note';const payload={action:'publish',path,baseRevision:null};const result=await publishToGitHub(env,payload,mock.fetch);assert.equal(result.state,'accepted');assert.equal(mock.writes.length,1);assert.ok(!JSON.stringify(mock.document()).includes('student note'));assert.ok(!JSON.stringify(mock.document()).includes(env.PUBLISH_PASSWORD));assert.equal((await publishToGitHub(env,payload,mock.fetch)).alreadyAccepted,true);assert.equal(mock.writes.length,1);
});
test('stale edits and GitHub denial preserve the published document',async()=>{
 const path=emptyState().paths[0],original=await makeDocument(path),mock=github(original);
 await assert.rejects(publishToGitHub(env,{action:'publish',path:{...path,title:'New'},baseRevision:null},mock.fetch),e=>e.status===409);assert.equal(mock.writes.length,0);
 mock.setStatus(403);await assert.rejects(publishToGitHub(env,{action:'publish',path,baseRevision:original.revision},mock.fetch),e=>e.status===503);assert.equal(mock.writes.length,0);
});
test('withdrawal preserves published content and requires current revision',async()=>{
 const path=emptyState().paths[0],original=await makeDocument(path),mock=github(original);await publishToGitHub(env,{action:'withdraw',path:{...path,title:'Unpublished edit'},baseRevision:original.revision},mock.fetch);assert.equal(mock.document().status,'withdrawn');assert.equal(mock.document().path.title,path.title);
});
test('authorized Durable Object sends accepted response without revealing secrets',async()=>{
 const mock=github(),original=globalThis.fetch;globalThis.fetch=mock.fetch;
 try {const response=await new Publisher(context(),env).fetch(request());assert.equal(response.status,202);const text=await response.text();assert.ok(!text.includes(env.PUBLISH_PASSWORD));assert.ok(!text.includes(env.GITHUB_TOKEN));assert.equal(mock.writes.length,1);}finally{globalThis.fetch=original;}
});
