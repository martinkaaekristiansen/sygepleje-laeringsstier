import {builtins,normalizePath,pathErrors,emptyState,validateState,reconcileProgress} from './model.js';

export const PUBLICATION_FORMAT='laeringssti-publication-v1';
export const MAX_PUBLICATION_BYTES=4*1024*1024;
export const publishableId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
// An explicit allowlist prevents notes, credentials, browser metadata and student
// answers from travelling to the publishing service or into the public repo.
export function publicPath(input) {
  const incoming=emptyState();incoming.paths=[input];
  if(!input||!publishableId(input.id)||!validateState(incoming))throw Error('Læringsstien indeholder ugyldige felter eller ID’er.');
  const p=normalizePath(input);
  if(!publishableId(p.id)||pathErrors(p).length)throw Error('Læringsstien er ikke klar til udgivelse. Kontrollér felterne.');
  if(p.durationMinutes!==undefined&&(!Number.isFinite(p.durationMinutes)||p.durationMinutes<=0))throw Error('Ugyldig varighed.');
  if(p.steps.some(s=>s.curriculumSource!==undefined&&typeof s.curriculumSource!=='string'))throw Error('Ugyldig semesterkilde.');
  const path=pick(p,['id','title','description','semester','subject','subjects','durationMinutes']);
  path.contentVersion=1;
  path.steps=p.steps.map(s=>({...pick(s,['id','title','type','text','guide','image','imageAlt','media','curriculumSource']),questions:s.questions.map(q=>pick(q,['id','q','a','optionIds','correct','why','source','explanations']))}));
  const test=emptyState();test.paths=[path];
  if(!validateState(test))throw Error('Læringsstien indeholder ugyldige eller gentagne ID’er.');
  if(new TextEncoder().encode(JSON.stringify(path)).length>MAX_PUBLICATION_BYTES-4096)throw Error('Læringsstien er for stor til udgivelse (maks. 4 MB). Brug færre eller mindre billeder.');
  return path;
}
export function sameContent(a,b) {try{return JSON.stringify(publicPath(a))===JSON.stringify(publicPath(b));}catch{return false;}}
export async function publicationRevision(path,status='published') {
  const bytes=new TextEncoder().encode(JSON.stringify({status,path:publicPath(path)}));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function makeDocument(path,status='published',previous=null) {
  if(!['published','withdrawn'].includes(status))throw Error('Ukendt udgivelseshandling.');
  const content=publicPath(path),revision=await publicationRevision(content,status);
  if(previous?.revision===revision)return previous;
  const sequence=(previous?.sequence||0)+1;
  return {format:PUBLICATION_FORMAT,revision,sequence,status,updatedAt:new Date().toISOString(),path:{...content,contentVersion:sequence}};
}
export async function validateDocument(doc) {
  if(!doc||doc.format!==PUBLICATION_FORMAT||!['published','withdrawn'].includes(doc.status)||!Number.isSafeInteger(doc.sequence)||doc.sequence<1||typeof doc.updatedAt!=='string'||!Number.isFinite(Date.parse(doc.updatedAt)))throw Error('Ugyldig udgivelsesfil.');
  const p=publicPath(doc.path);
  if(doc.path.contentVersion!==doc.sequence||await publicationRevision(p,doc.status)!==doc.revision)throw Error('Udgivelsesfilens indhold stemmer ikke med versionen.');
  return doc;
}
export async function validateCatalog(value) {
  if(value?.format!=='laeringsstier-catalog-v1'||!Array.isArray(value.entries))throw Error('Det offentlige katalog kunne ikke læses.');
  for(const doc of value.entries)await validateDocument(doc);
  if(new Set(value.entries.map(d=>d.path.id)).size!==value.entries.length)throw Error('Kataloget indeholder gentagne læringsstier.');
  return value;
}
export const initialPublication=()=>({version:1,known:{},pending:{},history:{}});
function archive(state,id,old,revision) {
  const history=state.publication.history[id]??=[];
  const progress=structuredClone(state.progress[id]||{done:[],notes:{},answers:{}});
  if(!history.some(h=>h.revision===revision&&JSON.stringify(h.progress)===JSON.stringify(progress)))history.push({revision,path:structuredClone(old),progress,savedAt:Date.now()});
}
export function syncCatalog(input,catalog) {
  const state=structuredClone(input),first=!state.publication;
  state.publication??=initialPublication();
  const byId=new Map(catalog.entries.map(d=>[d.path.id,d]));
  // One-time preservation of every pre-publication local edit and local path.
  if(first)for(const local of state.paths) {
    const doc=byId.get(local.id);
    if(!doc||!sameContent(local,doc.path)) {
      state.drafts[local.id]??={path:structuredClone(local),selected:'metadata',updatedAt:Date.now(),baseRevision:doc?.revision||null};
      archive(state,local.id,local,'local-before-publication');
    }
  }
  for(const doc of catalog.entries) {
    const id=doc.path.id,prior=state.publication.known[id];
    const old=prior?.path||state.paths.find(p=>p.id===id);
    if(old&&(prior?.revision!==doc.revision)&&(!sameContent(old,doc.path)||doc.status==='withdrawn')) {
      archive(state,id,old,prior?.revision||'local-before-publication');
      if(state.progress[id])state.progress[id]=reconcileProgress(old,doc.path,state.progress[id]);
    }
    state.publication.known[id]=structuredClone(doc);
    const pending=state.publication.pending[id];
    if(pending?.revision===doc.revision) {
      const draft=state.drafts[id];
      if(draft&&sameContent(draft.path,doc.path))delete state.drafts[id];
      delete state.publication.pending[id];
    }
  }
  // A removed catalogue entry is retained in history. Normally withdrawals use a
  // tombstone document, so clients can distinguish removal from a network error.
  for(const [id,old] of Object.entries(state.publication.known))if(!byId.has(id)) {
    archive(state,id,old.path,old.revision);delete state.publication.known[id];
  }
  state.paths=catalog.entries.filter(d=>d.status==='published').map(d=>structuredClone(d.path));
  for(const d of Object.values(state.drafts))if(!Object.hasOwn(d,'baseRevision'))d.baseRevision=state.publication.known[d.path.id]?.revision||null;
  return state;
}
export async function bootstrapDocuments() {return Promise.all(builtins.map(p=>makeDocument(p)));}
