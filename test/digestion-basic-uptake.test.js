import test from 'node:test';
import assert from 'node:assert/strict';
import { uptakePose, lipidLessonPose, BASIC_TEXT } from '../public/digestion-uptake.js';
import {
  QUESTION_POOLS,
  assessmentQuestions,
  scoreAssessment,
} from '../public/digestion-assessment.js';
import { newDigestion, migrateDigestion, validDigestion } from '../public/digestion-engine.js';
import { createAssessment } from '../public/digestion-exam.js';
test('all nutrient packets approach and cross the wall automatically; bile never crosses', () => {
  for (const id of ['stanley', 'poul', 'trine'])
    for (let i = 0; i < 6; i++) {
      assert(uptakePose(0, i, id === 'trine').cargoDistance > 1);
      assert(uptakePose(10, i, id === 'trine').cargoDistance < 0);
      assert(uptakePose(10, i, id === 'trine').absorbed);
      for (let t = 0; t < 11; t += 0.1) assert(uptakePose(t, i, true).saltDistance >= 0.4);
    }
  assert.match(BASIC_TEXT.residue, /ufordøjelig rest/);
  assert.equal(lipidLessonPose(5).intactTriglycerides, 0);
  assert.equal(lipidLessonPose(5).assembly, 1);
});
test('new exams use basic concepts and historical IDs retain original scoring', () => {
  for (const id of Object.keys(QUESTION_POOLS)) {
    assert.equal(QUESTION_POOLS[id].length, 12);
    assert.doesNotMatch(
      JSON.stringify(QUESTION_POOLS[id]),
      /SGLT1|GLUT2|PEPT1|chylom|intracellul/i,
    );
    const exam = createAssessment(id);
    assert(exam.questionIds.every((q) => q.includes('-basic-')));
    assert.equal(scoreAssessment(id, [0, 0, 0, 0, 0], exam.questionIds).correct, 5);
    assert.equal(
      assessmentQuestions(
        id,
        [0, 1, 2, 3, 4].map((i) => `${id}-legacy-${i}`),
      ).length,
      5,
    );
  }
});
test('migration keeps scores, lives and archives, replaces only unanswered old exam questions', () => {
  const old = {
    character: 'trine',
    questionIds: [0, 1, 2, 3, 4].map((i) => `trine-legacy-${i}`),
    answers: [0, 1],
  };
  for (const view of ['absorb', 'transport', 'residue']) {
    const run = {
      ...newDigestion('trine'),
      index: 6,
      phase: view === 'absorb' ? 'absorb-choice' : 'absorption',
      absorptionView: view,
      enzyme: 5,
      anatomy: 6,
      lives: 1,
    };
    const data = { results: {}, active: run, assessmentDraft: structuredClone(old) };
    migrateDigestion(data);
    assert(validDigestion(data));
    assert.equal(data.active.enzyme, 5);
    assert.equal(data.active.anatomy, 6);
    assert.equal(data.active.lives, 1);
    assert.equal(data.active.phase, view === 'absorb' ? 'absorption' : 'route');
    assert.deepEqual(data.assessmentDraft.questionIds.slice(0, 2), old.questionIds.slice(0, 2));
    assert(data.assessmentDraft.questionIds.slice(2).every((q) => q.includes('-basic-')));
  }
});
test('residue journeys, completed games and their camera checkpoints survive migration unchanged', () => {
  for (const phase of ['route', 'arrival', 'won']) {
    const run = {
      ...newDigestion('trine'),
      index: phase === 'won' ? 14 : 8,
      phase,
      absorbed: true,
      product: 'residue',
      absorptionView: 'residue',
      micellesFormed: true,
      animation: {
        stage: phase === 'won' ? 'anus' : 'caecum',
        mode: phase === 'arrival' ? 'journey' : phase === 'won' ? 'finale' : 'travel',
        age: 2,
        physicalRouteVersion: 1,
        cameraDistance: 155,
        fromDistance: 150,
        targetDistance: 160,
        travelDuration: 3,
        worldTime: 105,
        yaw: 1,
        pitch: 0.3,
      },
    };
    const data = { curriculumVersion: 1, results: {}, active: structuredClone(run) };
    migrateDigestion(data);
    assert.deepEqual(data.active, run);
    assert(validDigestion(data));
  }
});
test('review of old advanced answers uses basic equivalents without rewriting historical scores', async () => {
  const { createReview } = await import('../public/digestion-exam.js');
  for (const character of ['stanley', 'poul', 'trine']) {
    const old = scoreAssessment(character, [1, 0, 2, 0, 1]),
      unchanged = structuredClone(old),
      review = createReview(old);
    assert.deepEqual(old, unchanged);
    assert.deepEqual(review.review.indices, [0, 2, 4]);
    assert.doesNotMatch(
      JSON.stringify(assessmentQuestions(character, review.questionIds)),
      /SGLT1|GLUT2|PEPT1|chylom|intracellul|reesterific/i,
    );
    assert(validDigestion({ results: {}, reviewDraft: review }));
  }
});
