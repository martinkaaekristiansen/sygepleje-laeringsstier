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
