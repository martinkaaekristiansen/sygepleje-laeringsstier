import {pathSubjects,validPathSubjects} from './subjects.js';
import {demo,questions,validQuestions,safeURL} from './data.js';
import {pharmacologyPath} from './pharmacology.js';
import {semester5Path} from './semester5.js';
import {types} from './ui.js';
export const SCHEMA = 2;
export const uid = () => crypto.randomUUID();
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const id = v => typeof v === 'string' && v.length > 0 && v.length <= 300 && !['__proto__','prototype','constructor'].includes(v);
export const imageURL = v => !v || Boolean(safeURL(v)) || /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=\s]+$/i.test(v);
export function pathErrors(p) {
  const errors = [];
  if (!object(p)) return ['Læringsstien skal være et objekt.'];
  if (typeof p.title !== 'string' || !p.title.trim()) errors.push('Udfyld læringsstiens titel.');
  if (typeof p.description !== 'string' || !p.description.trim()) errors.push('Udfyld den korte beskrivelse.');
  if (!Number.isInteger(p.semester) || p.semester < 1 || p.semester > 7) errors.push('Vælg semester 1–7.');
  if (!validPathSubjects(p)) errors.push('Vælg mindst ét fagområde. Fagnavne må højst være 80 tegn og må ikke være »Alle fagområder«.');
  if (!Array.isArray(p.steps) || !p.steps.length) return [...errors, 'Tilføj mindst ét trin.'];
  p.steps.forEach((s, i) => {
    const label = `Trin ${i + 1}: `;
    if (!object(s)) { errors.push(label + 'Ugyldigt trin.'); return; }
    if (typeof s.title !== 'string' || !s.title.trim()) errors.push(label + 'Udfyld titlen.');
    if (!Object.hasOwn(types, s.type) || typeof s.text !== 'string') errors.push(label + 'Kontrollér type og tekst.');
    for (const key of ['image','imageAlt','media','guide']) if (s[key] !== undefined && typeof s[key] !== 'string') errors.push(label + `Ugyldigt felt: ${key}.`);
    if (typeof s.image === 'string' && !imageURL(s.image)) errors.push(label + 'Billedlinket skal være et http(s)-link eller et uploadet billede.');
    if (s.media && (typeof s.media !== 'string' || !safeURL(s.media))) errors.push(label + 'Medielinket skal begynde med https:// eller http://.');
    if (s.type === 'quiz' && !s.questions?.length) errors.push(label + 'En quiz skal have mindst ét spørgsmål.');
    if (!validQuestions(s.questions)) errors.push(label + 'Udfyld alle spørgsmål, mindst to svar, korrekt svar og forklaring.');
    if (Array.isArray(s.questions) && s.questions.some(q => q.source !== undefined && typeof q.source !== 'string')) errors.push(label + 'Spørgsmålskilden skal være tekst.');
  });
  return errors;
}
// IDs survive reordering and edits. Legacy items get deterministic IDs once.
export function normalizePath(input, fresh = false) {
  const p = structuredClone(input);
  p.subjects = pathSubjects(p);
  p.subject = p.subjects[0] || '';
  p.id = fresh ? uid() : id(p.id) ? p.id : uid();
  p.contentVersion = Number.isInteger(p.contentVersion) && p.contentVersion > 0 ? p.contentVersion : 1;
  const used = new Set();
  p.steps = p.steps.map((s, i) => {
    s.id = !fresh && id(s.id) && !used.has(s.id) ? s.id : `${p.id}:s${i + 1}`;
    if (used.has(s.id)) s.id = uid();
    used.add(s.id);
    const qs = new Set();
    s.questions = (s.questions || []).map((q, j) => {
      q.id = !fresh && id(q.id) && !qs.has(q.id) ? q.id : `${s.id}:q${j + 1}`;
      if (qs.has(q.id)) q.id = uid();
      qs.add(q.id);
      const options = new Set();
      q.explanations ??= q.a.map(()=>'');
      q.optionIds = q.a.map((_, k) => {
        let option = !fresh && id(q.optionIds?.[k]) ? q.optionIds[k] : `${q.id}:a${k + 1}`;
        if (options.has(option)) option = uid();
        options.add(option); return option;
      });
      return q;
    });
    return s;
  });
  if (fresh) { delete p.builtinVersion; delete p.builtinId; p.contentVersion = 1; }
  return p;
}
export const builtins = [
  {...demo, steps:demo.steps.map(s => s.type === 'quiz' ? {...s,questions} : s)},
  pharmacologyPath, semester5Path,
].map(p => normalizePath({...p,builtinId:p.id,builtinVersion:1}));
export function emptyState() {
  return {schemaVersion:SCHEMA,revision:0,paths:structuredClone(builtins),progress:{},drafts:{},installed:builtins.map(p=>p.id),dismissedUpdates:{}};
}
export function migrateLegacy(raw) {
  if (raw.paths === null && raw.progress === null && raw.installed === null) return emptyState();
  const paths = raw.paths === null ? [structuredClone(builtins[0])] : JSON.parse(raw.paths);
  const oldProgress = raw.progress === null ? {} : JSON.parse(raw.progress);
  const installed = raw.installed === null ? [] : JSON.parse(raw.installed);
  // Never replace malformed existing data with an empty catalogue.
  if (!Array.isArray(paths) || paths.some(p => pathErrors(p).length || !id(p.id)) || new Set(paths.map(p=>p.id)).size !== paths.length || !object(oldProgress) || !Array.isArray(installed) || installed.some(v=>!id(v))) throw Error('De tidligere browserdata har et ukendt format.');
  const state = {...emptyState(),paths:paths.map(p=>normalizePath(p)),progress:{},installed:[...new Set([builtins[0].id,...installed])]};
  for (const p of state.paths) {
    const baseline = builtins.find(b=>b.id===p.id);
    if (baseline) { p.builtinId=p.id; p.builtinVersion=1; }
    const old = oldProgress[p.id];
    if (!old) continue;
    if (!object(old) || (old.done !== undefined && (!Array.isArray(old.done) || old.done.some(n=>!Number.isInteger(n)))) || (old.notes !== undefined && (!object(old.notes) || Object.values(old.notes).some(n=>typeof n!=='string')))) throw Error('Den tidligere progression kan ikke læses sikkert.');
    const stepId = n => p.steps[n]?.id;
    state.progress[p.id] = {...old,done:(old.done||[]).map(stepId).filter(Boolean),last:stepId(old.last) || p.steps[0]?.id,notes:{},answers:{},legacy:structuredClone(old)};
    for (const [key, value] of Object.entries(old.notes||{})) if (stepId(key)) state.progress[p.id].notes[stepId(key)] = value;
  }
  // Keep records for removed paths in canonical form so a later backup can recover them.
  for (const [key, old] of Object.entries(oldProgress)) if (!state.progress[key]) {
    if (!id(key) || !object(old)) throw Error('Ukendt progressionsformat.');
    state.progress[key] = {done:[],notes:{},answers:{},legacy:structuredClone(old)};
  }
  for (const p of builtins.slice(1)) if (!state.installed.includes(p.id)) {
    if (!state.paths.some(x=>x.id===p.id)) state.paths.push(structuredClone(p));
    state.installed.push(p.id);
  }
  return state;
}
export function validateState(state) {
  try { return validStateShape(state); } catch { return false; }
}
function validStateShape(state) {
  if (!object(state) || state.schemaVersion !== SCHEMA || !Number.isInteger(state.revision) || !Array.isArray(state.paths) || !object(state.progress) || !object(state.drafts) || !Array.isArray(state.installed) || !object(state.dismissedUpdates) || state.installed.some(v=>!id(v))) return false;
  if (state.paths.some(p=>!id(p.id) || pathErrors(p).length || !Number.isInteger(p.contentVersion)) || new Set(state.paths.map(p=>p.id)).size !== state.paths.length) return false;
  for (const p of state.paths) {
    if (new Set(p.steps.map(s=>s.id)).size !== p.steps.length) return false;
    for (const s of p.steps) {
      if (!id(s.id) || !Array.isArray(s.questions) || new Set(s.questions.map(q=>q.id)).size !== s.questions.length) return false;
      if (s.questions.some(q=>!id(q.id)||!Array.isArray(q.optionIds)||q.optionIds.length!==q.a.length||q.optionIds.some(v=>!id(v))||new Set(q.optionIds).size!==q.optionIds.length)) return false;
    }
  }
  for (const [key,p] of Object.entries(state.progress)) {
    if (!id(key)||!object(p)||!Array.isArray(p.done)||p.done.some(v=>!id(v))||!object(p.notes)||Object.values(p.notes).some(v=>typeof v!=='string')||!object(p.answers)) return false;
    for (const answers of Object.values(p.answers)) if (!object(answers)||Object.values(answers).some(v=>!id(v))) return false;
  }
  for (const [key,d] of Object.entries(state.drafts)) {
    if (!id(key)||!object(d)||!object(d.path)||d.path.id!==key||typeof d.path.title!=='string'||typeof d.path.description!=='string'||!Array.isArray(d.path.steps)||!Number.isInteger(d.path.semester)||d.path.semester<1||d.path.semester>7||!validPathSubjects(d.path,true)) return false;
    // Incomplete drafts may contain blank fields, but must still have a safe structure.
    if (d.path.steps.some(s=>!object(s)||!id(s.id)||typeof s.title!=='string'||typeof s.text!=='string'||!Object.hasOwn(types,s.type)||!Array.isArray(s.questions)||s.questions.some(q=>!object(q)||!id(q.id)||typeof q.q!=='string'||typeof q.why!=='string'||!Array.isArray(q.a)||q.a.some(a=>typeof a!=='string')||!Array.isArray(q.optionIds)||q.optionIds.length!==q.a.length||q.optionIds.some(v=>!id(v))||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.a.length))) return false;
    if (d.path.steps.some(s=>s.questions.some(q=>q.explanations!==undefined&&(!Array.isArray(q.explanations)||q.explanations.length!==q.a.length||q.explanations.some(e=>typeof e!=='string'))))) return false;
    if (d.path.steps.some(s=>['image','imageAlt','media','guide'].some(k=>s[k]!==undefined&&typeof s[k]!=='string'))) return false;
  }
  return true;
}
// Only learning content invalidates completion. Titles, metadata and reordering do not.
export function learningSignature(s) {
  return JSON.stringify({type:s.type,text:s.text,guide:s.guide||'',image:s.image||'',media:s.media||'',questions:(s.questions||[]).map(q=>({id:q.id,q:q.q,why:q.why,correct:q.optionIds[q.correct],options:q.a.map((a,i)=>[q.optionIds[i],a]).sort(([a],[b])=>a.localeCompare(b))})).sort((a,b)=>a.id.localeCompare(b.id))});
}
export function reconcileProgress(before, after, record) {
  if (!record || !before) return record;
  const next = structuredClone(record);
  const changed = before.steps.filter(old => {const s=after.steps.find(s=>s.id===old.id);return !s || learningSignature(s)!==learningSignature(old);}).map(s=>s.id);
  next.done = next.done.filter(id=>!changed.includes(id));
  for (const id of changed) {
    next.archivedAnswers ??= {};
    if (next.answers[id]) next.archivedAnswers[id]=next.answers[id];
    delete next.answers[id];
  }
  // Notes, including notes on removed steps, remain in the record and backup export.
  if (!after.steps.some(s=>s.id===next.last)) next.last=after.steps[0]?.id;
  return next;
}
export function commitPath(state, draft) {
  const next=structuredClone(state), previous=next.paths.find(p=>p.id===draft.id), path=normalizePath(draft);
  path.contentVersion=previous ? previous.contentVersion+(JSON.stringify(previous)!==JSON.stringify(path)?1:0) : 1;
  const i=next.paths.findIndex(p=>p.id===path.id);
  if(i<0) next.paths.push(path); else next.paths[i]=path;
  if(next.progress[path.id]) next.progress[path.id]=reconcileProgress(previous,path,next.progress[path.id]);
  delete next.drafts[path.id];
  return next;
}
export function addNewBuiltins(state, available=builtins) {
  const next=structuredClone(state);
  for (const path of available) if (!next.installed.includes(path.id)) {
    if (!next.paths.some(p=>p.id===path.id)) next.paths.push(structuredClone(path));
    next.installed.push(path.id);
  }
  return next;
}
export function updatesFor(state, available=builtins) {
  return available.filter(b=>state.paths.some(p=>p.id===b.id&&(p.builtinVersion||0)<b.builtinVersion)&&(state.dismissedUpdates[b.id]||0)<b.builtinVersion);
}
export function acceptUpdate(state, update) {
  const next=structuredClone(state), i=next.paths.findIndex(p=>p.id===update.id);
  if(i<0) return next;
  // Always keep the local edition and its progress, even if we cannot detect edits.
  const local=next.paths[i], copy=normalizePath(local,true);
  copy.title+=' (min tidligere udgave)';
  if(next.progress[local.id]) {
    const old=next.progress[local.id], mapped=structuredClone(old), ids=new Map(local.steps.map((s,j)=>[s.id,copy.steps[j].id]));
    mapped.done=old.done.map(id=>ids.get(id)).filter(Boolean); mapped.last=ids.get(old.last)||copy.steps[0].id;
    mapped.notes=Object.fromEntries(Object.entries(old.notes).map(([id,n])=>[ids.get(id)||id,n])); mapped.answers={};
    local.steps.forEach((s,j)=>{
      const responses=old.answers[s.id];
      if(!responses)return;
      const target=copy.steps[j];
      mapped.answers[target.id]={};
      s.questions.forEach((q,k)=>{
        const option=q.optionIds.indexOf(responses[q.id]);
        if(option>=0)mapped.answers[target.id][target.questions[k].id]=target.questions[k].optionIds[option];
      });
    });
    next.progress[copy.id]=mapped;
  }
  next.paths.splice(i,1,structuredClone(update),copy);
  delete next.progress[update.id];
  return next;
}
export function newStep(type='text') {
  return {id:uid(),title:types[type],type,text:'',questions:[],...(type==='case'?{text:'Situation: Beskriv en fiktiv patient og relevante observationer.\n\nOpgave: Hvad vil du undersøge og gøre først?'}:type==='reflection'?{text:'Hvilke observationer vil du prioritere, og hvordan begrunder du dine handlinger?',guide:'Overvej observationer, faglig begrundelse, patientsikkerhed og opfølgning.'}:{}),...(type==='quiz'?{questions:[newQuestion()]}:{})};
}
export function newQuestion() {return {id:uid(),q:'',a:['','',''],optionIds:[uid(),uid(),uid()],explanations:['','',''],correct:0,why:''};}
export function duplicateStep(step) {return normalizePath({id:uid(),steps:[structuredClone(step)]},true).steps[0];}
