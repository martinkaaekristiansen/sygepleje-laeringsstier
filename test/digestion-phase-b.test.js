import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { ROUTE } from '../public/digestion-data.js';
import { buildOrganSurface, lumenRadius } from '../public/digestion-anatomy.js';
import { buildVilli, MUCOSA_REGIONS, mucosaFrame, villusSway } from '../public/digestion-mucosa.js';
import {
  epiglottisGeometry,
  buildSwallowAnatomy,
  swallowingPose,
} from '../public/digestion-swallow.js';
import { buildCaecumGeometry } from '../public/digestion-caecum.js';

test('epiglottis has a broad rounded blade, narrow attachment and coordinated resting/recovery pose', () => {
  const g = epiglottisGeometry(),
    p = g.attributes.position;
  const widths = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const j = y < 0.07 ? 0 : y < 1.7 ? 1 : 2;
    widths[j] = Math.max(widths[j], Math.abs(p.getX(i)));
  }
  assert.ok(widths[1] > widths[0] * 4);
  assert.ok(widths[2] > widths[0] * 2);
  const model = buildSwallowAnatomy({ labels: false });
  const posterior = new T.Box3().setFromObject(model.oesophagus),
    anterior = new T.Box3().setFromObject(model.trachea);
  assert.ok(posterior.max.z < anterior.min.z, 'oesophagus is actually posterior to the trachea');
  assert.equal(swallowingPose(10).closure, 0);
  assert.equal(swallowingPose(1, false).closure, 0);
  const rest = model.update(0, false),
    closed = model.update(1.3, true);
  assert.ok(closed.lift > rest.lift && closed.anterior > rest.anterior);
  assert.ok(closed.epiglottisAngle < -1.4 && closed.vocalGap < 0.03 && closed.ues > 0.9);
  assert.ok(
    model.larynx.position.z > -4.7,
    'larynx moves anteriorly, away from the posterior oesophagus',
  );
  model.update(3.2, true);
  assert.ok(model.pivot.rotation.x === 0);
  model.group.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  g.dispose();
});

test('villi are numerous, rounded, rooted on the actual curved folds, and regional heights differ', () => {
  for (const id of Object.keys(MUCOSA_REGIONS)) {
    const built = buildOrganSurface(ROUTE.find((s) => s.id === id)),
      villi = buildVilli(id, built, null);
    assert.ok(villi.count >= 1500);
    assert.equal(
      villi.meshes.reduce((n, m) => n + m.count, 0),
      villi.count,
    );
    assert.ok(villi.meshes.every((m) => m.geometry.type === 'CapsuleGeometry'));
    const triangles = villi.meshes.reduce((n, m) => n + (m.geometry.index.count / 3) * m.count, 0);
    villi.setBudget(0.8);
    assert.equal(
      villi.meshes.reduce((n, m) => n + m.count, 0),
      villi.count,
    );
    assert.ok(
      villi.meshes.reduce((n, m) => n + (m.geometry.index.count / 3) * m.count, 0) < triangles,
    );
    villi.setBudget(1);
    for (const anchor of villi.mesh.userData.anchors) {
      const frame = mucosaFrame(id, built, anchor.u, anchor.a);
      assert.ok(frame.point.distanceTo(new T.Vector3(...anchor.point)) < 1e-5);
      const c = built.path.getPointAt(anchor.u);
      assert.ok(Math.abs(frame.point.distanceTo(c) - lumenRadius(id, anchor.u, anchor.a)) < 1e-5);
      assert.ok(frame.inward.dot(frame.point.clone().sub(c)) < 0);
    }
    assert.ok(villusSway(0, 0.425, 3, 2) === 0);
    assert.ok(Math.abs(villusSway(0.425, 0.425, 3, 2)) <= 0.022);
    assert.notEqual(villusSway(0.425, 0.425, 3, 2), villusSway(0.425, 0.425, 3, 3));
    assert.ok(built.geometry.index.count / 3 < 30000);
    built.geometry.dispose();
    villi.meshes.forEach((m) => {
      m.userData.geometryLods.forEach((g) => g.dispose());
      m.material.dispose();
      m.dispose();
    });
  }
  assert.ok(MUCOSA_REGIONS.jejunum.villus > MUCOSA_REGIONS.ileum.villus);
  assert.ok(MUCOSA_REGIONS.jejunum.height > MUCOSA_REGIONS.ileum.height);
});

