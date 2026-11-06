import { renderQuiz } from './quiz.js';
import { subjectLabel } from './subjects.js';
import { percent, safeURL } from './data.js';
import { esc, types } from './ui.js';
export function renderLearn({
  paths,
  current,
  index,
  progress,
  answers,
  expanded,
  inspected = {},
}) {
  function learn() {
    const p = paths.find((p) => p.id === current);
    if (!p) return '';
    const s = p.steps[index];
    if (!s) return '<p>Denne læringssti har endnu ingen trin.</p>';
    const done = progress[p.id]?.done || [],
      qs = s.questions || [],
      all = qs.length > 0 && qs.every((_, i) => answers[i] !== undefined);
    const answered = qs.filter((_, i) => answers[i] !== undefined).length;
    const correct = qs.filter((q, i) => answers[i] === q.correct).length;
    const first = progress[p.id]?.firstAnswers?.[s.id] || {};
    const firstKnown = qs.filter((q) => first[q.id]);
    const firstCorrect = firstKnown.filter((q) => first[q.id] === q.optionIds[q.correct]).length;
    const learningStatus = qs.length
      ? `<p class="quiz-learning-status" role="status">${answered} af ${qs.length} besvaret · ${correct} korrekte nu.${firstKnown.length ? ` Første svar: ${firstCorrect} af ${firstKnown.length} korrekte.` : ''} Du kan gå videre efter besvarelse og vende tilbage for at øve.</p>`
      : '';
    return `<button class="back" data-action="home">← Alle læringsstier</button><div class="learning-head"><div class="eyebrow">${p.semester}. SEMESTER · ${esc(subjectLabel(p))}</div><h1>${esc(p.title)}</h1><p>${esc(p.description)}</p></div><div class="learning-layout"><details class="step-navigation" ${expanded ? 'open' : ''}><summary>Din læringssti · trin ${index + 1} af ${p.steps.length}</summary><aside class="step-list"><b>Din læringssti</b><div class="progress"><span style="width:${percent(p, done)}%"></span></div>${p.steps.map((t, i) => `<button data-step="${i}" ${i === index ? 'aria-current="step"' : ''} class="${i === index ? 'selected' : ''}"><span>${done.includes(i) ? '✓' : i + 1}</span><div>${esc(t.title)}<small>${types[t.type] || 'Indhold'}</small></div></button>`).join('')}<small>${done.length} af ${p.steps.length} trin gennemført</small></aside></details><article class="lesson"><div class="eyebrow">TRIN ${index + 1} AF ${p.steps.length} · ${types[s.type]}</div><h2 id="lesson-heading" tabindex="-1">${esc(s.title)}</h2>${s.type === 'case' ? '<div class="case-label">✚ En fiktiv patient. En faglig overvejelse.</div>' : ''}<div class="prose">${esc(s.text)}</div>${s.image ? `<img class="lesson-image" src="${esc(s.image.startsWith('data:image/') ? s.image : safeURL(s.image))}" alt="${esc(s.imageAlt || 'Illustration til læringstrinnet')}">` : ''}${s.type === 'podcast' ? `<div class="audio-box"><span>♫</span><div><b>${esc(s.title)}</b><small>Oplæsning af teksten · dansk</small></div><button class="secondary" data-action="speak">Afspil</button><button class="text-button" data-action="stop">Stop</button></div>` : ''}${s.media ? `<div class="external"><p>Mediet hentes fra en ekstern udbyder, når du åbner det.</p><button class="secondary" data-action="media">Åbn ${s.type === 'podcast' ? 'podcast' : 'video / link'} →</button><div id="media"></div></div>` : ''}${learningStatus}${renderQuiz(qs, answers, inspected)}${s.type === 'reflection' ? `<label class="reflection">Dine refleksioner<textarea id="reflection" rows="6" placeholder="Skriv dine faglige overvejelser. Undlad navne og personoplysninger.">${esc(progress[p.id]?.notes?.[index] || '')}</textarea></label><small>Gemmes kun på denne enhed. Refleksioner bedømmes ikke automatisk.</small>${s.guide ? `<details class="reflection-guide"><summary>Vejledning til din refleksion</summary><div class="prose">${esc(s.guide)}</div></details>` : ''}` : ''}<div class="lesson-footer"><button class="secondary" data-action="previous" ${index === 0 ? 'disabled' : ''}>← Forrige</button><button class="primary" data-action="complete" ${qs.length > 0 && !all ? 'disabled' : ''}>${index === p.steps.length - 1 ? 'Afslut læringssti ✓' : 'Gennemfør og fortsæt →'}</button></div>${percent(p, done) === 100 ? '<div class="result"><h3>Alle trin er gennemgået.</h3><p>Trinprogression er ikke en faglig bedømmelse. Gennemgå feedbacken og brug eventuelle fejl til repetition.</p></div>' : ''}</article></div>`;
  }

  return learn();
}
