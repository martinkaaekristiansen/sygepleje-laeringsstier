import { QUESTION_POOLS, assessmentQuestions } from './digestion-assessment.js';
export function createAssessment(character, previous, random = Math.random) {
  if (!Object.hasOwn(QUESTION_POOLS, character)) throw Error('Ukendt næringsstof.');
  const pool = QUESTION_POOLS[character].map((q) => q.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const questionIds = pool.slice(0, 5);
  if (
    previous?.questionIds?.length === 5 &&
    previous.questionIds.every((id) => questionIds.includes(id))
  )
    questionIds[4] = pool.find((id) => !previous.questionIds.includes(id));
  return { character, questionIds, answers: [] };
}
function validQuestions(value) {
  try {
    assessmentQuestions(value.character, value.questionIds);
    return true;
  } catch {
    return false;
  }
}
const answers = (value) =>
  Array.isArray(value) && value.every((a) => Number.isInteger(a) && a >= 0 && a < 3);
export function validAssessmentDraft(value) {
  return !!value && validQuestions(value) && answers(value.answers) && value.answers.length < 5;
}
export function validAssessmentResult(value, character = value?.character) {
  return (
    !!value &&
    value.character === character &&
    validQuestions(value) &&
    answers(value.answers) &&
    value.answers.length === 5 &&
    value.total === 5 &&
    value.correct === value.answers.filter((a) => a === 0).length &&
    typeof value.date === 'string'
  );
}

export function createReview(result) {
  if (!validAssessmentResult(result)) throw Error('Ugyldigt testresultat.');
  const indices = result.answers.map((answer, i) => (answer !== 0 ? i : -1)).filter((i) => i >= 0);
  if (!indices.length) return null;
  return adaptReviewQuestions({
    character: result.character,
    questionIds: result.questionIds,
    answers: [],
    review: { indices, cursor: 0, correct: 0, pending: false },
  });
}
export function validReviewDraft(value) {
  if (!value || !validQuestions(value) || !value.review) return false;
  const r = value.review;
  return (
    Array.isArray(r.indices) &&
    r.indices.length > 0 &&
    r.indices.length <= 5 &&
    new Set(r.indices).size === r.indices.length &&
    r.indices.every((i) => Number.isInteger(i) && i >= 0 && i < 5) &&
    Number.isInteger(r.cursor) &&
    r.cursor >= 0 &&
    r.cursor < r.indices.length &&
    typeof r.pending === 'boolean' &&
    Number.isInteger(r.correct) &&
    r.correct >= 0 &&
    r.correct <= r.cursor + (r.pending ? 1 : 0) &&
    (!r.pending || (Number.isInteger(r.lastAnswer) && r.lastAnswer >= 0 && r.lastAnswer < 3))
  );
}

export function advancedArchiveQuestion(question) {
  return /SGLT1|GLUT2|PEPT1|chylom|intracellul|reesterific/i.test(JSON.stringify(question));
}
// Keep the original result and its answer identities intact. A subsequent
// review uses basic equivalents for retired advanced questions, at the same
// review indices; source identities remain available for historical audit.
export function adaptReviewQuestions(review) {
  const questions = assessmentQuestions(review.character, review.questionIds);
  if (!questions.some(advancedArchiveQuestion)) return review;
  const original = review.questionIds || questions.map((_, i) => `${review.character}-legacy-${i}`),
    taken = new Set(original);
  const priorities = {
    stanley: ['uptake', 'product', 'maltase', 'pancreas', 'acid', 'saliva'],
    poul: ['uptake', 'products', 'peptidase', 'trypsin', 'pepsin', 'acid'],
    trine: ['delivery', 'micelles', 'products', 'bile', 'lipase', 'overlap'],
  }[review.character];
  const basic = priorities.map((id) => `${review.character}-basic-${id}`);
  return {
    ...review,
    curriculumAdapted: true,
    originalQuestionIds: review.originalQuestionIds || [...original],
    questionIds: original.map((id, i) => {
      if (!advancedArchiveQuestion(questions[i])) return id;
      const replacement = basic.find((id) => !taken.has(id));
      taken.add(replacement);
      return replacement;
    }),
  };
}
