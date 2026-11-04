import {publicPath,makeDocument,validateDocument,publishableId} from '../public/publication.js';
export class PublishError extends Error {constructor(status,message){super(message);this.status=status;}}
const encode=value=>{const bytes=new TextEncoder().encode(value);let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);};
const decode=value=>new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export async function publishToGitHub(env,input,fetcher=fetch) {
  if(input?.action!=='publish'&&input?.action!=='withdraw')throw new PublishError(400,'Ukendt handling.');
  const path=publicPath(input.path);
  if(input.baseRevision!==null&&!/^[a-f0-9]{64}$/.test(input.baseRevision||''))throw new PublishError(400,'Kladdens udgangsversion mangler. Genåbn læringsstien.');
  if(!publishableId(path.id))throw new PublishError(400,'Ugyldigt sti-ID.');
  const repo=env.GITHUB_REPOSITORY,branch=env.GITHUB_BRANCH||'main';
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||branch!=='main')throw new PublishError(503,'Publiceringsserveren er ikke færdigkonfigureret.');
  // Neither repository, branch, filename nor commit message can be supplied by the browser.
  const url=`https://api.github.com/repos/${repo}/contents/content/paths/${path.id}.json`;
  const headers={Authorization:`Bearer ${env.GITHUB_TOKEN}`,'User-Agent':'Laeringsstier-publisher','X-GitHub-Api-Version':'2022-11-28',Accept:'application/vnd.github+json'};
  async function call(url,options={}) {
    const response=await fetcher(url,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});
    if([401,403].includes(response.status))throw new PublishError(503,'GitHub-adgangen virker ikke. Ejeren skal kontrollere publiceringsserverens adgangsnøgle og rettigheder.');
    return response;
  }
  const response=await call(`${url}?ref=${branch}`);let sha,previous=null;
  if(response.ok) {
    const file=await response.json();sha=file.sha;
    let text;
    if(file.encoding==='base64')text=decode(file.content);
    else {const raw=await call(`${url}?ref=${branch}`,{headers:{Accept:'application/vnd.github.raw+json'}});if(!raw.ok)throw new PublishError(502,'GitHub kunne ikke læse indholdet. Prøv igen senere.');text=await raw.text();}
    try{previous=JSON.parse(text);await validateDocument(previous);}catch{throw new PublishError(409,'Den gemte udgivelse har et ukendt format. Kontakt ejeren.');}
  } else if(response.status!==404)throw new PublishError(502,'GitHub kunne ikke læse læringsstien. Prøv igen senere.');
  const status=input.action==='withdraw'?'withdrawn':'published';
  // A withdrawn version retains the last published content, never an unrelated local draft.
  const document=await makeDocument(status==='withdrawn'&&previous?previous.path:path,status,previous);
  const actionsUrl=`https://github.com/${repo}/actions/workflows/pages.yml`;
  if(previous?.revision===document.revision)return {state:'accepted',revision:document.revision,actionsUrl,alreadyAccepted:true};
  if((previous?.revision||null)!==input.baseRevision)throw new PublishError(409,'Der findes en nyere udgave. Opdatér oversigten og sammenlign den med din kladde, før du udgiver. Kladden er bevaret.');
  if(status==='withdrawn'&&!previous)throw new PublishError(404,'Læringsstien er endnu ikke udgivet.');
  const content=encode(JSON.stringify(document,null,2)+'\n');
  const result=await call(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`${status==='published'?'Publish':'Withdraw'} learning path ${path.id}`,content,branch,...(sha?{sha}:{})})});
  if([409,422].includes(result.status))throw new PublishError(409,'GitHub afviste ændringen. En nyere udgave eller en beskyttet main-branche kan være årsagen. Din kladde er bevaret.');
  if(!result.ok)throw new PublishError(502,'GitHub kunne ikke gemme udgivelsen. Prøv igen; samme indhold udgives ikke dobbelt.');
  const committed=await result.json();
  return {state:'accepted',revision:document.revision,commit:committed.commit?.sha,actionsUrl};
}
