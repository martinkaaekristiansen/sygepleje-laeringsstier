import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTERS,
  ROUTE,
  BOSSES,
  ABSORPTION,
  REACTIONS,
  DIGESTION_ID,
} from '../public/digestion-data.js';
import {
  newDigestion,
  chooseDigestion,
  retryDigestion,
  validDigestion,
} from '../public/digestion-engine.js';
import { emptyState, validateState, addNewBuiltins } from '../public/model.js';
test('digestive route preserves all anatomical transitions, including ileum after jejunal absorption', () => {
  assert.deepEqual(
    ROUTE.map((s) => s.id),
    [
      'mouth',
      'pharynx',
      'oesophagus',
      'cardia',
      'stomach',
      'pylorus',
      'duodenum',
      'jejunum',
      'ileum',
      'ileocaecal',
      'caecum',
      'ascending',
      'transverse',
      'descending',
      'sigmoid',
      'rectum',
      'anal',
      'anus',
    ],
  );
  assert.deepEqual(
    ROUTE.filter((s) => s.automatic).map((s) => s.id),
    ['cardia', 'pylorus', 'ileocaecal', 'anal'],
  );
  assert.ok(ROUTE.every((s) => Number.isFinite(s.ph) && s.ph > 0 && s.ph < 14));
});
for (const id of Object.keys(CHARACTERS))
  test(`${id}: three compulsory bosses, retries, unique scores, absorption and persisted result`, () => {
    const r = newDigestion(id);
    for (const s of ROUTE) {
      r.index = s.index;
      if (BOSSES[id][s.id]) {
        r.phase = 'boss';
        r.task = 0;
        chooseDigestion(r, false);
        chooseDigestion(r, false);
        assert.equal(r.phase, 'retry');
        retryDigestion(r);
        assert.equal(r.lives, 2);
        assert.equal(r.task, 0);
        for (let i = 0; i < 3; i++) assert.equal(chooseDigestion(r, true), true);
        assert.equal(r.phase, 'reaction');
        assert.equal(BOSSES[id][s.id].length, 3);
        assert.equal(REACTIONS[id][s.id].length, 3);
      }
    }
    assert.equal(r.enzyme, 9);
    assert.equal(r.errors, 6);
    r.phase = 'won';
    assert.ok(validDigestion({ active: r, results: { [id]: r } }));
    assert.deepEqual(
      ABSORPTION[id].map((s) => s[0]),
      ['lumen', 'villus', 'cell', 'membrane', 'transport', 'residue'],
    );
    const state = emptyState();
    state.progress[DIGESTION_ID] = {
      done: ['digestion-' + id],
      notes: {},
      answers: {},
      digestion: { active: r, results: { [id]: r } },
    };
    assert.ok(validateState(state));
    r.index = 99;
    assert.equal(validDigestion({ active: r, results: {} }), false);
  });
test('nutrient-specific mechanisms distinguish blood, lymph, denaturation, emulsification and hydrolysis', () => {
  assert.match(CHARACTERS.stanley.transport, /SGLT1/);
  assert.match(CHARACTERS.stanley.transport, /GLUT2/);
  assert.match(CHARACTERS.trine.transport, /2-monoglycerider/);
  assert.match(CHARACTERS.trine.transport, /lymfekar/);
  assert.match(CHARACTERS.poul.transport, /PEPT1/);
  assert.match(BOSSES.trine.stomach[0].why, /begrænset/);
  assert.match(BOSSES.trine.duodenum[0].why, /ikke et enzym/);
  assert.match(BOSSES.poul.stomach[1].why, /ikke i sig selv/);
});
test('adding digestive game preserves old learner data and keeps retired lesson inaccessible', () => {
  const state = emptyState();
  state.paths = state.paths.filter((p) => p.id !== DIGESTION_ID);
  state.installed = state.installed.filter((id) => id !== DIGESTION_ID);
  state.progress[state.paths[0].id] = { done: [], notes: {}, answers: {} };
  const next = addNewBuiltins(state);
  assert.deepEqual(next.progress, state.progress);
  assert.ok(next.paths.some((p) => p.id === DIGESTION_ID));
  assert.ok(!next.paths.some((p) => p.id === 'fordoejelse'));
  assert.ok(validateState(next));
});

