import {BLOOD_PATH_ID,levelStepId} from './blood-routes.js';
import {mountBloodGame} from './blood-game.js';
import {chooseAnswer} from './quiz.js';
import {ALL_SUBJECTS,semesterSubjects} from './subjects.js';
import {subjects,safeURL,youtubeEmbed} from './data.js';
import {getPathProgress} from './progress.js';
import {renderHome} from './home.js';
import {renderLearn} from './learner.js';
import {esc,download} from './ui.js';
import {openStorage} from './storage.js';
import {emptyState,validateState} from './model.js';
const $=selector=>document.querySelector(selector);
const clone=value=>structuredClone(value);
const MAX_FILE=50*1024*1024;
let store,state,revision=0,view='home',semester=1,subject=subjects[0],current,index=0;
let inspectedAnswers={},disposeGame=null;
let storageError='',notice='',queue=Promise.resolve(),dirty=false,writeNumber=0,savedNumber=0,timer,busy=false;
let expanded=matchMedia('(min-width: 801px)').matches;

function displayStorage() {
  const el=$('#storage-status');
  if(el) {
    el.hidden=!storageError;
    el.innerHTML=storageError?`<strong>Ændringerne er ikke gemt.</strong> ${esc(storageError)} <button data-action="retry-save">Prøv at gemme igen</button>`:'';
  }
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
async function flushPending() {clearTimeout(timer);if(dirty)await persist();}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)flushPending();});

function header() {
  return `<a class="skip-link" href="#main-content">Spring til indhold</a><header><a href="#/" class="brand"><span class="logo" aria-hidden="true">⌁</span>Læringsstier<span class="beta">PROTOTYPE</span></a><nav aria-label="Hovednavigation"><a href="#/" class="${view==='home'?'active':''}" ${view==='home'?'aria-current="page"':''}>Udforsk</a></nav></header>`;
}
function learningView(path,stepIndex) {
  if(path.id===BLOOD_PATH_ID)return '<div id="blood-root"></div>';
  const record=state.progress[path.id]||{done:[],notes:{},answers:{}};
  const step=path.steps[stepIndex],stored=record.answers?.[step.id]||{};
  const answers=Object.fromEntries(step.questions.flatMap((q,i)=>stored[q.id]&&q.optionIds.includes(stored[q.id])?[[i,q.optionIds.indexOf(stored[q.id])]]:[]));
  const uiRecord={...record,done:record.done.map(id=>path.steps.findIndex(s=>s.id===id)),notes:Object.fromEntries(path.steps.map((s,i)=>[i,record.notes[s.id]||'']))};
  return renderLearn({paths:[path],current:path.id,index:stepIndex,progress:{[path.id]:uiRecord},answers,expanded,inspected:inspectedAnswers});
}
function render(focus) {
  disposeGame?.();disposeGame=null;
  window.speechSynthesis?.cancel();
  if(view==='home'&&!semesterSubjects(state.paths,semester).includes(subject))subject=ALL_SUBJECTS;
  const content=view==='home'?renderHome({paths:state.paths,progress:state.progress,semester,subject}):view==='learn'?learningView(state.paths.find(p=>p.id===current),index):'<h1 tabindex="-1">Læringsstien blev ikke fundet</h1><p>Linket peger på indhold, der ikke findes på denne enhed.</p><a class="primary" href="#/">Find en læringssti</a>';
  $('#app').innerHTML=header()+`<div id="storage-status" class="storage-status" role="alert" hidden></div><main id="main-content" tabindex="-1">${notice?`<p class="notice" role="status">${esc(notice)}</p>`:''}${content}</main><footer><span class="brand small">⌁ Læringsstier</span><span>Ingen konto · Gemmes på din enhed</span><span>Version 0.7.0</span></footer>`;
  if(view==='learn'&&current===BLOOD_PATH_ID){const path=state.paths.find(p=>p.id===current);disposeGame=mountBloodGame($('#blood-root'),{record:recordFor(path),initialLevel:path.steps[index].id.replace('blood-',''),save:options=>persist(options),exit:()=>go('#/'),onLevel:level=>{index=path.steps.findIndex(s=>s.id===levelStepId(level));history.replaceState(null,'',pathRoute(path,path.steps[index]));}});}
  displayStorage();
  $('.step-navigation')?.addEventListener('toggle',e=>{expanded=e.target.open;});
  const target=focus?$(focus):null;
  if(target) target.focus({preventScroll:focus.startsWith('[data-')||focus.startsWith('#feedback')});
}
function go(hash) {if(location.hash===hash)route();else location.hash=hash;}
function pathRoute(path,step) {return `#/sti/${encodeURIComponent(path.id)}/${encodeURIComponent(step.id)}`;}
function recordFor(path) {return state.progress[path.id]??={done:[],notes:{},answers:{}};}
async function route() {
  await flushPending();inspectedAnswers={};
  let parts;
  try {parts=location.hash.slice(1).split('/').map(decodeURIComponent);} catch {parts=[];}
  if(parts[1]==='blodcelle-3d'){history.replaceState(null,'','#/sti/blodcellens-rejse/blood-easy');return route();}
  const path=state.paths.find(p=>p.id===parts[2]);
  if(parts[1]==='sti'&&path) {
    current=path.id;index=path.steps.findIndex(s=>s.id===parts[3]);
    if(index<0)index=getPathProgress(path,state.progress[path.id]).lastIndex;
    view='learn';const record=recordFor(path);record.started=true;record.last=path.steps[index].id;record.updatedAt=Date.now();persist();
  } else if(parts[1]==='sti')view='missing';
  else view='home';
  render(view==='learn'?'#lesson-heading':'main h1');
  if(location.hash==='#explore') $('#explore')?.scrollIntoView();else scrollTo(0,0);
}
window.addEventListener('hashchange',()=>{if(state&&!['#main-content','#explore'].includes(location.hash))route();});

