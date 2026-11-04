import {syncCatalog,publicPath} from './publication.js';
import {fetchCatalog,publisherConfig,sendPublication} from './publisher-client.js';
import {renderPublishDialog,publicationStatus,historyView} from './publisher-ui.js';
import {chooseAnswer} from './quiz.js';
import {ALL_SUBJECTS,cleanSubject,subjectKey,validSubject,pathSubjects,subjectLabel,uniqueSubjects,editorSubjects,semesterSubjects} from './subjects.js';
import {subjects,safeURL,youtubeEmbed} from './data.js';
import {getPathProgress} from './progress.js';
import {renderHome} from './home.js';
import {renderLearn} from './learner.js';
import {renderEditor,collectEditor} from './editor.js';
import {esc,download} from './ui.js';
import {openStorage} from './storage.js';
import {uid,emptyState,normalizePath,pathErrors,validateState,newStep,newQuestion,duplicateStep} from './model.js';
const $=selector=>document.querySelector(selector);
const clone=value=>structuredClone(value);
const MAX_FILE=50*1024*1024;
let store,state,revision=0,view='home',semester=1,subject=subjects[0],current,index=0;
let teacherUnlocked=false,draft=null,selected='metadata',preview=false,fullPreview=false,previewAnswers={},inspectedAnswers={},undo=[];
let storageError='',notice='',queue=Promise.resolve(),dirty=false,writeNumber=0,savedNumber=0,timer,busy=false;
let draftBaseRevision=null,publishEndpoint=null,catalogWarning='';
let errors=[],expanded=matchMedia('(min-width: 801px)').matches;

