import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { buildDigestiveTract, PHYSICAL_ORDER, JUNCTION_NAMES } from '../public/digestion-tract.js';
import { surfacePorts, orientSurface } from '../public/digestion-ports.js';
const tract = buildDigestiveTract();
const meshes = [];
for (const s of tract.segments) {
  const m = new T.Mesh(s.built.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
  m.applyMatrix4(s.matrix);
  m.updateMatrixWorld();
  m.name = s.id;
  meshes.push(m);
}
for (const c of tract.connections) {
  const m = new T.Mesh(c.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
  m.updateMatrixWorld();
  m.name = c.id;
  meshes.push(m);
}
test('one ordered tract: epiglottis is an observation, appendix a blind side branch', () => {
  assert.equal(tract.segments.length, 14);
  assert.equal(tract.connections.length, 13);
  assert.deepEqual(
    tract.segments.map((s) => s.id),
    PHYSICAL_ORDER,
  );
  assert.deepEqual(
    tract.connections.map((c) => c.id),
    JUNCTION_NAMES,
  );
  assert.equal(tract.byId.epiglottis, undefined);
  assert.equal(tract.byId.appendix, undefined);
  assert(tract.stations.epiglottis.distance > tract.stations.pharynx.distance);
  assert(tract.stations.epiglottis.distance < tract.stations.oesophagus.distance);
  assert.equal(tract.byId.caecum.built.geometry.userData.kind, 'blind-caecal-sac');
});
test('all 13 connections share exact wall edges; only mouth and anus are open', () => {
  const positions = [],
    indices = [];
  let offset = 0;
  for (const m of meshes) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      positions.push(
        ...new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).toArray(),
      );
    for (const i of m.geometry.index.array) indices.push(i + offset);
    offset += p.count;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  const ports = surfacePorts(g);
  assert.equal(ports.length, 2);
  assert(ports.some((p) => p.center.distanceTo(tract.segments[0].inlet.center) < 0.1));
  assert(ports.some((p) => p.center.distanceTo(tract.segments.at(-1).outlet.center) < 0.1));
  // Orientability also catches a reversed branch seam, even when edge counts pass.
  assert.doesNotThrow(() => orientSurface(g));
  g.dispose();
});
test('route has continuous positions and tangents across every physical join', () => {
  for (let i = 0; i < tract.parts.length - 1; i++) {
    const a = tract.parts[i].path,
      b = tract.parts[i + 1].path;
    assert(a.getPointAt(1).distanceTo(b.getPointAt(0)) < 1e-5);
    assert(a.getTangentAt(1).dot(b.getTangentAt(0)) > 0.98, tract.parts[i].id);
  }
});
test('first-person centerline never crosses a wall, including remote organs', () => {
  const ray = new T.Raycaster();
  let prior = tract.route.getPointAt(0);
  for (let s = 0.2; s < tract.route.length; s += 0.2) {
    const p = tract.route.getPointAt(s / tract.route.length),
      d = p.clone().sub(prior);
    ray.set(prior, d.clone().normalize());
    ray.near = 1e-5;
    ray.far = d.length();
    const hits = ray.intersectObjects(meshes);
    assert.equal(
      hits.length,
      0,
      `${s.toFixed(2)} ${tract.route.atDistance(s).part.id}: ${hits.map((h) => h.object.name)}`,
    );
    prior = p;
  }
});

test('gastric collars stay pinned during whole-wall regional motility', async () => {
  const { createMotility } = await import('../public/digestion-motility.js');
  const s = tract.byId.stomach,
    m = createMotility('stomach', s.built);
  for (const age of [0, 5, 12, 19, 40]) {
    m.update(age);
    for (const p of [...s.inlet.points, ...s.outlet.points]) {
      const local = p.clone().applyMatrix4(s.inverse);
      const { gastricFrame } = await import('../public/digestion-gastric.js');
      const f = gastricFrame(local);
      assert(m.point(local, f.u, f.axis).distanceTo(local) < 1e-6);
    }
  }
});

test('camera travel and reload share the same route distance without station snaps', async () => {
  const { createRouteCamera } = await import('../public/digestion-route-camera.js');
  const a = createRouteCamera(tract);
  a.begin('duodenum', 'travel');
  const start = a.distance;
  a.begin('jejunum', 'journey');
  let previous = start;
  for (let age = 0; age <= 8; age += 0.01) {
    a.update(age);
    assert(a.distance >= previous);
    assert(a.distance - previous < 0.2);
    previous = a.distance;
  }
  a.begin('ileum', 'journey');
  a.update(2.1);
  const checkpoint = a.checkpoint(),
    b = createRouteCamera(tract);
  b.begin('ileum', 'journey', 2.1, { ...checkpoint, age: 2.1 });
  assert.equal(a.distance, b.distance);
  a.update(2.2);
  b.update(2.2);
  assert.equal(a.distance, b.distance);
  a.update(8);
  a.begin('ileum', 'travel');
  const p = a.pose('ileum');
  assert(p.position.distanceTo(tract.stations.ileum.position) < 1e-6);
});
test('intestinal junctions continue folds and rooted villi instead of bare artificial corridors', async () => {
  const { buildVilli } = await import('../public/digestion-mucosa.js');
  for (const c of tract.connections.filter((c) => c.mucosaRegion)) {
    const built = {
      path: c.path,
      frames: c.path.computeFrenetFrames(24, false),
      surfaceFrame: c.surfaceFrame,
      mucosaRegion: c.mucosaRegion,
    };
    const villi = buildVilli(c.from, built, null);
    assert(villi.count >= 240);
    const proxy = new T.Mesh(c.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
    proxy.updateMatrixWorld();
    for (const a of villi.mesh.userData.anchors) {
      const p = new T.Vector3().fromArray(a.point),
        n = new T.Vector3().fromArray(a.inward);
      const ray = new T.Raycaster(p.clone().addScaledVector(n, 0.1), n.clone().negate(), 0, 0.2);
      const hit = ray.intersectObject(proxy)[0];
      assert(hit);
      assert(Math.abs(hit.distance - 0.1) < 0.002);
    }
  }
});
test('coordinated first-person swallow never intersects tongue, leaf, larynx or UES', async () => {
  const { buildSwallowAnatomy } = await import('../public/digestion-swallow.js'),
    { createRouteCamera, sceneStep } = await import('../public/digestion-route-camera.js');
  const rig = createRouteCamera(tract),
    model = buildSwallowAnatomy({ labels: false, continuous: true });
  rig.begin('epiglottis', 'travel');
  rig.begin('epiglottis', 'swallow');
  let prior = rig.pose('epiglottis').position;
  for (let t = 0.01; t < 3; t += 0.01) {
    rig.update(t);
    model.update(t, true);
    model.group.updateMatrixWorld();
    const p = rig.pose('epiglottis').position,
      d = p.clone().sub(prior),
      ray = new T.Raycaster(prior, d.clone().normalize(), 1e-5, d.length());
    assert.equal(
      ray
        .intersectObject(model.group, true)
        .filter((h) => h.object.visible && h.object.parent.visible).length,
      0,
      `swallow at ${t}`,
    );
    prior = p;
  }
  for (const mode of ['journey', 'swallow', 'intro', 'finale'])
    assert.equal(sceneStep(2, mode), 0.4, 'slow frames cannot skip metres of route');
});
test('all junction bends have space for the full mucosal radius, including endpoint collars', () => {
  for (let i = 0; i < tract.connections.length; i++) {
    const p = tract.connections[i].path,
      a = tract.segments[i].outlet.radius,
      b = tract.segments[i + 1].inlet.radius;
    for (let j = 0; j <= 150; j++) {
      const u = Math.max(0.0001, Math.min(0.9999, j / 150)),
        d = 0.0001,
        curvature =
          p
            .getTangentAt(u + d)
            .sub(p.getTangentAt(u - d))
            .length() /
          (2 * d * p.getLength()),
        radius = T.MathUtils.lerp(a, b, T.MathUtils.smoothstep(u, 0, 1));
      assert(1 / Math.max(curvature, 1e-8) / radius > 1.19, tract.connections[i].id);
    }
  }
});
test('the pharyngeal wall leaves larynx entrance and both vocal folds visible from the bolus', () => {
  const mesh = new T.Mesh(
    tract.byId.pharynx.built.geometry,
    new T.MeshBasicMaterial({ side: T.DoubleSide }),
  );
  mesh.updateMatrixWorld();
  for (const target of [
    [0, 0, -4.7],
    [-0.265, -0.27, -4.7],
    [0.265, -0.27, -4.7],
  ]) {
    const origin = tract.stations.epiglottis.position,
      d = new T.Vector3(...target).sub(origin),
      ray = new T.Raycaster(origin, d.clone().normalize(), 0, d.length());
    assert.equal(ray.intersectObject(mesh).length, 0);
  }
});
test('epiglottis blade and both vocal folds fit the default first-person mobile view', async () => {
  const { createRouteCamera } = await import('../public/digestion-route-camera.js'),
    rig = createRouteCamera(tract);
  rig.begin('epiglottis', 'travel');
  const pose = rig.pose('epiglottis');
  const camera = new T.PerspectiveCamera(74, 320 / 844, 0.03, 180);
  camera.position.copy(pose.position);
  camera.up.copy(pose.up);
  camera.lookAt(pose.look);
  camera.updateMatrixWorld();
  for (const p of [
    [0, 2.07, -4.06],
    [0, 1.045, -3.95],
    [0, 0.02, -4.06],
    [-0.265, -0.27, -4.7],
    [0.265, -0.27, -4.7],
  ]) {
    const screen = new T.Vector3(...p).project(camera);
    assert(Math.abs(screen.x) < 0.95 && Math.abs(screen.y) < 0.95 && screen.z < 1);
  }
});
test('ileocaecal lips open for the route camera without crossing mucosal tissue at any pulse phase', async () => {
  const { buildIleocaecalLips, ileocaecalGap } = await import('../public/digestion-caecum.js'),
    { createMotility } = await import('../public/digestion-motility.js');
  const core = tract.byId.caecum,
    motility = createMotility('caecum', core.built),
    lips = buildIleocaecalLips();
  for (const time of [0, 4, 10, 20, 27]) {
    motility.update(time);
    let prior = core.built.path.getPointAt(0);
    for (let j = 1; j <= 400; j++) {
      const p = core.built.path.getPointAt(j / 400),
        gap = ileocaecalGap((time / 28) % 1, p.distanceTo(new T.Vector3(3.06, 0.65, -6)));
      lips.children.forEach((lip, i) => {
        const q = new T.Vector3(3.06, 0.65 + (i ? 1 : -1) * gap, -6);
        lip.position.copy(motility.point(q, (q.y + 4.2) / 9, new T.Vector3(0.35, q.y, -6.2)));
      });
      lips.updateMatrixWorld();
      const d = p.clone().sub(prior),
        ray = new T.Raycaster(prior, d.clone().normalize(), 1e-5, d.length());
      assert.equal(ray.intersectObject(lips, true).length, 0, `time ${time}, route ${j / 400}`);
      prior = p;
    }
  }
});
test('mucosal culling sections use the actual joined surface and retain a full villus safety margin', () => {
  for (const c of tract.connections.filter((c) => c.mucosaRegion)) {
    assert.equal(c.sectionPorts.length, 9);
    assert(c.path.getLength() / 8 > c.mucosaRegion.villus + 0.06);
    const positions = c.geometry.attributes.position;
    for (const port of c.sectionPorts)
      for (const point of port.points) {
        let found = false;
        for (let i = 0; i < positions.count; i++) {
          if (point.distanceToSquared(new T.Vector3().fromBufferAttribute(positions, i)) < 1e-10) {
            found = true;
            break;
          }
        }
        assert(found, c.id + ': portal must be on the actual wall ring');
      }
  }
});
