import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ROUTE, BOSSES } from '../public/digestion-data.js';
import { learningPoint, rememberLearning, clinicalFor } from '../public/digestion-learning.js';
test('every anatomical and biochemical event has a complete, short, persistent learning point', () => {
  for (const character of Object.keys(CHARACTERS))
    for (const s of ROUTE) {
      for (const i of [undefined, ...(BOSSES[character][s.id] || []).map((_, i) => i)]) {
        const p = learningPoint(character, s.id, i);
        assert.ok(p.short);
        assert.ok(p.detail);
        assert.ok(p.short.split(/\s+/).length <= 20, p.short);
      }
    }
  const data = {};
  const p = learningPoint('stanley', 'mouth', 0);
  rememberLearning(data, p);
  rememberLearning(data, p);
  assert.equal(data.learningLog.length, 1);
  assert.deepEqual(data.learningCurrent, p);
  rememberLearning(data, learningPoint('stanley', 'mouth', 1));
  assert.equal(data.learningLog.length, 2);
  assert.deepEqual(data.learningLog[0], p);
});
test('clinical perspectives remain optional and identify relevant mechanisms without prescribing treatment', () => {
  assert.match(clinicalFor('stomach').text, /pH.*pepsin/);
  assert.match(clinicalFor('duodenum').text, /lipase/);
  assert.match(clinicalFor('ascending').text, /dehydrering/);
  assert.equal(clinicalFor('mouth'), null);
});

import { validDigestion, newDigestion } from '../public/digestion-engine.js';
test('learning logs and extended settings survive old saves and reject malformed imported entries', () => {
  const old = {
    active: newDigestion('stanley'),
    results: {},
    settings: { sound: false, volume: 0.3, motion: false, quality: 'auto' },
  };
  assert.ok(validDigestion(old));
  rememberLearning(old, learningPoint('stanley', 'mouth', 1));
  old.settings = { ...old.settings, ambient: false, effects: true, map: false };
  assert.ok(validDigestion(old));
  const copy = structuredClone(old);
  assert.deepEqual(copy.learningLog, old.learningLog);
  copy.learningLog[0].short = 42;
  assert.equal(validDigestion(copy), false);
  assert.equal(old.learningLog.length, 1);
});