function displayStorage() {
  const el=$('#storage-status');
  if(el) {
    el.hidden=!storageError;
    el.innerHTML=storageError?`<strong>Ændringerne er ikke gemt.</strong> ${esc(storageError)} <button data-action="retry-save">Prøv at gemme igen</button>`:'';
  }
  const status=$('#draft-status');
  if(status) status.textContent=storageError?'Kladde ikke gemt. Hold siden åben, og prøv at gemme igen.':dirty?'Gemmer kladde…':'Kladde gemt på denne enhed. Udgivelse kræver din aktive godkendelse og udgivelseskoden.';
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
  state.drafts[draft.id]={path:clone(draft),selected,updatedAt:Date.now(),baseRevision:draftBaseRevision};
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
  return renderLearn({paths:[path],current:path.id,index:stepIndex,progress:{[path.id]:uiRecord},answers,expanded,inspected:inspectedAnswers})+(answerOverride?'':historyView(state,path.id));
}
function render(focus) {
  window.speechSynthesis?.cancel();
  if(view==='home'&&!semesterSubjects(state.paths,semester).includes(subject))subject=ALL_SUBJECTS;
  const content=view==='home'?renderHome({paths:state.paths,progress:state.progress,semester,subject}):view==='learn'?learningView(state.paths.find(p=>p.id===current),index):view==='missing'?'<h1 tabindex="-1">Læringsstien blev ikke fundet</h1><p>Linket peger på indhold, der ikke findes på denne enhed.</p><a class="primary" href="#/">Find en læringssti</a>':teacher();
  $('#app').innerHTML=header()+`<div id="storage-status" class="storage-status" role="alert" hidden></div><main id="main-content" tabindex="-1">${catalogWarning?`<p class="notice" role="status">${esc(catalogWarning)}</p>`:''}${notice?`<p class="notice" role="status">${esc(notice)}</p>`:''}${content}</main><footer><span class="brand small">⌁ Læringsstier</span><span>Ingen konto · Gemmes på din enhed</span><span>Version 0.3.0</span></footer>`;
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
  if(draft) return renderEditor(draft,selected,{preview,errors,canUndo:undo.length>0,fullPreview,stale:(draftBaseRevision||null)!==(state.publication?.known[draft.id]?.revision||null),availableSubjects:editorSubjects(state.paths,Object.values(state.drafts).map(d=>d.path))});
  const drafts=Object.values(state.drafts);
  return `<div class="section-row"><div><div class="eyebrow">DIT FAGLIGE VÆRKSTED</div><h1>Underviser</h1></div><div class="toolbar"><button class="secondary" data-action="lock-teacher">Lås underviseradgang</button><button class="primary" data-action="new">＋ Ny læringssti</button></div></div>
    ${publicationStatus(state)}
    ${drafts.length?`<section class="draft-list"><h2>Dine kladder</h2>${drafts.map(d=>`<div><strong>${esc(d.path.title||'Ny læringssti')}</strong><span>Gemt ${new Date(d.updatedAt).toLocaleString('da-DK')}</span><button class="secondary" data-edit="${esc(d.path.id)}">Fortsæt kladde</button><button data-discard="${esc(d.path.id)}">Slet kladde</button></div>`).join('')}</section>`:''}
    <h2>Offentlige læringsstier</h2><div class="teacher-list">${state.paths.map(p=>`<div><span><b>${esc(p.title)}</b><small>${p.semester}. semester · ${esc(subjectLabel(p))} · ${p.steps.length} trin · version ${p.contentVersion}</small></span><button class="secondary" data-edit="${esc(p.id)}">Redigér</button><button data-withdraw="${esc(p.id)}">Træk tilbage</button></div>`).join('')}</div>${Object.values(state.publication?.known||{}).some(d=>d.status==='withdrawn')?`<details><summary>Tilbagetrukne læringsstier</summary>${Object.values(state.publication.known).filter(d=>d.status==='withdrawn').map(d=>`<p>${esc(d.path.title)} <button data-edit="${esc(d.path.id)}">Redigér og genudgiv</button></p>`).join('')}</details>`:''}`;
}
function go(hash) {if(location.hash===hash)route();else location.hash=hash;}
function pathRoute(path,step) {return `#/sti/${encodeURIComponent(path.id)}/${encodeURIComponent(step.id)}`;}
function recordFor(path) {return state.progress[path.id]??={done:[],notes:{},answers:{}};}
async function route() {
  await flushDraft();draft=null;preview=false;fullPreview=false;errors=[];undo=[];inspectedAnswers={};
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
  const saved=state.drafts[id],path=saved?.path||state.paths.find(p=>p.id===id)||state.publication?.known[id]?.path;
  if(!path)return;
  draft=clone(path);draftBaseRevision=saved&&Object.hasOwn(saved,'baseRevision')?saved.baseRevision:state.publication?.known[id]?.revision||null;selected=saved?.selected||'metadata';
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
  if(a==='retry-save') {if(draft)stashDraft();await persist({retry:true});return;}
  if(d.semester) {semester=Number(d.semester);render(`[data-semester="${semester}"]`);return;}
  if(d.subject) {subject=d.subject;render(`[data-subject="${CSS.escape(subject)}"]`);return;}
  if(d.open||d.resume) {const p=state.paths.find(p=>p.id===(d.open||d.resume));go(pathRoute(p,p.steps[getPathProgress(p,state.progress[p.id]).lastIndex]));return;}
  if(a==='home'||a==='teacher') {go(a==='home'?'#/':'#/underviser');return;}
  const isPreview=Boolean(draft&&preview&&view==='teacher');
  if(d.answer) {
    const [q,i]=d.answer.split(':').map(Number),path=isPreview?draft:state.paths.find(p=>p.id===current),step=isPreview?selectedStep():path.steps[index];
    const question=step.questions[q];if(!question||!Number.isInteger(i)||i<0||i>=question.a.length)return;
    const previous=isPreview?previewAnswers[q]:question.optionIds.indexOf(recordFor(path).answers[step.id]?.[question.id]);
    const choice=chooseAnswer(question,previous,i);inspectedAnswers[q]=choice.inspected;
    if(isPreview)previewAnswers[q]=choice.answer;
    else if(choice.answer!==previous) {const record=recordFor(path);record.answers[step.id]??={};record.answers[step.id][question.id]=question.optionIds[choice.answer];await persist();}
    const y=scrollY;render(choice.inspected!==undefined?`#option-feedback-${q}`:`#feedback-${q}`);scrollTo(0,y);return;
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
    if(a==='retry') {
      if(!confirm('Genstart dette trin? Trinnets svar og gennemførelse nulstilles. Dine refleksioner bevares.'))return;
      inspectedAnswers={};
      if(isPreview)previewAnswers={};else {const record=recordFor(p);delete record.answers[s.id];record.done=record.done.filter(id=>id!==s.id);await persist();}
      render(isPreview?'#editor-heading':'#lesson-heading');
    }
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
    state.drafts[path.id]={path,selected:'metadata',updatedAt:Date.now(),baseRevision:null};await persist();go(`#/underviser/${path.id}`);return;
  }
  if(d.edit) {await flushDraft();go(`#/underviser/${encodeURIComponent(d.edit)}`);return;}
  if(a==='close-editor') {await flushDraft();go('#/underviser');return;}
  if(d.discard&&confirm('Slet denne kladde? Den gemte læringssti ændres ikke.')) {delete state.drafts[d.discard];await persist();render();return;}
  if(a==='refresh-publications') {await refreshPublications();render();return;}
  if(d.withdraw) {const doc=state.publication?.known[d.withdraw];if(doc)await showPublication(doc.path,doc.revision,'withdraw');return;}
  if(!draft)return;
  if(a==='publish') {await preparePublication();return;}
  if(a==='compare-published') {await comparePublished();return;}
  if(a==='preview-path') {await flushDraft();if(!draft.steps.length){notice='Tilføj et trin for at forhåndsvise.';render();return;}selected=draft.steps[0].id;preview=true;fullPreview=true;previewAnswers={};inspectedAnswers={};render('#editor-heading');return;}
  if(d.previewStep) {selected=d.previewStep;preview=true;previewAnswers={};inspectedAnswers={};render('#editor-heading');return;}
  if(a==='add-subject') {await addSubject();return;}
  if(d.editorStep) {await flushDraft();selected=d.editorStep;preview=fullPreview&&selected!=='metadata';errors=[];previewAnswers={};inspectedAnswers={};stashDraft();await persist();render('#editor-heading');return;}
  if(a==='toggle-preview') {await flushDraft();preview=!preview;fullPreview=false;previewAnswers={};inspectedAnswers={};render('#editor-heading');return;}
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
  if(d.addOption!==undefined) {await changeStructure(()=>{const q=step.questions[Number(d.addOption)];q.a.push('');q.optionIds.push(uid());q.explanations??=q.a.slice(0,-1).map(()=>'');q.explanations.push('');});return;}
  if(d.removeOption) {await changeStructure(()=>{const [i,k]=d.removeOption.split(':').map(Number),q=step.questions[i];if(q.a.length<=2)return;q.a.splice(k,1);q.optionIds.splice(k,1);q.explanations?.splice(k,1);q.correct=q.correct===k?0:q.correct>k?q.correct-1:q.correct;});return;}
  if(d.optionMove) {await changeStructure(()=>{const [i,k,delta]=d.optionMove.split(':').map(Number),q=step.questions[i],correct=q.optionIds[q.correct];[q.a[k],q.a[k+delta]]=[q.a[k+delta],q.a[k]];[q.optionIds[k],q.optionIds[k+delta]]=[q.optionIds[k+delta],q.optionIds[k]];if(q.explanations)[q.explanations[k],q.explanations[k+delta]]=[q.explanations[k+delta],q.explanations[k]];q.correct=q.optionIds.indexOf(correct);});}
}
async function addSubject() {
  const input=$('#new-subject');
  if(!input||!draft||!teacherUnlocked)return false;
  const name=cleanSubject(input.value);
  if(!validSubject(name)) {
    $('#subject-error').textContent='Skriv et fagnavn på 1–80 tegn. »Alle fagområder« er forbeholdt oversigten.';
    input.setAttribute('aria-invalid','true');input.focus();return false;
  }
  clearTimeout(timer);collectEditor(draft);
  const available=editorSubjects(state.paths,[...Object.values(state.drafts).map(d=>d.path),draft]);
  const canonical=available.find(s=>subjectKey(s)===subjectKey(name))||name;
  draft.subjects=uniqueSubjects([...pathSubjects(draft),canonical]);draft.subject=draft.subjects[0];
  stashDraft();await persist();render('#new-subject');return true;
}
$('#app').addEventListener('keydown',e=>{
  if(e.target.id==='new-subject'&&e.key==='Enter') {
    e.preventDefault();
    if(!busy){busy=true;addSubject().finally(()=>{busy=false;});}
  }
});
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
  busy=true;
  try {
    if($('#new-subject')?.value.trim()&&!(await addSubject()))return;
    clearTimeout(timer);collectEditor(draft);stashDraft();
    if(await persist()) {draft=null;notice='Kladden er gemt. Den offentlige læringssti er ikke ændret.';go('#/underviser');}

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

});

