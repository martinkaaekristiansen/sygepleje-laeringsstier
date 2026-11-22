import { QUESTION_POOLS, assessmentQuestions } from './digestion-assessment.js';
import { selectAssessmentIds, reviewFromResult } from './learning-assessment.js';
export function createAssessment(character, previous, random = Math.random) {
  if (!Object.hasOwn(QUESTION_POOLS, character)) throw Error('Ukendt næringsstof.');
  const questionIds = selectAssessmentIds(QUESTION_POOLS[character], previous, random);
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
  const review = reviewFromResult(result);
  return review ? adaptReviewQuestions(review) : null;
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
