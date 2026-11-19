import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { buildChewingAnatomy, TONGUE_RADII } from '../public/digestion-chewing.js';
import { toothPose, ORAL_CENTER } from '../public/digestion-anatomy.js';
import { CHEW_RATE } from '../public/digestion-audio.js';
import { buildSwallowAnatomy } from '../public/digestion-swallow.js';
import { buildDigestiveTract } from '../public/digestion-tract.js';
import { createRouteCamera } from '../public/digestion-route-camera.js';

test('real teeth and cusps stay outside the tongue during two complete chew cycles', () => {
  const model = buildChewingAnatomy();
  let closest = Infinity;
  for (let i = 0; i <= 240; i++) {
    model.update(((i / 240) * 4 * Math.PI) / CHEW_RATE);
    model.group.updateMatrixWorld(true);
    const inverse = model.tongue.matrixWorld.clone().invert();
    for (const tooth of model.teeth)
      tooth.traverse((part) => {
        if (!part.isMesh) return;
        const vertices = part.geometry.attributes.position;
        for (let j = 0; j < vertices.count; j++) {
          const p = new T.Vector3()
            .fromBufferAttribute(vertices, j)
            .applyMatrix4(part.matrixWorld)
            .applyMatrix4(inverse);
          closest = Math.min(closest, p.length());
          assert(p.length() > 1.02, `enamel intersects the tongue at phase ${i / 240}`);
        }
      });
  }
  assert(closest > 1.02);
  assert.deepEqual(model.tongue.scale.toArray(), TONGUE_RADII);
});
test('resting epiglottis leaves both vocal folds visible from the real bolus camera', () => {
  const tract = buildDigestiveTract(),
    anatomy = buildSwallowAnatomy({ labels: false, continuous: true }),
    rig = createRouteCamera(tract);
  rig.begin('epiglottis', 'travel');
  anatomy.update(0, false);
  anatomy.group.updateMatrixWorld(true);
  const origin = rig.pose('epiglottis').position;
  for (const fold of anatomy.vocalFolds) {
    const end = fold.getWorldPosition(new T.Vector3()),
      delta = end.clone().sub(origin);
    const ray = new T.Raycaster(origin, delta.clone().normalize(), 0.01, delta.length() - 0.13);
    assert.equal(
      ray.intersectObject(anatomy.epiglottis).length,
      0,
      'the resting leaf must not obscure both vocal folds',
    );
  }
});
test('opposing crowns close to a common bite plane and reopen with the whole mandible', () => {
  const model = buildChewingAnatomy();
  model.update(Math.PI / (2 * CHEW_RATE));
  for (let i = 0; i < 16; i++) {
    const upper = toothPose(i),
      lower = toothPose(i + 16);
    const upperSurface = upper.position[1] - upper.crownExtent;
    const lowerSurface = lower.position[1] + lower.crownExtent + model.lower.position.y;
    assert(Math.abs(upperSurface - lowerSurface) < 1e-10);
  }
  const closed = model.lower.position.y;
  model.update(0);
  assert(closed - model.lower.position.y > 1.19);
  assert(model.lower.children.some((c) => c.geometry?.type === 'TubeGeometry'));
});
test('oral route, tongue root, epiglottis and larynx share the anatomical midline', () => {
  const tract = buildDigestiveTract(),
    anatomy = buildSwallowAnatomy({ labels: false, continuous: true });
  anatomy.oesophagus.geometry.computeBoundingBox();
  const oesophagusCenter = anatomy.oesophagus.geometry.boundingBox.getCenter(new T.Vector3());
  assert.equal(ORAL_CENTER[0], 0);
  for (const part of ['mouth', 'pharynx'])
    for (let i = 0; i <= 100; i++)
      assert(Math.abs(tract.byId[part].path.getPointAt(i / 100).x) < 1e-8);
  for (let t = 0; t <= 3; t += 0.02) {
    anatomy.update(t, true);
    anatomy.group.updateMatrixWorld(true);
    for (const object of [anatomy.tongue, anatomy.pivot, anatomy.larynx])
      assert(Math.abs(object.getWorldPosition(new T.Vector3()).x) < 1e-8);
    assert(oesophagusCenter.z < anatomy.larynx.position.z);
  }
});
