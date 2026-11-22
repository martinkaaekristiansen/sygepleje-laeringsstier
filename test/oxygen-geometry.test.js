import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { createOxygenNetwork, HEAD_ORIGIN, alveolarLandmarks } from '../public/oxygen-network.js';
import { buildSwallowAnatomy } from '../public/digestion-swallow.js';
import { newOxygenRun } from '../public/oxygen-engine.js';
const n = createOxygenNetwork();
test('both airways, both hearts and the capillary circulation have connected endpoints', () => {
  for (const side of ['right', 'left']) {
    const ids = [
      'mainbronchus',
      'bronchus',
      'bronchiole',
      'terminal',
      'respiratory',
      'duct',
      'sac',
      'alveolus',
    ];
    for (let i = 1; i < ids.length; i++)
      assert(
        n.air
          .get(side + ':' + ids[i - 1])
          .path.getPointAt(1)
          .distanceTo(n.air.get(side + ':' + ids[i]).path.getPointAt(0)) < 1e-6,
      );
    assert(
      n.parts
        .get(side + ':pvenules')
        .path.getPointAt(1)
        .distanceTo(n.parts.get(side + ':pv').path.getPointAt(0)) < 1e-6,
    );
    assert(
      n.parts
        .get(side + ':pv')
        .path.getPointAt(1)
        .distanceTo(n.hearts.la.path.getPointAt(0)) < 1e-6,
    );
  }
  for (const [a, b] of [
    ['la', 'lv'],
    ['ra', 'rv'],
  ])
    assert(n.hearts[a].path.getPointAt(1).distanceTo(n.hearts[b].path.getPointAt(0)) < 1e-6);
  assert(
    n.parts.get('mouth').path.getPointAt(1).distanceTo(n.parts.get('nose').path.getPointAt(1)) <
      1e-9,
  );
});
test('the inhalation camera passes around the intact epiglottis, tongue root and open vocal folds', () => {
  const s = buildSwallowAnatomy({ continuous: true, labels: false });
  s.group.position.copy(HEAD_ORIGIN);
  s.update(0, false);
  s.group.updateMatrixWorld(true);
  const check = [s.tongue, ...s.vocalFolds],
    leaf = s.epiglottis,
    g = leaf.geometry,
    p = g.attributes.position,
    idx = g.index,
    tri = new T.Triangle(),
    closest = new T.Vector3(),
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3();
  let smallest = Infinity;
  for (const id of ['mouth', 'nose', 'pharynx', 'larynx'])
    for (let i = 0; i <= 100; i++) {
      const eye = n.parts.get(id).path.getPointAt(i / 100);
      for (const mesh of check) {
        const q = mesh.worldToLocal(eye.clone());
        assert(q.length() > 1.025, id + ' intersects ' + mesh.name + ' at ' + i);
      }
      for (let j = 0; j < idx.count; j += 3) {
        a.fromBufferAttribute(p, idx.getX(j)).applyMatrix4(leaf.matrixWorld);
        b.fromBufferAttribute(p, idx.getX(j + 1)).applyMatrix4(leaf.matrixWorld);
        c.fromBufferAttribute(p, idx.getX(j + 2)).applyMatrix4(leaf.matrixWorld);
        tri.set(a, b, c).closestPointToPoint(eye, closest);
        smallest = Math.min(smallest, eye.distanceTo(closest));
      }
    }
  assert(
    smallest > 0.025,
    'eye must clear epiglottis mesh by camera near-plane clearance: ' + smallest,
  );
});
test('alveolar diffusion meets epithelium, basal region and endothelium in order on either side', () => {
  for (const side of ['left', 'right']) {
    const a = alveolarLandmarks(side),
      origin = a.center,
      s = a.outward;
    assert(a.epithelium.clone().sub(origin).dot(s) < a.basal.clone().sub(origin).dot(s));
    assert(a.basal.clone().sub(origin).dot(s) < a.endothelium.clone().sub(origin).dot(s));
    assert(a.endothelium.clone().sub(origin).dot(s) < a.cell.clone().sub(origin).dot(s));
  }
});
test('route cameras stay finite and every branching combination remains one continuous walk', () => {
  for (const entry of ['nose', 'mouth'])
    for (const side of ['right', 'left'])
      for (const exit of ['nose', 'mouth']) {
        const r = n.routeFor({ ...newOxygenRun('hard'), entry, side, exit });
        assert.equal(Object.keys(r.stations).length, 58);
        let prior = r.at(0);
        for (let d = 0.12; d < r.length; d += 0.12) {
          const p = r.at(d);
          assert(p.toArray().every(Number.isFinite));
          assert(p.distanceTo(prior) < 0.14, 'continuous physical position');
          prior = p;
        }
        for (const edge of r.segments) assert(edge.path.getLength() > 0);
      }
});
test('the opened nostril and face do not intersect the camera on nasal entry', async () => {
  const { buildExternalFace } = await import('../public/digestion-face.js');
  const { ORAL_ORIGIN } = await import('../public/oxygen-network.js');
  const f = buildExternalFace({ nasalOpenings: true });
  f.group.position.copy(ORAL_ORIGIN);
  f.group.updateMatrixWorld(true);
  let minimum = Infinity;
  const tri = new T.Triangle(),
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3(),
    closest = new T.Vector3();
  for (const mesh of [f.skin, f.nose]) {
    const g = mesh.geometry,
      p = g.attributes.position,
      idx = g.index;
    for (let k = 0; k <= 70; k++) {
      const eye = n.parts.get('nose').path.getPointAt(k / 100);
      for (let j = 0; j < (idx?.count || p.count); j += 3) {
        a.fromBufferAttribute(p, idx ? idx.getX(j) : j).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(p, idx ? idx.getX(j + 1) : j + 1).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(p, idx ? idx.getX(j + 2) : j + 2).applyMatrix4(mesh.matrixWorld);
        tri.set(a, b, c).closestPointToPoint(eye, closest);
        minimum = Math.min(minimum, closest.distanceTo(eye));
      }
    }
  }
  assert(minimum > 0.008, 'nasal camera must clear face and nose surface: ' + minimum);
});