import {
  correctReaction,
  shuffled,
  activeClock,
  reactionState,
  relativeActivity,
} from '../public/digestion-engine.js';
import { scoreAssessment, FINAL_TESTS } from '../public/digestion-assessment.js';
test('reaction order rejects wrong order, duplicates, partial and malformed sequences', () => {
  for (const bad of [[2, 1, 0], [0, 2, 1], [0, 0, 2], [0, 1], ['0', 1, 2], null])
    assert.equal(correctReaction(bad), false);
  assert.ok(correctReaction([0, 1, 2]));
  const r = newDigestion('stanley');
  r.phase = 'boss';
  r.task = 2;
  chooseDigestion(r, correctReaction([1, 0, 2]));
  assert.equal(r.phase, 'boss');
  assert.equal(r.task, 2);
  assert.equal(r.enzyme, 0);
  assert.equal(r.lives, 1);
});
test('active time excludes pauses, closed tab time and replay of old start dates', () => {
  let t = 100;
  const r = newDigestion('stanley');
  r.started = 1;
  const clock = activeClock(r, () => t);
  clock.resume();
  t += 1500;
  clock.tick();
  assert.equal(r.elapsed, 1500);
  clock.pause();
  t += 100000;
  clock.resume();
  t += 500;
  clock.tick();
  assert.equal(r.elapsed, 2000);
  const resumed = activeClock(r, () => t);
  t += 999999;
  resumed.resume();
  t += 100;
  resumed.tick();
  assert.equal(r.elapsed, 2100);
});
test('answer permutation preserves identity and does not repeat the old fixed rotation', () => {
  const a = [{ correct: true }, { correct: false }, { correct: false }];
  const positions = new Set(
    [0, 0.4, 0.999].map((v) => shuffled(a, () => v).findIndex((o) => o.correct)),
  );
  assert.equal(positions.size, 3);
  assert.equal(a[0].correct, true);
});
test('assessment is separately scored and all nutrients have five explanatory questions', () => {
  for (const id of Object.keys(CHARACTERS)) {
    assert.equal(FINAL_TESTS[id].length, 5);
    assert.equal(scoreAssessment(id, [0, 1, 0, 2, 0]).correct, 3);
  }
  assert.throws(() => scoreAssessment('poul', [0, 1]));
});
test('chemical animation separates denaturation, emulsification, hydrolysis and reuse', () => {
  assert.equal(reactionState(1, 'poul', 'stomach').phase, 'denaturation');
  assert.equal(reactionState(1, 'trine', 'duodenum').phase, 'emulsification');
  assert.equal(reactionState(2.5, 'stanley', 'mouth').phase, 'binding');
  assert.equal(reactionState(3.5, 'stanley', 'mouth').cut, true);
  assert.equal(reactionState(7, 'stanley', 'mouth').phase, 'release');
  assert.equal(reactionState(6, 'poul', 'mouth').cut, false);
  assert.equal(reactionState(6, 'stanley', 'stomach').cut, false);
  assert.ok(relativeActivity(2, 'pepsin') > relativeActivity(6, 'pepsin'));
  assert.ok(
    relativeActivity(3, 'amylase') > 0 &&
      relativeActivity(3, 'amylase') < relativeActivity(6.8, 'amylase'),
  );
});

import { buildOrganSurface, peristalsis, lumenRadius } from '../public/digestion-anatomy.js';
import { nutrientModel } from '../public/digestion-molecules.js';
test('organ geometries are distinct, bounded and finite; jejunum and ileum have different folds', () => {
  for (const id of [
    'mouth',
    'oesophagus',
    'stomach',
    'duodenum',
    'jejunum',
    'ileum',
    'ascending',
  ]) {
    const s = ROUTE.find((s) => s.id === id),
      built = buildOrganSurface(s, true);
    assert.ok([...built.geometry.attributes.position.array].every(Number.isFinite));
    assert.ok(built.geometry.index.count / 3 < 30000);
    if (id === 'stomach') assert.equal(built.geometry.userData.kind, 'asymmetric-sac');
    if (id === 'duodenum') {
      assert.ok(built.path.getPointAt(0.9).x > 5);
      assert.equal(built.geometry.userData.kind, 'c-shaped');
    }
    built.geometry.dispose();
  }
  assert.notEqual(lumenRadius('jejunum', 0.3), lumenRadius('ileum', 0.3));
  assert.ok(peristalsis(0.14, 1) < peristalsis(0.7, 1));
});
test('molecular hydrolysis preserves alpha-1,6 and middle ester bonds and leaves coherent products', () => {
  const starch = nutrientModel('stanley');
  starch.userData.update(5, 'mouth');
  assert.ok(
    starch.userData.links.filter((l) => !l.visible).every((l) => l.userData.type === 'alpha-1,4'),
  );
  assert.ok(starch.userData.links.find((l) => l.userData.type === 'alpha-1,6').visible);
  const fat = nutrientModel('trine');
  fat.userData.update(5, 'duodenum');
  assert.deepEqual(
    fat.userData.links.filter((l) => !l.visible).map((l) => l.userData.type),
    ['ester-1', 'ester-3'],
  );
  assert.ok(fat.userData.links.find((l) => l.userData.type === 'ester-2').visible);
  const protein = nutrientModel('poul');
  protein.userData.update(1, 'stomach');
  assert.ok(protein.userData.links.every((l) => l.visible));
  protein.userData.update(5, 'stomach');
  assert.ok(protein.userData.links.some((l) => !l.visible));
  for (const m of [starch, fat, protein])
    m.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
});
test('legacy results survive new assessments, drafts and active clocks without deletion', () => {
  const r = newDigestion('poul');
  r.phase = 'won';
  delete r.timingVersion;
  const data = {
    results: { poul: r },
    assessments: { poul: [scoreAssessment('poul', [0, 1, 2, 0, 0])] },
    assessmentDraft: { character: 'poul', answers: [0, 1] },
  };
  assert.ok(validDigestion(data));
  const previous = structuredClone(data.results);
  data.assessments.poul.push(scoreAssessment('poul', [0, 0, 0, 0, 0]));
  assert.deepEqual(data.results, previous);
  data.assessmentDraft.answers = [99];
  assert.equal(validDigestion(data), false);
});