async function click(event) {
  if(event.target.closest('.blood-game'))return;
  const button=event.target.closest('button,[data-action]');if(!button||button.disabled)return;
  const d=button.dataset,a=d.action;
  if(a)event.preventDefault();
  if(busy)return;
  busy=true;
  try {await handle(d,a);} catch(error){notice='Handlingen kunne ikke gennemføres: '+error.message;render();} finally {busy=false;}
}
async function handle(d,a) {
  notice='';
  if(a==='retry-save') {await persist({retry:true});return;}
  if(d.semester) {semester=Number(d.semester);render(`[data-semester="${semester}"]`);return;}
  if(d.subject) {subject=d.subject;render(`[data-subject="${CSS.escape(subject)}"]`);return;}
  if(d.open||d.resume) {const p=state.paths.find(p=>p.id===(d.open||d.resume));go(pathRoute(p,p.steps[getPathProgress(p,state.progress[p.id]).lastIndex]));return;}
  if(a==='home') {go('#/');return;}
  if(d.answer) {
    const [q,i]=d.answer.split(':').map(Number),path=state.paths.find(p=>p.id===current),step=path?.steps[index];
    const question=step?.questions[q];if(!question||!Number.isInteger(i)||i<0||i>=question.a.length)return;
    const previous=question.optionIds.indexOf(recordFor(path).answers[step.id]?.[question.id]);
    const choice=chooseAnswer(question,previous,i);inspectedAnswers[q]=choice.inspected;
    if(choice.answer!==previous) {const record=recordFor(path);record.answers[step.id]??={};record.answers[step.id][question.id]=question.optionIds[choice.answer];await persist();}
    const y=scrollY;render(choice.inspected!==undefined?`#option-feedback-${q}`:`#feedback-${q}`);scrollTo(0,y);return;
  }
  if(d.step!==undefined) {const p=state.paths.find(p=>p.id===current);go(pathRoute(p,p.steps[Number(d.step)]));return;}
  if(['previous','complete','retry','speak','stop','media'].includes(a)) {
    const p=state.paths.find(p=>p.id===current),s=p?.steps[index];if(!s)return;
    if(a==='previous'&&index>0)go(pathRoute(p,p.steps[index-1]));
    if(a==='complete') {
      const record=recordFor(p),all=s.questions.every(q=>record.answers[s.id]?.[q.id]);if(!all)return;
      if(!record.done.includes(s.id))record.done.push(s.id);record.updatedAt=Date.now();await persist();
      if(index<p.steps.length-1)go(pathRoute(p,p.steps[index+1]));else {notice='Godt gået! Læringsstien er gennemført.';render('#lesson-heading');}
    }
    if(a==='retry') {
      if(!confirm('Genstart dette trin? Trinnets svar og gennemførelse nulstilles. Dine refleksioner bevares.'))return;
      inspectedAnswers={};
      {const record=recordFor(p);delete record.answers[s.id];record.done=record.done.filter(id=>id!==s.id);await persist();}
      render('#lesson-heading');
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
}
$('#app').addEventListener('click',click);
$('#app').addEventListener('input',e=>{
  if(e.target.id==='reflection'&&view==='learn') {const p=state.paths.find(p=>p.id===current);recordFor(p).notes[p.steps[index].id]=e.target.value;dirty=true;clearTimeout(timer);timer=setTimeout(()=>persist(),350);}
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
try {store=await openStorage();state=await store.load();revision=state.revision;semester=state.paths[0]?.semester||1;await route();}
catch(error){await recovery(error);}
