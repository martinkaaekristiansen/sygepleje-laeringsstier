import {validateCatalog,publicPath,MAX_PUBLICATION_BYTES} from './publication.js';
import {safeLink} from './publisher-ui.js';
const siteURL=file=>new URL(file,new URL('.',location.href));
export async function fetchCatalog() {
  const response=await fetch(siteURL('catalog.json'),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Den offentlige udgave kunne ikke hentes. Dine lokale data er bevaret.');
  return validateCatalog(await response.json());
}
export async function publisherConfig() {
  try {
    const response=await fetch(siteURL('publisher-config.json'),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)return null;const {endpoint}=await response.json();if(!endpoint)return null;
    const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;return url.origin;
  }catch{return null;}
}
export async function sendPublication(endpoint,code,path,baseRevision,action='publish') {
  const content=publicPath(path),body=JSON.stringify({action,path:content,baseRevision});
  if(new TextEncoder().encode(body).length>MAX_PUBLICATION_BYTES)throw Error('Læringsstien er for stor til udgivelse (maks. 4 MB).');
  let response;
  try {response=await fetch(`${endpoint}/publish`,{method:'POST',headers:{'Content-Type':'application/json','X-Publish-Code':code},body,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(60000)});}
  catch {throw Error('Publiceringsserveren kunne ikke kontaktes. Kontrollér udgivelsesstatus før et nyt forsøg. Din kladde er bevaret.');}
  let data;try{data=await response.json();}catch{throw Error('Publiceringsserveren gav et ukendt svar. Din kladde er bevaret.');}
  if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Udgivelsen blev afvist. Din kladde er bevaret.');
  if(data.state!=='accepted'||!/^[a-f0-9]{64}$/.test(data.revision))throw Error('Udgivelsen kunne ikke bekræftes. Kontrollér status.');
  return {revision:data.revision,commit:/^[a-f0-9]{40}$/.test(data.commit||'')?data.commit:null,actionsUrl:safeLink(data.actionsUrl)};
}
