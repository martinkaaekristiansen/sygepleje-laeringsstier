import {pathSubjects,editorSubjects,subjectKey,MAX_SUBJECT_LENGTH} from './subjects.js';
import {esc,types} from './ui.js';
export function renderEditor(draft,selected,{preview=false,errors=[],canUndo=false,availableSubjects=[]}={}) {
  const s=draft.steps.find(s=>s.id===selected), i=draft.steps.indexOf(s);
  return `<form id="editor" novalidate><div class="editor-header"><div><div class="eyebrow">KLADDE · KUN PÅ DENNE ENHED</div><h2>${esc(draft.title||'Ny læringssti')}</h2></div><button type="button" class="secondary" data-action="close-editor">Luk kladde</button></div>
    <p id="draft-status" role="status">Kladder gemmes automatisk. Brug »Gem læringssti« for at gøre ændringerne synlige i elevvisningen på denne enhed.</p>
    ${errors.length?`<div class="validation" role="alert" tabindex="-1" id="validation"><h3>Kontrollér disse felter</h3><ul>${errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:''}
    <div class="editor-layout"><aside class="editor-outline" aria-label="Læringsstiens indhold"><button type="button" data-editor-step="metadata" aria-pressed="${!s}">Om læringsstien</button><ol>${draft.steps.map((step,n)=>`<li><button type="button" data-editor-step="${esc(step.id)}" aria-pressed="${step.id===selected}"><span>${n+1}.</span> ${esc(step.title||'Trin uden titel')}</button></li>`).join('')}</ol><label>Nyt trin fra skabelon<select id="template">${Object.entries(types).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><button type="button" class="secondary" data-action="add-step">＋ Tilføj trin</button></aside>
    <section class="editor-panel">${!s?`<h3 id="editor-heading" tabindex="-1">Om læringsstien</h3><div class="form-grid"><label>Titel<input name="title" value="${esc(draft.title)}" required></label><label>Semester<select name="semester">${Array.from({length:7},(_,i)=>`<option value="${i+1}" ${draft.semester===i+1?'selected':''}>${i+1}. semester</option>`).join('')}</select></label></div><label>Kort beskrivelse<textarea name="description" rows="4" required>${esc(draft.description)}</textarea></label>${subjectPicker(draft,availableSubjects)}<p>Vælg et trin i oversigten for at redigere det. Eksisterende kilder og vejledninger bevares.</p>`:
    `<div class="section-row"><h3 id="editor-heading" tabindex="-1">Trin ${i+1} af ${draft.steps.length}</h3><div class="toolbar"><button type="button" data-action="toggle-preview" aria-pressed="${preview}">${preview?'Tilbage til redigering':'Forhåndsvis trin'}</button><button type="button" data-step-move="-1" ${i===0?'disabled':''} aria-label="Flyt trin op">↑</button><button type="button" data-step-move="1" ${i===draft.steps.length-1?'disabled':''} aria-label="Flyt trin ned">↓</button><button type="button" data-action="duplicate-step">Duplikér</button><button type="button" data-action="remove-step">Fjern trin</button></div></div>${preview?'<div id="preview"><p class="notice">Forhåndsvisning: Svar og refleksioner her påvirker ikke din progression.</p><div id="preview-lesson"></div></div>':stepForm(s)}`}</section></div>
    <div class="editor-save toolbar"><button type="button" class="secondary" data-action="undo" ${canUndo?'':'disabled'}>Fortryd seneste strukturændring</button><button class="primary" type="submit">Gem læringssti ✓</button></div><p class="muted">Omrokering og titelændringer bevarer progression. Ændret fagligt indhold nulstiller kun gennemførelse og quizsvar på de berørte trin. Refleksioner bevares.</p></form>`;
}
function subjectPicker(draft, availableSubjects) {
  const selected = pathSubjects(draft).map(subjectKey);
  const choices = editorSubjects([{subjects:availableSubjects},draft]);
  return `<fieldset id="subject-picker" class="subject-picker" aria-describedby="subject-help"><legend>Fagområder</legend>
    <p id="subject-help">Vælg ét eller flere fag. Læringsstien vises under alle valgte fag på det valgte semester, når du gemmer den.</p>
    <div class="subject-options">${choices.map(name=>`<label class="subject-option"><input type="checkbox" name="path-subject" value="${esc(name)}" ${selected.includes(subjectKey(name))?'checked':''}><span>${esc(name)}</span></label>`).join('')}</div>
    <label for="new-subject">Mangler et fag? Skriv navnet her</label>
    <div class="new-subject-row"><input id="new-subject" type="text" maxlength="${MAX_SUBJECT_LENGTH}" placeholder="Fx Kommunikation" aria-describedby="subject-error"><button class="secondary" type="button" data-action="add-subject">＋ Tilføj fag</button></div>
    <p id="subject-error" role="alert"></p>
  </fieldset>`;
}
function stepForm(s) {
  return `<section class="edit-step" data-edit-step="${esc(s.id)}"><label>Trinnets titel<input data-field="title" value="${esc(s.title)}" required></label><label>Indholdstype<select data-field="type">${Object.entries(types).map(([v,t])=>`<option value="${v}" ${s.type===v?'selected':''}>${t}</option>`).join('')}</select></label><label>Tekst / case<textarea data-field="text" rows="7">${esc(s.text)}</textarea></label><label>Vejledning til refleksion (valgfri)<textarea data-field="guide" rows="4">${esc(s.guide||'')}</textarea></label><details><summary>Billede, video og podcast</summary><label>Billedlink<input data-field="image" value="${esc(s.image||'')}" placeholder="https://…"></label><label>Billedbeskrivelse til skærmlæser<input data-field="imageAlt" value="${esc(s.imageAlt||'')}"></label><label>Upload billede (maks. 1 MB)<input type="file" id="upload-image" accept="image/png,image/jpeg,image/webp"></label><label>Video, YouTube eller podcastlink<input type="url" data-field="media" value="${esc(s.media||'')}" placeholder="https://…"></label><p>Eksterne medier åbnes først efter et klik. Eksterne billeder hentes, når trinnet vises.</p></details>
    <div class="quiz-editor"><h3>Multiple-choice spørgsmål</h3><p>Spørgsmål kan tilføjes til alle trintyper. Forklar både det korrekte svar og typiske misforståelser. Tilføj gerne en forklaring til hvert svar. Tomme felter bruger spørgsmålets fælles forklaring.</p>${s.questions.map((q,j)=>`<section class="edit-question" data-question="${esc(q.id)}"><div class="section-row"><h4>Spørgsmål ${j+1}</h4><div class="toolbar"><button type="button" data-question-move="${j}:-1" ${j===0?'disabled':''} aria-label="Flyt spørgsmål ${j+1} op">↑</button><button type="button" data-question-move="${j}:1" ${j===s.questions.length-1?'disabled':''} aria-label="Flyt spørgsmål ${j+1} ned">↓</button><button type="button" data-duplicate-question="${j}">Duplikér spørgsmål</button><button type="button" data-remove-question="${j}">Fjern spørgsmål</button></div></div><label>Spørgsmål<input data-q="q" required value="${esc(q.q)}"></label>${q.a.map((a,k)=>`<div class="option-row"><label>Svar ${String.fromCharCode(65+k)}<input data-choice="${k}" required value="${esc(a)}"></label><button type="button" data-option-move="${j}:${k}:-1" ${k===0?'disabled':''} aria-label="Flyt svar ${String.fromCharCode(65+k)} op">↑</button><button type="button" data-remove-option="${j}:${k}" ${q.a.length<=2?'disabled':''} aria-label="Fjern svar ${String.fromCharCode(65+k)}">×</button></div><label>Forklaring til svar ${String.fromCharCode(65+k)} (valgfri)<textarea data-explanation="${k}" rows="2" placeholder="Forklar, hvorfor netop dette svar er korrekt eller forkert.">${esc(q.explanations?.[k]||'')}</textarea></label>`).join('')}<button type="button" data-add-option="${j}">＋ Tilføj svarmulighed</button><label>Korrekt svar<select data-q="correct">${q.a.map((_,k)=>`<option value="${k}" ${q.correct===k?'selected':''}>${String.fromCharCode(65+k)}</option>`).join('')}</select></label><label>Fælles faglig forklaring<textarea data-q="why" rows="3" required>${esc(q.why)}</textarea></label><label>Kilde (valgfri)<input data-q="source" value="${esc(q.source||'')}"></label></section>`).join('')}<button type="button" class="secondary" data-action="add-question">＋ Tilføj spørgsmål</button></div></section>`;
}
export function collectEditor(draft,root=document.querySelector('#editor')) {
  if(!root) return;
  for(const field of ['title','description','semester']) {
    const input=root.querySelector(`[name="${field}"]`);
    if(input) draft[field]=field==='semester'?Number(input.value):input.value;
  }
  if(root.querySelector('#subject-picker')) {
    draft.subjects=[...root.querySelectorAll('[name=path-subject]:checked')].map(input=>input.value);
    draft.subject=draft.subjects[0]||'';
  }
  const el=root.querySelector('[data-edit-step]');
  if(!el) return;
  const step=draft.steps.find(s=>s.id===el.dataset.editStep);
  el.querySelectorAll('[data-field]').forEach(x=>step[x.dataset.field]=x.value);
  el.querySelectorAll('[data-question]').forEach(el=>{
    const q=step.questions.find(q=>q.id===el.dataset.question);
    el.querySelectorAll('[data-q]').forEach(x=>q[x.dataset.q]=x.dataset.q==='correct'?Number(x.value):x.value);
    q.explanations??=q.a.map(()=>'');
    el.querySelectorAll('[data-explanation]').forEach(x=>q.explanations[Number(x.dataset.explanation)]=x.value);
    el.querySelectorAll('[data-choice]').forEach(x=>q.a[Number(x.dataset.choice)]=x.value);
  });
}
