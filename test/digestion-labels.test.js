import test from 'node:test';
import assert from 'node:assert/strict';
import { anatomicalLabel, labelRectangleFits } from '../public/digestion-anatomy-labels.js';
import { buildSwallowAnatomy } from '../public/digestion-swallow.js';
import * as T from '../public/three.module.min.js';
test('anatomical text anchors retain real hierarchy and follow the moving epiglottis', () => {
  const anatomy = buildSwallowAnatomy({ labels: true, continuous: true });
  const anchor = anatomy.epiglottis.children.find(
    (o) => o.userData.anatomicalLabel === 'Epiglottis',
  );
  assert(anchor);
  anatomy.update(0, false);
  anatomy.group.updateMatrixWorld(true);
  const rest = anchor.getWorldPosition(new T.Vector3());
  anatomy.update(1.2, true);
  anatomy.group.updateMatrixWorld(true);
  assert(anchor.getWorldPosition(new T.Vector3()).distanceTo(rest) > 0.2);
  assert.equal(anchor.userData.target, anatomy.epiglottis);
  assert.equal(anatomicalLabel('Test', [1, 2, 3]).type, 'Object3D');
});
test('label placement refuses panels, other text, anatomical points and clipped screen edges', () => {
  const bounds = { width: 390, height: 844 },
    rect = { x: 30, y: 350, width: 150, height: 32 };
  assert(labelRectangleFits(rect, bounds, []));
  assert(!labelRectangleFits(rect, bounds, [{ x: 20, y: 340, width: 170, height: 60 }]));
  assert(!labelRectangleFits(rect, bounds, [], [{ x: 100, y: 360 }]));
  assert(!labelRectangleFits({ ...rect, x: -1 }, bounds, []));
  assert(!labelRectangleFits({ ...rect, x: 300 }, bounds, []));
});
