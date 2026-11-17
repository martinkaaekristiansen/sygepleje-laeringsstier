import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ROUTE, BOSSES, ABSORPTION, DIGESTION_ID } from '../public/digestion-data.js';
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
      'epiglottis',
      'oesophagus',
      'stomach',
      'duodenum',
      'jejunum',
      'ileum',
      'caecum',
      'ascending',
      'transverse',
      'descending',
      'sigmoid',
      'rectum',
      'anus',
    ],
  );
  assert.deepEqual(
    ROUTE.filter((s) => s.automatic).map((s) => s.id),
    [],
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
        for (let i = 0; i < BOSSES[id][s.id].length; i++)
          assert.equal(chooseDigestion(r, true), true);
        assert.equal(r.phase, 'reaction');
        assert.ok(BOSSES[id][s.id].every((q) => q.options.length === 3));
      }
    }
    assert.equal(r.enzyme, enzymeTotal(id));
    assert.equal(r.errors, Object.keys(BOSSES[id]).length * 2);
    r.phase = 'won';
    assert.ok(validDigestion({ active: r, results: { [id]: r } }));
    assert.deepEqual(
      ABSORPTION[id].map((s) => s[0]),
      ['lumen', 'epithelium', 'transport', 'residue'],
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
  assert.equal(BOSSES.trine.mouth, undefined);
  assert.equal(BOSSES.trine.stomach, undefined);
  assert.equal(BOSSES.stanley.stomach, undefined);
  assert.equal(BOSSES.poul.mouth, undefined);
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

import {
  ENTRY_OPTIONS,
  anatomicalOptions,
  DIGEST_MAP_POINTS,
  renderDigestMap,
} from '../public/digestion-navigation.js';
import { toothPose, organCurve } from '../public/digestion-anatomy.js';
import { addSecretions } from '../public/digestion-secretions.js';
import * as T from '../public/three.module.min.js';
test('external entry and anatomical branch choices preserve real routes without invented junctions', () => {
  const r = newDigestion('stanley');
  assert.equal(r.phase, 'entry');
  chooseDigestion(r, false);
  assert.equal(r.lives, 1);
  chooseDigestion(r, true);
  assert.equal(r.phase, 'intro');
  assert.deepEqual(
    ENTRY_OPTIONS.map((o) => o.target),
    ['mouth', 'nose'],
  );
  for (const [id, correct, wrong] of [
    ['epiglottis', 'oesophagus', 'trachea'],
    ['caecum', 'ascending', 'appendix'],
  ]) {
    const opts = anatomicalOptions(ROUTE.findIndex((s) => s.id === id));
    assert.equal(opts.length, 2);
    assert.equal(opts.find((o) => o.correct).target, correct);
    assert.equal(opts.find((o) => !o.correct).target, wrong);
  }
  const ordinary = anatomicalOptions(2);
  assert.ok(ordinary.every((o) => !o.inspect));
});
test('upper and lower crowns face each other, with incisors at the front of both arches', () => {
  const upper = toothPose(7),
    lower = toothPose(23);
  assert.equal(upper.crownDirection, -1);
  assert.equal(lower.crownDirection, 1);
  const axis = new T.Vector3(0, 1, 0).applyAxisAngle(new T.Vector3(0, 0, 1), upper.rotation);
  assert.ok(axis.y < -0.99);
  assert.ok(upper.position[2] > toothPose(0).position[2]);
  assert.equal(toothPose(0).type, 'molar');
  assert.equal(toothPose(4).type, 'canine');
  assert.equal(upper.type, 'incisor');
});
test('colon curves and front-view map follow patient-right up, across, patient-left down and sigmoid S', () => {
  const asc = organCurve('ascending'),
    trans = organCurve('transverse'),
    desc = organCurve('descending');
  assert.ok(asc.getPointAt(0.8).y > asc.getPointAt(0.2).y);
  assert.ok(trans.getPointAt(0.8).x > trans.getPointAt(0.2).x);
  assert.ok(desc.getPointAt(0.8).y < desc.getPointAt(0.2).y);
  assert.ok(DIGEST_MAP_POINTS[9][0] < DIGEST_MAP_POINTS[11][0]);
  assert.ok(DIGEST_MAP_POINTS[9][1] < DIGEST_MAP_POINTS[8][1]);
  assert.match(renderDigestMap(9), /opadstigende/i);
  assert.ok(
    DIGEST_MAP_POINTS.slice(4).every(([x, y]) => x >= 42 && x <= 78 && y <= 116),
    'bowel stays inside the shared torso and pelvis silhouette',
  );
});
test('salivary, gastric and duodenal secretions use fluid streams and nutrient-specific proteins', () => {
  for (const [id, char] of [
    ['mouth', 'poul'],
    ['mouth', 'stanley'],
    ['stomach', 'stanley'],
    ['duodenum', 'trine'],
  ]) {
    const parent = new T.Group();
    const fluid = addSecretions(
      parent,
      ROUTE.find((s) => s.id === id),
      char,
    );
    assert.ok(fluid.count >= 2);
    fluid.update(2, 3);
    const instanced = [];
    parent.traverse((o) => {
      if (o.isInstancedMesh) instanced.push(o);
    });
    assert.ok(instanced.length > 0);
    if ((id === 'mouth' && char === 'poul') || (id === 'stomach' && char === 'stanley'))
      assert.ok(instanced.every((o) => o.geometry.type !== 'ExtrudeGeometry'));
    if (char === 'stanley' && id === 'mouth')
      assert.ok(instanced.some((o) => o.geometry.type === 'ExtrudeGeometry'));
    parent.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
      if (o.isInstancedMesh) o.dispose();
    });
  }
});
test('question counts and products follow the requested three nutrient pathways', () => {
  assert.deepEqual(Object.keys(BOSSES.stanley), ['mouth', 'duodenum', 'jejunum']);
  assert.deepEqual(Object.keys(BOSSES.trine), ['duodenum']);
  assert.deepEqual(Object.keys(BOSSES.poul), ['stomach', 'duodenum', 'jejunum']);
  assert.equal(BOSSES.trine.duodenum.length, 5);
  assert.deepEqual(
    Object.values(BOSSES.stanley).map((qs) => qs.at(-1).output),
    ['short-chain', 'maltose', 'glucose'],
  );
  assert.deepEqual(
    Object.values(BOSSES.poul).map((qs) => qs.at(-1).output),
    ['peptide', 'small-peptide', 'amino-acid'],
  );
  assert.ok(!JSON.stringify(BOSSES.trine).includes('lingual'));
  assert.match(BOSSES.poul.duodenum[1].why, /Enteropeptidase.*trypsinogen/);
});

