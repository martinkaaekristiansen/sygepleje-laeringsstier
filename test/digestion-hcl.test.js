import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES } from '../public/digestion-data.js';
import { nutrientModel } from '../public/digestion-molecules.js';
import {
  newDigestion,
  migrateDigestion,
  validDigestion,
  reactionState,
  enzymeTotal,
} from '../public/digestion-engine.js';

test('HCl and denaturation precede the preserved pepsin questions and HCl is not an enzyme', () => {
  const tasks = BOSSES.poul.stomach;
  assert.equal(tasks.length, 5);
  assert.deepEqual(
    tasks.slice(0, 2).map((q) => q.visual),
    ['hcl', 'denaturation'],
  );
  assert.equal(tasks[0].options[0], 'Saltsyre (HCl)');
  assert.notEqual(tasks[0].kind, 'enzyme');
  assert.equal(tasks[2].options[0], 'Pepsin');
  assert.equal(tasks[4].output, 'peptide');
  assert.match(tasks[1].why, /ikke i sig selv peptidbindinger/);
});
test('denaturation alters real 3D conformation while every peptide bond stays intact, then pepsin cleaves', () => {
  const protein = nutrientModel('poul', 'protein'),
    { units, links } = protein.userData;
  const folded = units.map((u) => u.position.clone()),
    ids = links.map((l) => l.uuid);
  for (let i = 0; i <= 60; i++) {
    const state = protein.userData.denature(i / 60);
    assert.equal(state.cut, false);
    assert(links.every((l) => l.visible));
    assert.deepEqual(
      links.map((l) => l.uuid),
      ids,
    );
    assert.equal(links.length, units.length - 1);
    for (const link of links) assert(link.scale.y > 0 && link.scale.y < 0.8);
  }
  assert(units.some((u, i) => u.position.distanceTo(folded[i]) > 0.8));
  assert(
    units.some((u) => Math.abs(u.position.z) > 0.1),
    'partly unfolded chain remains three-dimensional',
  );
  assert.equal(reactionState(1, 'poul', 'stomach', { denatured: true }).phase, 'approach');
  protein.userData.update(1, 'stomach', { denatured: true });
  assert(links.every((l) => l.visible));
  protein.userData.update(5, 'stomach', { denatured: true });
  assert(links.some((l) => !l.visible));
  assert(
    links.some((l) => l.visible),
    'pepsin produces peptides rather than free amino acids',
  );
});
test('new acid and denaturation animations validate and migrate idempotently without scoring twice', () => {
  for (const [mode, task] of [
    ['hcl', 1],
    ['denaturation', 2],
  ]) {
    const run = {
      ...newDigestion('poul'),
      index: 4,
      phase: 'secretion',
      secretionKind: mode,
      task,
      enzyme: task,
      answered: Array.from({ length: task }, (_, i) => '4:' + i),
      animation: { stage: 'stomach', mode, age: 2.3 },
    };
    const data = { results: {}, active: run };
    assert(validDigestion(data));
    migrateDigestion(data);
    const first = JSON.stringify(data);
    migrateDigestion(data);
    assert.equal(JSON.stringify(data), first);
    assert.equal(data.active.animation.age, 2.3);
    assert.equal(data.active.enzyme, task);
  }
});
test('pre-HCl stomach checkpoints retain their question, lives, points and historical result', () => {
  for (const [phase, task, expected] of [
    ['boss', 0, 0],
    ['boss', 1, 3],
    ['boss', 2, 4],
    ['secretion', 2, 4],
    ['reaction', 0, 0],
  ]) {
    const old = {
      ...newDigestion('poul'),
      index: 4,
      phase,
      task,
      lives: 1,
      enzyme: task,
      answered: Array.from({ length: task }, (_, i) => '4:' + i),
    };
    delete old.gastricCurriculumVersion;
    if (phase === 'reaction') old.completed = ['stomach'];
    const trophy = { ...old, index: 14, phase: 'won', task: 0 },
      data = { results: { poul: trophy }, active: old };
    const frozen = JSON.stringify(trophy);
    migrateDigestion(data);
    assert.equal(data.active.task, expected);
    assert.equal(data.active.enzyme, task);
    assert.equal(data.active.lives, 1);
    assert.deepEqual(
      data.active.answered,
      Array.from({ length: task }, (_, i) => '4:' + (i + 2)),
    );
    assert.equal(JSON.stringify(data.results.poul), frozen);
    assert(validDigestion(data));
    assert.equal(enzymeTotal('poul', data.results.poul), 9);
    const once = JSON.stringify(data);
    migrateDigestion(data);
    assert.equal(JSON.stringify(data), once);
  }
});
test('older pre-continuous protein runs receive no automatic points for the added acid questions', () => {
  const old = { ...newDigestion('poul'), index: 7, phase: 'arrival', enzyme: 6 };
  delete old.routeVersion;
  delete old.gastricCurriculumVersion;
  const data = { results: {}, active: old };
  migrateDigestion(data);
  assert.equal(data.active.enzyme, 6);
  assert.equal(enzymeTotal('poul', data.active), 9);
  assert(!data.active.answered.includes('4:0'));
  assert(!data.active.answered.includes('4:1'));
  assert(validDigestion(data));
});