test('caecal sac has one connected wall, a low blind floor, smaller appendix and welded side branches', () => {
  const g = buildCaecumGeometry(),
    meta = g.userData;
  assert.ok(meta.floor[1] < meta.branches.ileum.center[1]);
  assert.ok(meta.branches.appendix.center[1] < meta.branches.ileum.center[1]);
  assert.ok(meta.branches.appendix.center[2] < -6, 'posterior attachment');
  assert.ok(meta.branches.appendix.radius < meta.ascendingRadius / 8);
  assert.ok(
    meta.branches.appendix.length > 4 && meta.branches.appendix.length < 8,
    'worm-shaped appendix has a plausible length relative to the caecal width',
  );
  assert.ok(meta.branches.appendix.end[1] < meta.branches.appendix.center[1]);
  const index = g.index.array,
    adj = new Map();
  for (let i = 0; i < index.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = index[i + j],
        b = index[i + ((j + 1) % 3)];
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    }
  }
  const seen = new Set(),
    stack = [index[0]];
  while (stack.length) {
    const a = stack.pop();
    if (seen.has(a)) continue;
    seen.add(a);
    stack.push(...adj.get(a));
  }
  assert.equal(
    seen.size,
    adj.size,
    'appendix and ileum share actual boundary vertices with the sac',
  );
  // Welding coincident seam/tip vertices leaves only the two natural open ends.
  const vertices = g.attributes.position.array,
    vertexIds = [],
    unique = new Map(),
    edges = new Map();
  for (let i = 0; i < vertices.length; i += 3) {
    const key = [...vertices.slice(i, i + 3)].map((n) => Math.round(n * 1e5)).join(',');
    if (!unique.has(key)) unique.set(key, unique.size);
    vertexIds.push(unique.get(key));
  }
  for (let i = 0; i < index.length; i += 3) {
    const t = [vertexIds[index[i]], vertexIds[index[i + 1]], vertexIds[index[i + 2]]];
    if (new Set(t).size < 3) continue;
    for (let j = 0; j < 3; j++) {
      const key = [t[j], t[(j + 1) % 3]].sort((a, b) => a - b).join(',');
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  assert.equal(
    [...edges.values()].filter((n) => n === 1).length,
    96 + meta.branches.ileum.boundary.length,
    'only ascending-colon and ileal continuations are open',
  );
  assert.ok(
    [...edges.values()].every((n) => n <= 2),
    'no non-manifold joins',
  );
  assert.ok([...g.attributes.position.array].every(Number.isFinite));
  g.dispose();
});

import { viewPose } from '../public/digestion-camera.js';
test('station cameras and their initial view rays stay inside the real lumen', () => {
  for (const id of [
    'duodenum',
    'jejunum',
    'ileum',
    'ascending',
    'transverse',
    'descending',
    'sigmoid',
    'rectum',
    'caecum',
  ]) {
    const g =
      id === 'caecum'
        ? buildCaecumGeometry()
        : buildOrganSurface(ROUTE.find((s) => s.id === id)).geometry;
    const mesh = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide }));
    mesh.updateMatrixWorld();
    const pose = viewPose(id),
      distance = pose.position.distanceTo(pose.look);
    const ray = new T.Raycaster(
      pose.position,
      pose.look.clone().sub(pose.position).normalize(),
      0.03,
      distance,
    );
    assert.equal(
      ray.intersectObject(mesh).length,
      0,
      id + ': initial view is not blocked by its wall',
    );
    g.dispose();
    mesh.material.dispose();
  }
});
