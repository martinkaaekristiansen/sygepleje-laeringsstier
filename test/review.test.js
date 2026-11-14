import test from 'node:test';
import assert from 'node:assert/strict';
import { getReviewItems } from '../public/progress.js';
import { circulationPath } from '../public/circulation-data.js';
import { newDraft, assess, saveResult } from '../public/circulation-engine.js';

test('repetition lists current wrong answers and content updates, and clears corrected answers', () => {
  const path = {
    id: 'quiz',
    title: 'Quiz',
    steps: [
      {
        id: 'one',
        title: 'Trin 1',
        questions: [{ id: 'q', q: 'Spørgsmål', optionIds: ['wrong', 'right'], correct: 1 }],
      },
    ],
  };
  const record = { answers: { one: { q: 'wrong' } }, reviewSteps: ['one', 'deleted'] };
  assert.equal(getReviewItems([path], { quiz: record }).length, 2);
  record.answers.one.q = 'right';
  assert.equal(getReviewItems([path], { quiz: record }).length, 1);
  record.reviewSteps = [];
  assert.deepEqual(getReviewItems([path], { quiz: record }), []);
});

test('circulation repetition links retain difficulty and ignore archived activities', () => {
  const record = { done: [], notes: {}, answers: {} };
  const data = (record.circulation = { level: 'easy', drafts: {}, results: {}, errors: {} });
  for (const level of ['easy', 'hard']) {
    const draft = newDraft(level, 'context');
    saveResult(record, assess(level, 'context', draft));
  }
  data.results['medium:retired'] = { last: { passed: false } };
  const items = getReviewItems([circulationPath], { [circulationPath.id]: { circulation: data } });
  assert.deepEqual(
    items.map((i) => i.level),
    ['easy', 'hard'],
  );
  assert.ok(items.every((i) => i.stepId === 'circulation-context'));
  assert.deepEqual(getReviewItems([circulationPath], {}), []);
});
