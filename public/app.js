import {subjects,safeURL,youtubeEmbed} from './data.js';
import {getPathProgress} from './progress.js';
import {renderHome} from './home.js';
import {renderLearn} from './learner.js';
import {renderEditor,collectEditor} from './editor.js';
import {esc,download} from './ui.js';
import {openStorage} from './storage.js';
import {SCHEMA,uid,builtins,emptyState,normalizePath,pathErrors,validateState,commitPath,updatesFor,acceptUpdate,newStep,newQuestion,duplicateStep} from './model.js';
const $=selector=>document.querySelector(selector);
const clone=value=>structuredClone(value);
const MAX_FILE=50*1024*1024;
let store,state,revision=0,view='home',semester=1,subject=subjects[0],current,index=0;
let teacherUnlocked=false,draft=null,selected='metadata',preview=false,previewAnswers={},undo=[];
let storageError='',notice='',queue=Promise.resolve(),dirty=false,writeNumber=0,savedNumber=0,timer,busy=false;
let errors=[],expanded=matchMedia('(min-width: 801px)').matches;

function exportFile(value,name) {
  if(new Blob([JSON.stringify(value)]).size>MAX_FILE) {alert('Filen er større end 50 MB. Eksportér læringsstierne enkeltvis fra editoren.');return;}
  download(value,name);
}
function backup() {exportFile({format:'laeringsstier-backup',schemaVersion:SCHEMA,state},'laeringsstier-sikkerhedskopi.json');}
function displayStorage() {
  const el=$('#storage-status');
  if(el) {
    el.hidden=!storageError;
    el.innerHTML=storageError?`<strong>Ændringerne er ikke gemt.</strong> ${esc(storageError)} <button data-action="retry-save">Prøv at gemme igen</button><button data-action="backup">Hent sikkerhedskopi</button>`:'';
  }
  const status=$('#draft-status');
  if(status) status.textContent=storageError?'Kladde ikke gemt. Hold siden åben, og hent en kopi af dit arbejde.':dirty?'Gemmer kladde…':'Kladde gemt på denne enhed. Brug »Gem læringssti« for at opdatere elevvisningen.';
}
function persist({retry=false}={}) {
  if(retry) storageError='';
  const snapshot=clone(state),number=++writeNumber;
  dirty=true;displayStorage();
  const job=queue.then(async()=>{
    if(storageError) return false;
    try {
      snapshot.revision=revision;
      const saved=await store.save(snapshot);
      revision=saved.revision;state.revision=revision;savedNumber=number;
      dirty=savedNumber<writeNumber;displayStorage();return true;
    } catch(error) {storageError=error.message;dirty=true;displayStorage();return false;}
  });
  queue=job.catch(()=>false);return job;
}
function stashDraft() {
  if(!draft) return;
  state.drafts[draft.id]={path:clone(draft),selected,updatedAt:Date.now()};
}
function autosave() {
  collectEditor(draft);stashDraft();dirty=true;displayStorage();clearTimeout(timer);
  timer=setTimeout(()=>persist(),350);
}
async function flushDraft() {clearTimeout(timer);if(draft){collectEditor(draft);stashDraft();return persist();}return true;}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&draft){clearTimeout(timer);stashDraft();persist();}});

