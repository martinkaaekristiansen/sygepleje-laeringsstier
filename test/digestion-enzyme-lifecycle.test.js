import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { createEnzymeLifecycle } from '../public/digestion-enzyme-lifecycle.js';
import { enzymeModel } from '../public/digestion-enzyme-model.js';
import { BOSSES } from '../public/digestion-data.js';
import { enzymeIdentity } from '../public/digestion-enzyme-identity.js';

test('all seven selected enzymes retain the actual choice mesh through questions and intact release', () => {
  let count = 0;
  for (const [character, stages] of Object.entries(BOSSES))
    for (const [stage, tasks] of Object.entries(stages))
      for (const task of tasks.filter(
        (q) => q.kind === 'enzyme' && enzymeIdentity(q.options[0]).id !== 'bile',
      )) {
        const owner = new T.Group(),
          candidate = new T.Group(),
          model = enzymeModel(task.options[0]);
        candidate.add(model);
        owner.add(candidate);
        const disposed = [],
          life = createEnzymeLifecycle((g) => disposed.push(g));
        const scope = character + ':' + stage;
        assert.equal(life.select(task.options[0], scope, candidate), candidate);
        assert(!owner.children.includes(candidate));
        const first = life.snapshot();
        for (const mode of ['boss', 'secretion', 'boss', 'reaction']) {
          life.enter(scope, mode);
          life.stepExit(12);
          assert.equal(life.current.object, candidate);
          assert.equal(candidate.children[0], model);
          assert.equal(life.snapshot().geometry, first.geometry);
          assert.equal(life.snapshot().color, first.color);
          assert.equal(life.snapshot().serial, 1);
          assert.equal(life.snapshot().intact, true);
        }
        life.enter(scope, 'travel');
        life.stepExit(0.6);
        assert.equal(life.snapshot().retiring, true);
        assert.equal(life.current.object, candidate);
        life.stepExit(0.6);
        assert.equal(life.current, null);
        assert.deepEqual(disposed, [candidate]);
        count++;
      }
  assert.equal(count, 7);
});
test('bile is excluded and scope changes remove the previous enzyme without duplication', () => {
  const life = createEnzymeLifecycle();
  assert.equal(life.select('Galde', 'trine:duodenum'), null);
  life.select('Pepsin', 'poul:stomach');
  const first = life.current.object;
  assert.equal(life.select('Pepsin', 'poul:stomach'), first);
  assert.equal(life.layer.children.length, 1);
  life.enter('poul:duodenum', 'boss');
  assert.equal(life.current, null);
  life.select('Trypsin', 'poul:duodenum');
  assert.notEqual(life.current.object, first);
  assert.equal(life.layer.children.length, 1);
});
