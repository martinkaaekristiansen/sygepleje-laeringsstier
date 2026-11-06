import { esc } from './ui.js';

// Once correct, further clicks inspect other choices without replacing the answer.
// This also applies to answers restored from local storage.
export function chooseAnswer(question, previous, clicked) {
  if (!Number.isInteger(clicked) || clicked < 0 || clicked >= question.a.length)
    return { answer: previous };
  if (previous === question.correct)
    return { answer: previous, inspected: clicked === question.correct ? undefined : clicked };
  return { answer: clicked };
}
export function optionExplanation(question, choice) {
  return question.explanations?.[choice]?.trim() || question.why;
}
export function renderQuiz(questions, answers, inspected = {}) {
  if (!questions.length) return '';
  const all = questions.every((_, i) => answers[i] !== undefined);
  return `<div class="quiz"><p class="quiz-instructions">Du kan ændre forkerte svar. Et korrekt svar bevares, mens du undersøger de andre svarmuligheder. Brug »Genstart trinnet« for at svare forfra.</p>
    ${questions
      .map((q, i) => {
        const correct = answers[i] === q.correct;
        const choice = inspected[i];
        const exploring =
          correct &&
          Number.isInteger(choice) &&
          choice !== q.correct &&
          choice >= 0 &&
          choice < q.a.length;
        return `<fieldset><legend>${i + 1}. ${esc(q.q)}</legend>
        ${q.source ? `<p class="question-source">Kilde: ${esc(q.source)}</p>` : ''}
        ${q.a.map((a, j) => `<button type="button" class="answer ${answers[i] === j ? 'chosen' : ''} ${correct && j === q.correct ? 'answer-correct' : ''} ${exploring && choice === j ? 'answer-inspected' : ''}" data-answer="${i}:${j}" aria-pressed="${answers[i] === j}" ${correct && j !== q.correct ? `aria-label="Læs forklaringen til svar ${String.fromCharCode(65 + j)}: ${esc(a)}" aria-expanded="${exploring && choice === j}"` : ''}><span>${String.fromCharCode(65 + j)}</span>${esc(a)}${correct && j === q.correct ? '<strong class="answer-status">✓ Korrekt svar</strong>' : ''}</button>`).join('')}
        ${answers[i] !== undefined ? `<div class="feedback ${correct ? 'correct' : ''}" id="feedback-${i}" tabindex="-1" role="status"><b>${correct ? '✓ Korrekt!' : 'Prøv at tænke på det sådan:'}</b><p>${esc(optionExplanation(q, answers[i]))}</p><small>Korrekt svar: ${esc(q.a[q.correct])}</small>${correct ? '<p>Dit korrekte svar er bevaret. Tryk på et andet svar for at undersøge, hvorfor det er forkert.</p>' : '<p>Du kan vælge et andet svar ovenfor.</p>'}</div>` : ''}
        ${exploring ? `<div class="feedback option-feedback" id="option-feedback-${i}" tabindex="-1" role="status"><b>Hvorfor er svar ${String.fromCharCode(65 + choice)} forkert?</b><p class="inspected-option">${esc(q.a[choice])}</p><p>${esc(optionExplanation(q, choice))}</p>${!q.explanations?.[choice]?.trim() ? '<small>Her vises spørgsmålets fælles faglige forklaring.</small>' : ''}<p>Dit korrekte svar ${String.fromCharCode(65 + q.correct)} er stadig gemt.</p></div>` : ''}
      </fieldset>`;
      })
      .join('')}
    ${all ? `<div class="result"><h3>${questions.filter((q, i) => answers[i] === q.correct).length} af ${questions.length} korrekte</h3><p>Læs forklaringerne, og tag din nye viden med videre.</p></div>` : ''}
    <button class="secondary" type="button" data-action="retry">Genstart trinnet</button>
  </div>`;
}

// Retrying starts a new formative attempt; the preceding answers remain in backups.
export function restartStep(record, stepId, date = new Date().toISOString()) {
  if (record.answers[stepId] || record.firstAnswers?.[stepId]) {
    record.answerHistory ??= [];
    record.answerHistory.push({
      stepId,
      date,
      answers: structuredClone(record.answers[stepId] || {}),
      firstAnswers: structuredClone(record.firstAnswers?.[stepId] || {}),
    });
  }
  delete record.answers[stepId];
  delete record.firstAnswers?.[stepId];
  record.done = record.done.filter((id) => id !== stepId);
}