function header() {
  return `<a class="skip-link" href="#main-content">Spring til indhold</a><header><a href="#/" class="brand"><span class="logo" aria-hidden="true">⌁</span>Læringsstier<span class="beta">PROTOTYPE</span></a><nav aria-label="Hovednavigation"><a href="#/" class="${view==='home'?'active':''}" ${view==='home'?'aria-current="page"':''}>Udforsk</a><a href="#/underviser" class="${view==='teacher'?'active':''}" ${view==='teacher'?'aria-current="page"':''}>Underviser →</a></nav></header>`;
}
function learningView(path,stepIndex,answerOverride) {
  const record=state.progress[path.id]||{done:[],notes:{},answers:{}};
  const step=path.steps[stepIndex],stored=record.answers?.[step.id]||{};
  const answers=answerOverride||Object.fromEntries(step.questions.flatMap((q,i)=>stored[q.id]&&q.optionIds.includes(stored[q.id])?[[i,q.optionIds.indexOf(stored[q.id])]]:[]));
  const uiRecord={...record,done:record.done.map(id=>path.steps.findIndex(s=>s.id===id)),notes:Object.fromEntries(path.steps.map((s,i)=>[i,record.notes[s.id]||'']))};
  return renderLearn({paths:[path],current:path.id,index:stepIndex,progress:{[path.id]:uiRecord},answers,expanded});
}
function render(focus) {
  window.speechSynthesis?.cancel();
  const content=view==='home'?renderHome({paths:state.paths,progress:state.progress,semester,subject}):view==='learn'?learningView(state.paths.find(p=>p.id===current),index):view==='missing'?'<h1 tabindex="-1">Læringsstien blev ikke fundet</h1><p>Linket peger på indhold, der ikke findes på denne enhed.</p><a class="primary" href="#/">Find en læringssti</a>':teacher();
  $('#app').innerHTML=header()+`<div id="storage-status" class="storage-status" role="alert" hidden></div><main id="main-content" tabindex="-1">${notice?`<p class="notice" role="status">${esc(notice)}</p>`:''}${content}</main><footer><span class="brand small">⌁ Læringsstier</span><span>Ingen konto · Gemmes på din enhed</span><span>Version 0.2.0</span></footer>`;
  if(draft&&preview&&teacherUnlocked&&view==='teacher') {
    const i=draft.steps.findIndex(s=>s.id===selected);
    if(i>=0) {
      const container=document.createElement('div');container.innerHTML=learningView(draft,i,previewAnswers);
      const lesson=container.querySelector('.lesson');lesson.querySelector('.lesson-footer')?.remove();
      lesson.querySelector(':scope > .result')?.remove();
      $('#preview-lesson').append(lesson);
    }
  }
  displayStorage();
  $('.step-navigation')?.addEventListener('toggle',e=>{expanded=e.target.open;});
  const target=focus?$(focus):null;
  if(target) target.focus({preventScroll:focus.startsWith('[data-')||focus.startsWith('#feedback')});
}
function teacher() {
  if(!teacherUnlocked) return `<section class="teacher-access"><div class="eyebrow">UNDERVISERADGANG</div><h1>Dit faglige værksted</h1><p>Indtast underviserkoden for at oprette og redigere læringsstier.</p><form id="teacher-login"><label for="teacher-code">Underviserkode</label><input id="teacher-code" type="password" inputmode="numeric" autocomplete="off" required aria-describedby="code-error"><p id="code-error" role="alert"></p><button class="primary" type="submit">Lås op →</button></form><p>Adgangen låses ved genindlæsning. Koden er en enkel spærring på denne enhed og beskytter ikke fortroligt indhold.</p></section>`;
  if(draft) return renderEditor(draft,selected,{preview,errors,canUndo:undo.length>0});
  const updates=updatesFor(state),drafts=Object.values(state.drafts);
  return `<div class="section-row"><div><div class="eyebrow">DIT FAGLIGE VÆRKSTED</div><h1>Underviser</h1></div><div class="toolbar"><button class="secondary" data-action="lock-teacher">Lås underviseradgang</button><button class="primary" data-action="new">＋ Ny læringssti</button></div></div><p class="notice">Ændringer og kladder gemmes kun på denne enhed. For at dele indhold skal du eksportere det til import på andre enheder eller lade det indgå i projektets næste udgivelse. Brug fiktive cases uden personoplysninger.</p>
    <div class="toolbar"><button class="secondary" data-action="export">↓ Eksportér læringsstier</button><label class="secondary file-button">↑ Importér læringsstier eller kladde<input id="import" type="file" accept="application/json"></label><button class="secondary" data-action="backup">Hent fuld sikkerhedskopi</button><label class="secondary file-button">Gendan sikkerhedskopi<input id="restore" type="file" accept="application/json"></label><button class="secondary" data-action="previous-backup">Hent forrige indholdsudgave</button></div>
    ${updates.length?`<section class="notice"><h2>Opdateringer til indbyggede læringsstier</h2><p>Ved opdatering beholder du din nuværende udgave som en separat kopi med progression og noter. Den nye udgave starter uden progression.</p>${updates.map(p=>`<p><strong>${esc(p.title)}</strong> · udgave ${p.builtinVersion}<button data-update="${esc(p.id)}">Tilføj ny udgave</button><button data-dismiss-update="${esc(p.id)}">Behold nuværende udgave</button></p>`).join('')}</section>`:''}
    ${drafts.length?`<section class="draft-list"><h2>Dine kladder</h2>${drafts.map(d=>`<div><strong>${esc(d.path.title||'Ny læringssti')}</strong><span>Gemt ${new Date(d.updatedAt).toLocaleString('da-DK')}</span><button class="secondary" data-edit="${esc(d.path.id)}">Fortsæt kladde</button><button data-discard="${esc(d.path.id)}">Slet kladde</button></div>`).join('')}</section>`:''}
    <h2>Læringsstier på denne enhed</h2><div class="teacher-list">${state.paths.map((p,i)=>`<div><span><b>${esc(p.title)}</b><small>${p.semester}. semester · ${esc(p.subject)} · ${p.steps.length} trin · version ${p.contentVersion}</small></span><button class="secondary" data-edit="${esc(p.id)}">Redigér</button><button data-path-move="${i}:-1" ${i===0?'disabled':''} aria-label="Flyt læringssti op">↑</button><button data-path-move="${i}:1" ${i===state.paths.length-1?'disabled':''} aria-label="Flyt læringssti ned">↓</button><button data-delete="${esc(p.id)}">Slet</button></div>`).join('')}</div>`;
}
function go(hash) {if(location.hash===hash)route();else location.hash=hash;}
function pathRoute(path,step) {return `#/sti/${encodeURIComponent(path.id)}/${encodeURIComponent(step.id)}`;}
function recordFor(path) {return state.progress[path.id]??={done:[],notes:{},answers:{}};}
async function route() {
  await flushDraft();draft=null;preview=false;errors=[];undo=[];
  let parts;
  try {parts=location.hash.slice(1).split('/').map(decodeURIComponent);} catch {parts=[];}
  const path=state.paths.find(p=>p.id===parts[2]);
  if(parts[1]==='sti'&&path) {
    current=path.id;index=path.steps.findIndex(s=>s.id===parts[3]);
    if(index<0)index=getPathProgress(path,state.progress[path.id]).lastIndex;
    view='learn';const record=recordFor(path);record.started=true;record.last=path.steps[index].id;record.updatedAt=Date.now();persist();
  } else if(parts[1]==='sti')view='missing';
  else if(parts[1]==='underviser') {
    view='teacher';if(teacherUnlocked&&parts[2]) openDraft(parts[2]);
  } else view='home';
  render(view==='learn'?'#lesson-heading':view==='teacher'&&!teacherUnlocked?'#teacher-code':'main h1');
  if(location.hash==='#explore') $('#explore')?.scrollIntoView();else scrollTo(0,0);
}
function openDraft(id) {
  const saved=state.drafts[id],path=saved?.path||state.paths.find(p=>p.id===id);
  if(!path)return;
  draft=clone(path);selected=saved?.selected||'metadata';
  if(selected!=='metadata'&&!draft.steps.some(s=>s.id===selected))selected='metadata';
}
window.addEventListener('hashchange',()=>{if(state&&!['#main-content','#explore'].includes(location.hash))route();});

