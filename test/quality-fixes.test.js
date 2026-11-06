import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { emptyState, validateState, addNewBuiltins, builtins } from '../public/model.js';
import { contentFingerprint } from '../public/content-version.js';
import { backupFile, restoreFile } from '../public/backup.js';
import { newDraft, assess, saveResult, repetitionNeeds } from '../public/circulation-engine.js';
import { getInProgressPaths } from '../public/progress.js';
import {
  cardiacCycle,
  respiratoryCycle,
  S2_TIME,
  BREATH_PERIOD,
} from '../public/journey-physiology.js';
import { circulationPath } from '../public/circulation-data.js';
const record = () => ({ done: [], notes: {}, answers: {} });
test('unsafe statistics, unknown route and malformed review data are rejected; missing legacy stats are accepted', () => {
  const state = emptyState(),
    p = (state.progress['blodcellens-rejse'] = record());
  for (const value of ['<img onerror=alert(1)>', -1, Infinity, {}, null]) {
    p.bloodJourney = { stats: { easy: { attempts: value } } };
    assert.equal(validateState(state), false);
  }
  p.bloodJourney = {};
  assert.equal(validateState(state), true);
  p.bloodJourney = { active: { level: 'constructor' } };
  assert.equal(validateState(state), false);
  delete p.bloodJourney;
  p.reviewSteps = 'wrong';
  assert.equal(validateState(state), false);
});
test('valid exports and recovery snapshots restore identically; damaged data cannot masquerade as a backup', () => {
  const state = emptyState();
  state.progress.example = record();
  state.progress.example.notes.step = 'Min refleksion';
  assert.deepEqual(restoreFile(JSON.parse(JSON.stringify(backupFile(state)))), state);
  assert.deepEqual(restoreFile({ format: 'laeringsstier-recovery', raw: state }), state);
  assert.throws(() => restoreFile({ format: 'laeringsstier-recovery' }));
  assert.throws(() => restoreFile({ format: 'laeringsstier-backup', state: {} }));
});
test('published updates preserve historical completion and notes, archive responses, and mark affected steps for review', () => {
  const state = emptyState(),
    old = state.paths[0],
    step = old.steps[0],
    q = step.questions[0];
  old.baselineFingerprint = contentFingerprint(old);
  state.progress[old.id] = {
    ...record(),
    done: [step.id],
    notes: { [step.id]: 'Bevar' },
    answers: { [step.id]: { [q.id]: q.optionIds[0] } },
  };
  const update = structuredClone(old);
  update.builtinVersion++;
  update.contentVersion++;
  update.steps[0].text += ' Ny forklaring.';
  const next = addNewBuiltins(state, [update]),
    r = next.progress[old.id];
  assert.equal(next.paths.length, state.paths.length);
  assert.equal(next.paths[0].steps[0].text, update.steps[0].text);
  assert.deepEqual(r.done, [step.id]);
  assert.equal(r.notes[step.id], 'Bevar');
  assert.deepEqual(r.reviewSteps, [step.id]);
  assert.equal(r.answers[step.id], undefined);
  assert.deepEqual(r.archivedAnswers[step.id], state.progress[old.id].answers[step.id]);
  assert.deepEqual(r.contentHistory[0].path, old);
  assert.ok(validateState(next));
  assert.deepEqual(addNewBuiltins(next, [update]), next);
});
test('locally edited content remains playable with mapped progress after official update; removed content stays removed', () => {
  const state = emptyState(),
    old = state.paths[0],
    step = old.steps[0],
    q = step.questions[0];
  old.baselineFingerprint = contentFingerprint(old);
  old.title = 'Lokal udgave';
  state.progress[old.id] = {
    ...record(),
    done: [step.id],
    notes: { [step.id]: 'Note' },
    answers: { [step.id]: { [q.id]: q.optionIds[q.correct] } },
  };
  const update = { ...structuredClone(builtins[0]), builtinVersion: old.builtinVersion + 1 };
  const next = addNewBuiltins(state, [update]);
  const copy = next.paths.find((p) => p.title === 'Lokal udgave (min tidligere udgave)'),
    r = next.progress[copy.id],
    copied = copy.steps[0];
  assert.ok(copy);
  assert.equal(r.notes[copied.id], 'Note');
  assert.equal(
    r.answers[copied.id][copied.questions[0].id],
    copied.questions[0].optionIds[q.correct],
  );
  assert.ok(validateState(next));
  state.paths.shift();
  assert.equal(
    addNewBuiltins(state, [update]).paths.some((p) => p.id === old.id),
    false,
  );
});
test('failed activities remain visible for review and repeated success resolves targeted repetition without erasing history', () => {
  const r = record();
  for (const activity of ['order', 'context'])
    saveResult(r, assess('easy', activity, newDraft('easy', activity)));
  assert.equal(getInProgressPaths([circulationPath], { [circulationPath.id]: r }).length, 1);
  const oldErrors = structuredClone(r.circulation.errors),
    result = assess('easy', 'context', newDraft('easy', 'context'));
  const target = result.items[0];
  target.id = 'aorta';
  target.dimension = 'before';
  target.correct = false;
  result.id = crypto.randomUUID();
  saveResult(r, result);
  assert.ok(repetitionNeeds(r.circulation, 'easy').aorta > 0);
  // An isolated dimension requires two successive correct observations.
  const isolated = record();
  for (const correct of [false, true, true]) {
    const one = {
      ...result,
      id: crypto.randomUUID(),
      items: [{ ...target, correct }],
      total: 1,
      correct: Number(correct),
      errors: Number(!correct),
      percent: correct ? 100 : 0,
      passed: correct,
    };
    saveResult(isolated, one);
  }
  assert.equal(repetitionNeeds(isolated.circulation, 'easy').aorta, undefined);
  assert.equal(isolated.circulation.errors.aorta, 1);
  for (const [id, count] of Object.entries(oldErrors)) assert.ok(r.circulation.errors[id] >= count);
});
test('ventricle reaches end-systolic emptying then fills; respiratory sound and volume share phases', () => {
  assert.equal(cardiacCycle(0).emptying, 0);
  assert.ok(cardiacCycle(0.2).emptying > cardiacCycle(0.1).emptying);
  assert.equal(cardiacCycle(S2_TIME).emptying, 1);
  assert.equal(cardiacCycle(0.35).emptying, 1);
  assert.ok(cardiacCycle(0.5).emptying < cardiacCycle(0.4).emptying);
  assert.equal(cardiacCycle(0.7).emptying, 0);
  assert.ok(respiratoryCycle(1.6).volume > respiratoryCycle(0.8).volume);
  assert.equal(respiratoryCycle(1.7).volume, 1);
  assert.ok(respiratoryCycle(2.5).volume < respiratoryCycle(1.8).volume);
  assert.equal(respiratoryCycle(3.8).sound, 0);
  assert.ok(Math.abs(respiratoryCycle(BREATH_PERIOD).volume) < 1e-10);
});
test('the actual workflow shell fails when a command before tee fails', () => {
  const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.ok((workflow.match(/set -euo pipefail/g) || []).length >= 2);
  const run = spawnSync(
    'bash',
    ['-c', 'set -euo pipefail\nfalse 2>&1 | tee /dev/null\necho SHOULD_NOT_RUN'],
    { encoding: 'utf8' },
  );
  assert.notEqual(run.status, 0);
  assert.ok(!run.stdout.includes('SHOULD_NOT_RUN'));
  assert.match(workflow, /needs: build/);
});
test('every teaching question has option-specific feedback; answer length no longer identifies most semester-5 answers', () => {
  for (const path of builtins.slice(0, 2))
    for (const step of path.steps)
      for (const q of step.questions) {
        assert.equal(q.explanations.length, q.a.length);
        assert.ok(q.explanations.every((e) => e.length > 10));
      }
  const qs = builtins[1].steps.flatMap((s) => s.questions);
  assert.ok(
    qs.filter((q) => q.a.every((a, i) => i === q.correct || a.length < q.a[q.correct].length))
      .length <
      qs.length / 2,
  );
  assert.ok(builtins[1].subjects.includes('Farmakologi'));
});
test('the actual 0.9.1 catalogue updates in place, preserving previous responses and every historical completion', () => {
  const old = JSON.parse(readFileSync('test/fixtures/v091-state.json', 'utf8')),
    next = addNewBuiltins(old);
  assert.equal(next.paths.length, 4);
  assert.ok(validateState(next));
  const p = next.paths[0],
    r = next.progress[p.id],
    prior = old.progress[p.id];
  assert.equal(p.contentVersion, 2);
  assert.deepEqual(r.done, prior.done);
  assert.deepEqual(r.notes, prior.notes);
  assert.equal(r.contentHistory[0].path.contentVersion, 1);
  assert.deepEqual(r.contentHistory[0].progress.answers, prior.answers);
  assert.deepEqual(r.archivedAnswers, prior.answers);
  assert.ok(r.reviewSteps.length > 0);
  assert.deepEqual(addNewBuiltins(next), next);
});
test('targeted context repetition resolves previous ordering mistakes, and does not leak to another difficulty', () => {
  const r = record(),
    draft = newDraft('easy', 'order'),
    result = assess('easy', 'order', draft);
  saveResult(r, result);
  const id = result.items.find((i) => !i.correct).id;
  assert.equal(repetitionNeeds(r.circulation, 'hard')[id], undefined);
  for (let attempt = 0; attempt < 2; attempt++) {
    const items = ['before', 'after', 'oxygen', 'circuit'].map((dimension) => ({
      id,
      dimension,
      name: 'Aorta',
      answer: 'a',
      expected: 'a',
      correct: true,
      explanation: 'Korrekt forbindelse',
    }));
    saveResult(r, {
      ...result,
      id: crypto.randomUUID(),
      activity: 'context',
      items,
      total: 4,
      correct: 4,
      errors: 0,
      percent: 100,
      passed: true,
    });
    if (attempt === 0) assert.ok(repetitionNeeds(r.circulation, 'easy')[id] > 0);
  }
  assert.equal(repetitionNeeds(r.circulation, 'easy')[id], undefined);
  assert.ok(r.circulation.errors[id] > 0);
});
test('a quiz restart archives first and corrected answers without erasing notes or other steps', async () => {
  const { restartStep } = await import('../public/quiz.js');
  const r = {
    done: ['one', 'two'],
    notes: { one: 'Bevar' },
    answers: { one: { q: 'correct' }, two: { q: 'other' } },
    firstAnswers: { one: { q: 'wrong' }, two: { q: 'other' } },
  };
  restartStep(r, 'one', '2026-11-06T00:00:00Z');
  assert.deepEqual(r.done, ['two']);
  assert.equal(r.answers.one, undefined);
  assert.equal(r.firstAnswers.one, undefined);
  assert.equal(r.notes.one, 'Bevar');
  assert.deepEqual(r.answerHistory[0].firstAnswers, { q: 'wrong' });
  assert.deepEqual(r.answerHistory[0].answers, { q: 'correct' });
});