import { migrateDigestion, enzymeTotal } from '../public/digestion-engine.js';
test('every navigation step has one true next structure and a varying explanatory distractor', () => {
  assert.equal(ROUTE.length, 15);
  const wrongs = new Set();
  for (const s of ROUTE.slice(0, -1)) {
    assert.ok(s.danish && s.latin);
    const opts = anatomicalOptions(s.index);
    assert.equal(opts.length, 2);
    assert.equal(opts.filter((o) => o.correct).length, 1);
    assert.equal(opts.find((o) => o.correct).target, ROUTE[s.index + 1].id);
    const wrong = opts.find((o) => !o.correct);
    assert.notEqual(wrong.target, ROUTE[s.index + 1].id);
    assert.ok(wrong.why.length > 30);
    wrongs.add(wrong.target);
  }
  assert.ok(wrongs.size >= 8);
  assert.match(ROUTE[2].text, /ikke gennem strubelåget/);
  assert.equal(DIGEST_MAP_POINTS.length, 15);
});
test('selected product models retain their distinct structures between scenes', () => {
  for (const [id, forms] of [
    [
      'stanley',
      [
        ['polysaccharide', 14],
        ['short-chain', 4],
        ['maltose', 2],
        ['glucose', 1],
      ],
    ],
    [
      'poul',
      [
        ['protein', 12],
        ['peptide', 4],
        ['small-peptide', 2],
        ['amino-acid', 1],
      ],
    ],
  ]) {
    for (const [form, n] of forms) {
      const m = nutrientModel(id, form);
      assert.equal(m.userData.units.length, n);
      assert.equal(m.userData.form, form);
    }
  }
  // The followed molecule must be one of the connected products actually
  // released by the preceding animation, rather than an unrelated new chain.
  for (const [id, organ, input, output] of [
    ['stanley', 'mouth', 'polysaccharide', 'short-chain'],
    ['stanley', 'duodenum', 'short-chain', 'maltose'],
    ['stanley', 'jejunum', 'maltose', 'glucose'],
    ['poul', 'stomach', 'protein', 'peptide'],
    ['poul', 'duodenum', 'peptide', 'small-peptide'],
    ['poul', 'jejunum', 'small-peptide', 'amino-acid'],
  ]) {
    const m = nutrientModel(id, input);
    m.userData.update(6, organ);
    const sizes = [],
      seen = new Set();
    for (let i = 0; i < m.userData.units.length; i++) {
      if (seen.has(i)) continue;
      const queue = [i];
      seen.add(i);
      let size = 0;
      while (queue.length) {
        const node = queue.pop();
        size++;
        for (const l of m.userData.links.filter((l) => l.visible)) {
          const { a, b } = l.userData,
            other = a === node ? b : b === node ? a : null;
          if (other !== null && !seen.has(other)) {
            seen.add(other);
            queue.push(other);
          }
        }
      }
      sizes.push(size);
    }
    assert.ok(
      sizes.includes(nutrientModel(id, output).userData.units.length),
      id + ' follows a released ' + output,
    );
  }
  const maltose = nutrientModel('stanley', 'maltose');
  maltose.userData.update(5, 'jejunum');
  assert.equal(maltose.userData.links.filter((l) => !l.visible).length, 1);
  const lipid = nutrientModel('trine', 'lipid-products');
  assert.deepEqual(
    lipid.userData.links.filter((l) => !l.visible).map((l) => l.userData.type),
    ['ester-1', 'ester-3'],
  );
});
test('old route checkpoints migrate safely and preserve all trophies and test results', () => {
  for (const [oldIndex, newId] of [
    [3, 'stomach'],
    [5, 'duodenum'],
    [9, 'caecum'],
    [16, 'anus'],
    [17, 'anus'],
  ]) {
    const old = { ...newDigestion('stanley'), index: oldIndex, phase: 'route' };
    delete old.routeVersion;
    const won = { ...old, index: 17, phase: 'won' };
    const data = {
      active: old,
      results: { stanley: won },
      assessments: { stanley: [scoreAssessment('stanley', [0, 1, 0, 0, 0])] },
    };
    assert.ok(validDigestion(data));
    const trophies = structuredClone(data.results),
      tests = structuredClone(data.assessments);
    migrateDigestion(data);
    assert.equal(ROUTE[data.active.index].id, newId);
    assert.equal(data.active.phase, 'arrival');
    assert.ok(validDigestion(data));
    assert.deepEqual(data.results, trophies);
    assert.deepEqual(data.assessments, tests);
    const once = structuredClone(data);
    migrateDigestion(data);
    assert.deepEqual(data, once);
  }
});
test('five-question fat challenge can save and retry without replaying completed chemistry on a route mistake', () => {
  const r = newDigestion('trine');
  r.index = 5;
  r.phase = 'boss';
  for (let i = 0; i < 4; i++) chooseDigestion(r, true);
  assert.equal(r.task, 4);
  assert.ok(validDigestion({ active: r, results: {} }));
  chooseDigestion(r, true);
  assert.equal(r.phase, 'reaction');
  assert.deepEqual(r.completed, ['duodenum']);
  r.phase = 'route';
  chooseDigestion(r, false);
  chooseDigestion(r, false);
  retryDigestion(r);
  assert.equal(r.phase, 'route');
});

test('legacy absorbed checkpoints resume for every nutrient, including fat without a jejunal boss', () => {
  for (const id of Object.keys(CHARACTERS)) {
    const r = { ...newDigestion(id), index: 7, phase: 'route', absorbed: true };
    delete r.routeVersion;
    const data = { active: r, results: {} };
    migrateDigestion(data);
    assert.equal(data.active.product, 'residue');
    assert.equal(data.active.index, 6);
    assert.ok(validDigestion(data));
  }
});

test('legacy lower-bowel checkpoints without an absorption flag safely follow residue', () => {
  const r = { ...newDigestion('poul'), index: 11, phase: 'route' };
  delete r.routeVersion;
  delete r.absorbed;
  const data = { active: r, results: {} };
  migrateDigestion(data);
  assert.equal(data.active.product, 'residue');
  assert.equal(data.active.absorbed, true);
  assert.ok(validDigestion(data));
});