async function changeStructure(operation,focus='#editor-heading') {
  collectEditor(draft);undo.push(clone(draft));if(undo.length>15)undo.shift();operation();errors=[];preview=false;
  stashDraft();await persist();render(focus);
}
function selectedStep() {return draft?.steps.find(s=>s.id===selected);}
async function click(event) {
  const button=event.target.closest('button,[data-action]');if(!button||button.disabled)return;
  const d=button.dataset,a=d.action;
  if(a)event.preventDefault();
  if(busy)return;
  busy=true;
  try {await handle(d,a);} catch(error){notice='Handlingen kunne ikke gennemføres: '+error.message;render();} finally {busy=false;}
}
async function handle(d,a) {
  notice='';
  if(a==='backup') {if(draft)stashDraft();backup();return;}
  if(a==='retry-save') {if(draft)stashDraft();await persist({retry:true});return;}
  if(d.semester) {semester=Number(d.semester);render(`[data-semester="${semester}"]`);return;}
  if(d.subject) {subject=d.subject;render(`[data-subject="${CSS.escape(subject)}"]`);return;}
  if(d.open||d.resume) {const p=state.paths.find(p=>p.id===(d.open||d.resume));go(pathRoute(p,p.steps[getPathProgress(p,state.progress[p.id]).lastIndex]));return;}
  if(a==='home'||a==='teacher') {go(a==='home'?'#/':'#/underviser');return;}
  const isPreview=Boolean(draft&&preview&&view==='teacher');
  if(d.answer) {
    const [q,i]=d.answer.split(':').map(Number),path=isPreview?draft:state.paths.find(p=>p.id===current),step=isPreview?selectedStep():path.steps[index];
    if(isPreview) previewAnswers[q]=i;
    else {const record=recordFor(path);record.answers[step.id]??={};record.answers[step.id][step.questions[q].id]=step.questions[q].optionIds[i];await persist();}
    const y=scrollY;render(`#feedback-${q}`);scrollTo(0,y);return;
  }
  if(d.step!==undefined) {const p=state.paths.find(p=>p.id===current);go(pathRoute(p,p.steps[Number(d.step)]));return;}
  if(['previous','complete','retry','speak','stop','media'].includes(a)) {
    const p=isPreview?draft:state.paths.find(p=>p.id===current),s=isPreview?selectedStep():p?.steps[index];if(!s)return;
    if(a==='previous'&&index>0)go(pathRoute(p,p.steps[index-1]));
    if(a==='complete'&&!isPreview) {
      const record=recordFor(p),all=s.questions.every(q=>record.answers[s.id]?.[q.id]);if(!all)return;
      if(!record.done.includes(s.id))record.done.push(s.id);record.updatedAt=Date.now();await persist();
      if(index<p.steps.length-1)go(pathRoute(p,p.steps[index+1]));else {notice='Godt gået! Læringsstien er gennemført.';render('#lesson-heading');}
    }
    if(a==='retry') {if(isPreview)previewAnswers={};else {delete recordFor(p).answers[s.id];await persist();}render(isPreview?'#editor-heading':'#lesson-heading');}
    if(a==='speak') {
      if(!window.speechSynthesis){alert('Oplæsning understøttes ikke i denne browser. Læs teksten i trinnet.');return;}
      speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(s.text);speech.lang='da-DK';speechSynthesis.speak(speech);
    }
    if(a==='stop')window.speechSynthesis?.cancel();
    if(a==='media') {
      const url=safeURL(s.media),yt=youtubeEmbed(url);if(!url)return;
      if(yt)$('#media').innerHTML=`<iframe title="Video til læringstrinnet" src="${yt}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
      else if(/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(url))$('#media').innerHTML=`<audio controls src="${esc(url)}"></audio>`;
      else if(/\.(mp4|webm)(\?|$)/i.test(url))$('#media').innerHTML=`<video controls src="${esc(url)}"></video>`;
      else window.open(url,'_blank','noopener,noreferrer');
    }return;
  }
  if(!teacherUnlocked)return;
  if(a==='lock-teacher') {await flushDraft();draft=null;teacherUnlocked=false;go('#/underviser');return;}
  if(a==='new') {
    await flushDraft();const path=normalizePath({id:uid(),title:'',description:'',semester,subject:subjects[1],steps:[newStep()]});
    state.drafts[path.id]={path,selected:'metadata',updatedAt:Date.now()};await persist();go(`#/underviser/${path.id}`);return;
  }
  if(d.edit) {await flushDraft();go(`#/underviser/${encodeURIComponent(d.edit)}`);return;}
  if(a==='close-editor') {await flushDraft();go('#/underviser');return;}
  if(d.discard&&confirm('Slet denne kladde? Den gemte læringssti ændres ikke.')) {delete state.drafts[d.discard];await persist();render();return;}
  if(d.delete&&confirm('Slet læringsstien fra denne enhed? En kopi af den forrige indholdsudgave gemmes automatisk.')) {
    state.paths=state.paths.filter(p=>p.id!==d.delete);delete state.drafts[d.delete];await persist();render();return;
  }
  if(d.pathMove) {const [i,delta]=d.pathMove.split(':').map(Number);[state.paths[i],state.paths[i+delta]]=[state.paths[i+delta],state.paths[i]];await persist();render(`[data-path-move="${i+delta}:${delta}"]`);return;}
  if(d.update) {state=acceptUpdate(state,builtins.find(p=>p.id===d.update));await persist();render();return;}
  if(d.dismissUpdate) {state.dismissedUpdates[d.dismissUpdate]=builtins.find(p=>p.id===d.dismissUpdate).builtinVersion;await persist();render();return;}
  if(a==='export') {exportFile({format:'laeringsstier-paths',schemaVersion:SCHEMA,paths:state.paths},'laeringsstier.json');return;}
  if(a==='previous-backup') {const old=await store.backup();if(old)exportFile({format:'laeringsstier-backup',schemaVersion:SCHEMA,state:old},'laeringsstier-forrige-udgave.json');else {notice='Der findes endnu ingen tidligere indholdsudgave.';render();}return;}
  if(!draft)return;
  if(a==='export-draft') {stashDraft();exportFile({format:'laeringsstier-draft',schemaVersion:SCHEMA,draft:state.drafts[draft.id]},'laeringssti-kladde.json');return;}
  if(d.editorStep) {await flushDraft();selected=d.editorStep;preview=false;errors=[];previewAnswers={};stashDraft();await persist();render('#editor-heading');return;}
  if(a==='toggle-preview') {await flushDraft();preview=!preview;previewAnswers={};render('#editor-heading');return;}
  if(a==='undo'&&undo.length) {draft=undo.pop();if(!draft.steps.some(s=>s.id===selected))selected='metadata';stashDraft();await persist();render('#editor-heading');return;}
  if(a==='add-step') {const type=$('#template').value;await changeStructure(()=>{const s=newStep(type);draft.steps.push(s);selected=s.id;});return;}
  const step=selectedStep();if(!step)return;
  if(a==='duplicate-step') {await changeStructure(()=>{const copy=duplicateStep(step);copy.title+=' (kopi)';draft.steps.splice(draft.steps.indexOf(step)+1,0,copy);selected=copy.id;});return;}
  if(a==='remove-step'&&confirm('Fjern dette trin fra kladden? Du kan fortryde, indtil editoren lukkes.')) {await changeStructure(()=>{draft.steps=draft.steps.filter(s=>s.id!==selected);selected='metadata';});return;}
  if(d.stepMove) {await changeStructure(()=>{const i=draft.steps.indexOf(step),j=i+Number(d.stepMove);if(j>=0&&j<draft.steps.length)[draft.steps[i],draft.steps[j]]=[draft.steps[j],draft.steps[i]];});return;}
  if(a==='add-question') {await changeStructure(()=>step.questions.push(newQuestion()));return;}
  if(d.removeQuestion!==undefined) {await changeStructure(()=>step.questions.splice(Number(d.removeQuestion),1));return;}
  if(d.duplicateQuestion!==undefined) {await changeStructure(()=>{const i=Number(d.duplicateQuestion),q=clone(step.questions[i]);q.id=uid();q.optionIds=q.a.map(()=>uid());step.questions.splice(i+1,0,q);});return;}
  if(d.questionMove) {await changeStructure(()=>{const [i,delta]=d.questionMove.split(':').map(Number);[step.questions[i],step.questions[i+delta]]=[step.questions[i+delta],step.questions[i]];});return;}
  if(d.addOption!==undefined) {await changeStructure(()=>{const q=step.questions[Number(d.addOption)];q.a.push('');q.optionIds.push(uid());});return;}
  if(d.removeOption) {await changeStructure(()=>{const [i,k]=d.removeOption.split(':').map(Number),q=step.questions[i];if(q.a.length<=2)return;q.a.splice(k,1);q.optionIds.splice(k,1);q.correct=q.correct===k?0:q.correct>k?q.correct-1:q.correct;});return;}
  if(d.optionMove) {await changeStructure(()=>{const [i,k,delta]=d.optionMove.split(':').map(Number),q=step.questions[i],correct=q.optionIds[q.correct];[q.a[k],q.a[k+delta]]=[q.a[k+delta],q.a[k]];[q.optionIds[k],q.optionIds[k+delta]]=[q.optionIds[k+delta],q.optionIds[k]];q.correct=q.optionIds.indexOf(correct);});}
}
$('#app').addEventListener('click',click);
$('#app').addEventListener('input',e=>{
  if(e.target.closest('#editor')&&!preview)autosave();
  if(e.target.id==='reflection'&&view==='learn') {const p=state.paths.find(p=>p.id===current);recordFor(p).notes[p.steps[index].id]=e.target.value;dirty=true;clearTimeout(timer);timer=setTimeout(()=>persist(),350);}
});
$('#app').addEventListener('submit',async e=>{
  e.preventDefault();
  if(e.target.id==='teacher-login') {
    if($('#teacher-code').value!=='7269'){$('#code-error').textContent='Koden er forkert. Prøv igen.';$('#teacher-code').setAttribute('aria-invalid','true');$('#teacher-code').select();return;}
    teacherUnlocked=true;await route();return;
  }
  if(e.target.id!=='editor'||!teacherUnlocked||busy)return;
  busy=true;clearTimeout(timer);collectEditor(draft);errors=pathErrors(draft);
  try {
    if(errors.length){stashDraft();await persist();render('#validation');return;}
    state=commitPath(state,draft);
    if(await persist()) {draft=null;notice='Læringsstien er gemt på denne enhed.';go('#/underviser');}
    else {stashDraft();render();}
  } finally {busy=false;}
});
$('#app').addEventListener('change',async e=>{
  if(!teacherUnlocked)return;
  if(e.target.closest('#editor')&&!preview) {autosave();if(e.target.matches('[data-field="type"]')) {await flushDraft();render('[data-field="type"]');}}
  if(e.target.id==='upload-image') {
    const file=e.target.files[0];if(!file)return;
    if(file.size>1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){alert('Vælg PNG, JPEG eller WebP under 1 MB.');return;}
    const draftId=draft.id,stepId=selected,reader=new FileReader();
    reader.onload=async()=>{if(!teacherUnlocked||draft?.id!==draftId)return;const step=draft.steps.find(s=>s.id===stepId);if(!step)return;step.image=reader.result;stashDraft();await persist();render('#editor-heading');};
    reader.readAsDataURL(file);
  }
  if(['import','restore'].includes(e.target.id)) {
    const restore=e.target.id==='restore';
    try {
      const file=e.target.files[0];if(!file)return;if(file.size>MAX_FILE)throw Error('Filen må højst fylde 50 MB.');
      const incoming=JSON.parse(await file.text());if(!teacherUnlocked)return;
      if(restore) {
        if(incoming.format!=='laeringsstier-backup'||!validateState(incoming.state))throw Error('Sikkerhedskopien har et ukendt format eller er fra en nyere version.');
        if(!confirm('Erstat alle lokale læringsstier, kladder og fremskridt med sikkerhedskopien? Hent først en kopi af dine nuværende data, hvis du vil beholde dem.'))return;
        state={...incoming.state,revision};
      } else if(incoming.format==='laeringsstier-draft'&&incoming.schemaVersion===SCHEMA) {
        const record=clone(incoming.draft),path=normalizePath(record.path,true),test=emptyState();
        record.path=path;record.selected='metadata';record.updatedAt=Date.now();test.drafts[path.id]=record;
        if(!validateState(test))throw Error('Kladdefilen er ugyldig.');state.drafts[path.id]=record;
      } else {
        const paths=Array.isArray(incoming)?incoming:incoming.format==='laeringsstier-paths'&&incoming.schemaVersion===SCHEMA?incoming.paths:null;
        if(!Array.isArray(paths)||!paths.length||paths.some(p=>pathErrors(p).length))throw Error('Filen indeholder ikke gyldige læringsstier.');
        state.paths.push(...paths.map(p=>normalizePath(p,true)));
      }
      if(await persist()){notice=restore?'Sikkerhedskopien er gendannet.':'Importen er gemt på denne enhed.';render();}
    }catch(error){alert('Filen kunne ikke importeres. '+error.message);}
  }
});

async function recovery(error) {
  $('#app').innerHTML=`<main class="recovery"><h1>Dine lokale data kræver opmærksomhed</h1><p role="alert">${esc(error.message)}</p><p>De oprindelige data er bevaret. Hent en kopi, før du gendanner eller starter forfra.</p><div class="toolbar"><button id="raw-backup">Hent de oprindelige data</button><button id="reload">Prøv igen</button>${error.backup&&validateState(error.backup)?'<button id="recover-backup">Gendan forrige indholdsudgave</button>':''}<label class="secondary file-button">Indlæs sikkerhedskopi<input type="file" id="recover-file" accept="application/json"></label>${store?'<button id="reset">Start forfra på denne enhed</button>':''}</div></main>`;
  $('#raw-backup').onclick=()=>download({format:'laeringsstier-recovery',raw:error.raw,backup:error.backup},'laeringsstier-oprindelige-data.json');
  $('#reload').onclick=()=>location.reload();
  async function replace(replacement) {
    if(!store){alert('Browserens lokale lagring skal være tilgængelig først.');return;}
    try {await store.save(replacement,{replace:true});location.reload();}catch(e){alert(e.message);}
  }
  if($('#reset'))$('#reset').onclick=()=>{if(confirm('Start med de indbyggede læringsstier uden progression? Hent først de oprindelige data.'))replace(emptyState());};
  if($('#recover-backup'))$('#recover-backup').onclick=()=>{if(confirm('Gendan den forrige indholdsudgave? Nyere ændringer vil ikke være med.'))replace(error.backup);};
  $('#recover-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>MAX_FILE)throw Error('Filen er for stor.');const data=JSON.parse(await file.text());if(data.format!=='laeringsstier-backup'||!validateState(data.state))throw Error('Ugyldig sikkerhedskopi.');if(confirm('Gendan alle data fra sikkerhedskopien?'))await replace(data.state);}catch(e){alert(e.message);}};
}
try {store=await openStorage();state=await store.load();revision=state.revision;await route();}
catch(error){await recovery(error);}
