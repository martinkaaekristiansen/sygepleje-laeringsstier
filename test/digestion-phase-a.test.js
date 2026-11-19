import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, CHARACTERS, ROUTE } from '../public/digestion-data.js';
import {
  enzymeIdentity,
  enzymeSymbol,
  enzymeOutline,
} from '../public/digestion-enzyme-identity.js';
import { enzymeModel } from '../public/digestion-enzyme-model.js';
import { originIcon } from '../public/digestion-presentation.js';
import { learningPoint } from '../public/digestion-learning.js';
import { shuffled, newDigestion, validDigestion } from '../public/digestion-engine.js';
import { renderBudget } from '../public/digestion-performance.js';

test('each enzyme option retains its matching model and icon when shuffled', () => {
  const shapes = new Map();
  for (const bosses of Object.values(BOSSES))
    for (const tasks of Object.values(bosses)) {
      for (const task of tasks.filter((t) => t.kind === 'enzyme')) {
        for (const label of shuffled(task.options, () => 0.25)) {
          const identity = enzymeIdentity(label);
          assert.ok(identity, label);
          const model = enzymeModel(label);
          assert.equal(model.userData.enzymeId, identity.id);
          assert.equal('#' + model.material.color.getHexString(), identity.color);
          assert.match(enzymeSymbol(label), new RegExp(`data-enzyme-id="${identity.id}"`));
          const outline = JSON.stringify(enzymeOutline(identity));
          if (identity.id !== 'amylase') shapes.set(identity.id, outline);
          model.geometry.dispose();
          model.material.dispose();
        }
      }
    }
  assert.equal(new Set(shapes.values()).size, shapes.size);
  assert.equal(enzymeIdentity('Galde').id, 'bile');
});

test('origin silhouettes distinguish pancreas, salivary glands, liver and gallbladder', () => {
  const path = (label) => originIcon(label).split('<g ')[1];
  assert.equal(
    new Set(['Spytkirtlerne', 'Bugspytkirtlen', 'Leveren', 'Galdeblæren'].map(path)).size,
    4,
  );
});

test('station information follows the nutrient and stays valid for every route checkpoint', () => {
  assert.doesNotMatch(learningPoint('stanley', 'stomach').short, /protein|pepsin/i);
  assert.match(learningPoint('poul', 'stomach').short, /protein|pepsin/i);
  assert.match(learningPoint('trine', 'jejunum').short, /Micellerne.*tarmvæggen.*Galdesaltene/i);
  for (const id of Object.keys(CHARACTERS))
    for (const stage of ROUTE) {
      const point = learningPoint(id, stage.id);
      assert.ok(point.short);
      assert.equal(point.character, id);
    }
});

test('render budget drops and recovers resolution without changing save data or scene content', () => {
  const budget = renderBudget(2);
  assert.equal(budget.ratio, 2);
  for (let i = 0; i < 500; i++) budget.sample(40);
  assert.equal(budget.ratio, 0.8);
  for (let i = 0; i < 2500; i++) budget.sample(16);
  assert.equal(budget.ratio, 2);
  budget.sample(5000);
  assert.equal(budget.ratio, 2);
  for (const quality of ['low', 'auto']) {
    const data = {
      active: newDigestion('stanley'),
      results: {},
      settings: { quality, sound: false, motion: true, volume: 0.3 },
    };
    assert.ok(validDigestion(data));
  }
});