async function refreshPublications(inform=true) {
  try {
    const catalog=await fetchCatalog(),next=syncCatalog(state,catalog);
    if(JSON.stringify(next)!==JSON.stringify(state)){state=next;await persist();}
    catalogWarning='';if(inform)notice='Den offentlige oversigt er opdateret. Udgivelser markeres først som færdige, når de findes på hjemmesiden.';
    return true;
  }catch(error){catalogWarning=error.message||'Den offentlige oversigt kunne ikke opdateres.';return false;}
}
async function preparePublication() {
  if($('#new-subject')?.value.trim()&&!(await addSubject()))return;
  collectEditor(draft);errors=pathErrors(draft);
  if(errors.length){stashDraft();await persist();render('#validation');return;}
  if(!(await flushDraft()))return;
  await showPublication(draft,draftBaseRevision,'publish');
}
async function showPublication(path,baseRevision,action) {
  const snapshot=publicPath(path);
  publishEndpoint=await publisherConfig();
  if(publishEndpoint&&!(await refreshPublications(false))){notice=catalogWarning;render();return;}
  document.body.insertAdjacentHTML('beforeend',renderPublishDialog(snapshot,publishEndpoint,action,baseRevision,state.publication?.known[path.id]?.revision||null));
  const dialog=$('#publish-dialog'),form=$('#publish-form');let sending=false;
  const close=()=>{if(!sending){form.reset();dialog.close();dialog.remove();}};
  $('#publish-cancel').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(sending||!form.reportValidity()||!publishEndpoint)return;
    sending=true;const code=$('#publish-code').value;$('#publish-code').value='';
    form.querySelector('button[type=submit]').disabled=true;$('#publish-cancel').disabled=true;
    $('#publish-error').textContent='';$('#publish-progress').textContent='Sender den godkendte udgave til GitHub…';
    try {
      const result=await sendPublication(publishEndpoint,code,snapshot,baseRevision,action);
      state.publication.pending[path.id]={...result,submittedAt:Date.now(),baseRevision,action};await persist();
      sending=false;close();notice='Ændringen er sendt til udgivelse. Den er endnu ikke bekræftet på hjemmesiden.';
      draft=null;go('#/underviser');
    }catch(error){$('#publish-error').textContent=error.message;$('#publish-progress').textContent='';sending=false;form.querySelector('button[type=submit]').disabled=false;$('#publish-cancel').disabled=false;$('#publish-code').focus();}
  });
  dialog.showModal();($('#publish-code')||$('#publish-cancel')).focus();
}
function comparison(path) {
  return `<h3>${esc(path.title)}</h3><p>${path.semester}. semester · ${esc(subjectLabel(path))}</p><p>${esc(path.description)}</p>${path.steps.map(s=>`<section><h4>${esc(s.title)}</h4><div class="prose">${esc(s.text)}</div>${s.media?`<p>Medie: ${esc(s.media)}</p>`:''}${s.image?`<p>Billede: ${esc(s.imageAlt||'Uden beskrivelse')}</p><img class="lesson-image" alt="${esc(s.imageAlt||'') }" src="${esc(s.image.startsWith('data:image/')?s.image:safeURL(s.image))}">`:''}${s.guide?`<p>${esc(s.guide)}</p>`:''}${(s.questions||[]).map(q=>`<p><strong>${esc(q.q)}</strong></p><ol>${q.a.map((a,i)=>`<li>${esc(a)}${i===q.correct?' (korrekt)':''}${q.explanations?.[i]?` — ${esc(q.explanations[i])}`:''}</li>`).join('')}</ol><p>${esc(q.why)}</p>`).join('')}</section>`).join('')}`;
}
async function comparePublished() {
  if(!(await flushDraft()))return;
  if(!(await refreshPublications(false))){render();return;}
  const doc=state.publication?.known[draft.id];if(!doc){notice='Der findes endnu ingen offentlig udgave af denne sti.';render();return;}
  const revision=doc.revision;
  document.body.insertAdjacentHTML('beforeend',`<dialog id="compare-dialog" aria-labelledby="compare-title"><h2 id="compare-title">Sammenlign før udgivelse</h2><p>Din kladde erstatter hele den offentlige læringssti ved næste udgivelse. Gennemgå forskellene, og overfør eventuelle ændringer, du vil beholde.</p><div class="comparison-grid"><div><h2>Offentlig udgave</h2>${comparison(doc.path)}</div><div><h2>Din kladde</h2>${comparison(draft)}</div></div><div class="toolbar"><button id="compare-close">Luk</button><button id="compare-accept">Jeg har sammenlignet – brug denne udgave som udgangspunkt</button></div></dialog>`);
  const dialog=$('#compare-dialog'),close=()=>{dialog.close();dialog.remove();};$('#compare-close').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  $('#compare-accept').onclick=async()=>{draftBaseRevision=revision;stashDraft();await persist();close();render('#editor-heading');};dialog.showModal();$('#compare-close').focus();
}

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
try {store=await openStorage();state=await store.load();revision=state.revision;publishEndpoint=await publisherConfig();await refreshPublications(false);await route();}
catch(error){await recovery(error);}
