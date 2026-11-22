import { assessmentQuestions, scoreAssessment } from './digestion-assessment.js';
import { createAssessment, createReview, advancedArchiveQuestion } from './digestion-exam.js';
import { shuffled } from './digestion-engine.js';
import { esc } from './ui.js';

// The five selected identities, feedback and review belong to this controller;
// anatomy/progression remain in mountDigestion. Drafts never store UI order.
export function createExamController({
  data,
  panel,
  prepare,
  learn,
  information,
  stage,
  store,
  focusQuestion,
  assessment = {},
  menuLabel = 'Til karakterer og resultater',
}) {
  const questions = assessment.questions || assessmentQuestions,
    makeAssessment = assessment.create || createAssessment,
    makeReview = assessment.review || createReview,
    score = assessment.score || scoreAssessment,
    archived = assessment.archived || advancedArchiveQuestion;
  let exam = null,
    busy = false,
    disposed = false;
  function drawExam() {
    information(false);
    panel.classList.remove('digest-active', 'digest-nav', 'digest-menu', 'digest-result');
    panel.classList.add('digest-compact');
    const index = exam.review ? exam.review.indices[exam.review.cursor] : exam.answers.length;
    const q = questions(exam.character, exam.questionIds)[index];
    if (!q) return;
    const choices = shuffled(q.options.map((text, i) => ({ text, i })));
    panel.innerHTML = `<h2> ${exam.review ? 'Repetition' : 'Afsluttende test'} · ${exam.review ? exam.review.cursor + 1 : index + 1}/${exam.review ? exam.review.indices.length : 5}</h2>${exam.curriculumAdapted ? '<p>Opdaterede grundspørgsmål. Dit tidligere testresultat er bevaret.</p>' : ''}<p class="digest-exam-question">${esc(q.prompt)}</p><div class="digest-choices">${choices.map((o) => `<button data-exam-answer="${o.i}">${esc(o.text)}</button>`).join('')}</div>`;
    focusQuestion();
  }
  function showAssessmentResult(result) {
    panel.classList.remove('digest-compact', 'digest-active', 'digest-nav');
    panel.classList.add('digest-result');
    panel.innerHTML = `<h2>Testresultat: ${result.correct} af 5</h2><p>Dit første resultat bevares, når du repeterer fejl.</p><ol>${questions(
      result.character,
      result.questionIds,
    )
      .map((q, n) =>
        archived(q)
          ? `<li><strong>${result.answers[n] === 0 ? 'Korrekt' : 'Repetér'} · arkiveret spørgsmål fra en tidligere testversion</strong><p>Dit oprindelige svar og resultat er bevaret. Repetition bruger opdaterede grundspørgsmål.</p></li>`
          : `<li><strong>${result.answers[n] === 0 ? 'Korrekt' : 'Repetér'}: ${esc(q.prompt)}</strong><p>${esc(q.why)}</p></li>`,
      )
      .join(
        '',
      )}</ol>${result.answers.some((a) => a !== 0) ? `<button data-review-character="${result.character}">Repetér forkert besvarede spørgsmål</button>` : ''}<button data-digest="menu">${esc(menuLabel)}</button>`;
    exam = null;
  }
  function startReview(character) {
    const result = data.assessments?.[character]?.at(-1);
    if (!result) return;
    const review = makeReview(result);
    if (!review) return;
    prepare();
    exam = review;
    data.reviewDraft = structuredClone(exam);
    void store();
    drawExam();
  }
  async function examAnswer(i) {
    if (!exam || exam.review?.pending || busy || !Number.isInteger(i) || i < 0 || i > 2) return;
    busy = true;
    const index = exam.review ? exam.review.indices[exam.review.cursor] : exam.answers.length,
      q = questions(exam.character, exam.questionIds)[index],
      correct = i === 0;
    learn({
      key: exam.character + ':exam:' + index + ':' + i,
      character: exam.character,
      stage: stage(),
      title: exam.review ? 'Repetition' : 'Sluttest',
      short: q.why,
      detail: q.prompt + ' ' + q.why,
      error: !correct,
    });
    information(true);
    if (exam.review) {
      if (correct) exam.review.correct++;
      exam.review.pending = true;
      exam.review.lastAnswer = i;
      data.reviewDraft = structuredClone(exam);
    } else {
      exam.answers.push(i);
      if (exam.answers.length === 5) {
        delete data.assessmentDraft;
        exam.result = score(exam.character, exam.answers, exam.questionIds);
        data.assessments ??= {};
        data.assessments[exam.character] = [
          ...(data.assessments[exam.character] || []),
          exam.result,
        ].slice(-20);
      } else
        data.assessmentDraft = {
          character: exam.character,
          questionIds: exam.questionIds,
          answers: [...exam.answers],
        };
    }
    const session = exam;
    await store();
    if (disposed || exam !== session) {
      busy = false;
      return;
    }
    renderExamFeedback(correct);
    busy = false;
  }
  function renderExamFeedback(correct) {
    information(true);
    panel.innerHTML = `<h2>${correct ? 'Korrekt' : 'Læs forklaringen og prøv forståelsen igen'}</h2><button data-digest="exam-next">${exam.result ? 'Se resultat' : exam.review && exam.review.cursor + 1 === exam.review.indices.length ? 'Afslut repetition' : 'Næste spørgsmål'} →</button>`;
    panel.querySelector('button').focus({ preventScroll: true });
  }
  function resumeReview() {
    exam = structuredClone(data.reviewDraft);
    prepare();
    if (exam.review.pending) {
      const index = exam.review.indices[exam.review.cursor],
        q = questions(exam.character, exam.questionIds)[index];
      learn({
        key: exam.character + ':exam:' + index + ':' + exam.review.lastAnswer,
        character: exam.character,
        stage: stage(),
        title: 'Repetition',
        short: q.why,
        detail: q.prompt + ' ' + q.why,
        error: exam.review.lastAnswer !== 0,
      });
      renderExamFeedback(exam.review.lastAnswer === 0);
    } else drawExam();
  }
  function examNext() {
    if (!exam) return;
    if (exam.result) {
      showAssessmentResult(exam.result);
      return;
    }
    if (exam.review) {
      if (!exam.review.pending) return;
      exam.review.pending = false;
      delete exam.review.lastAnswer;
      exam.review.cursor++;
      if (exam.review.cursor === exam.review.indices.length) {
        const r = exam.review;
        delete data.reviewDraft;
        void store();
        panel.classList.remove('digest-compact');
        panel.innerHTML = `<h2>Repetition afsluttet</h2><p>${r.correct} af ${r.indices.length} rigtige i repetitionen. Dit oprindelige testresultat er bevaret.</p><button data-digest="exam">Tag en ny sluttest</button><button data-digest="menu">${esc(menuLabel)}</button>`;
        exam = null;
        return;
      }
      data.reviewDraft = structuredClone(exam);
      void store();
    }
    drawExam();
  }
  return {
    get busy() {
      return busy;
    },
    get character() {
      return exam?.character;
    },
    start(character, replace = false) {
      prepare();
      exam =
        !replace && data.assessmentDraft
          ? structuredClone(data.assessmentDraft)
          : makeAssessment(character, data.assessments?.[character]?.at(-1));
      data.assessmentDraft = structuredClone(exam);
      void store();
      drawExam();
    },
    review: startReview,
    resumeReview,
    answer: examAnswer,
    next: examNext,
    cancel() {
      exam = null;
    },
    dispose() {
      disposed = true;
      exam = null;
    },
  };
}
