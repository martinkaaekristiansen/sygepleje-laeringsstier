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
test('the real epiglottis blade centre and vocal folds fit desktop and mobile default views', async () => {
  const { createRouteCamera, digestionFieldOfView } = await import(
      '../public/digestion-route-camera.js'
    ),
    { buildSwallowAnatomy } = await import('../public/digestion-swallow.js'),
    rig = createRouteCamera(tract),
    model = buildSwallowAnatomy({ labels: false, continuous: true });
  model.group.updateMatrixWorld(true);
  model.epiglottis.geometry.computeBoundingSphere();
  for (const id of ['pharynx', 'epiglottis'])
    for (const aspect of [1280 / 800, 390 / 844, 320 / 844]) {
      rig.reset();
      rig.begin(id, 'travel');
      const pose = rig.pose(id),
        camera = new T.PerspectiveCamera(digestionFieldOfView(aspect), aspect, 0.03, 180);
      camera.position.copy(pose.position);
      camera.up.copy(pose.up);
      camera.lookAt(pose.look);
      camera.updateMatrixWorld(true);
      const blade = model.epiglottis.geometry.boundingSphere.center
        .clone()
        .applyMatrix4(model.epiglottis.matrixWorld);
      for (const point of [
        blade,
        ...model.vocalFolds.map((f) => f.getWorldPosition(new T.Vector3())),
      ]) {
        const screen = point.clone().project(camera);
        assert(Math.abs(screen.x) < 0.95 && Math.abs(screen.y) < 0.95 && screen.z < 1);
      }
      assert(Math.abs(blade.clone().project(camera).x) < 0.1, 'the shared midline stays central');
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
test('entry and old entry checkpoints remain outside the actual mouth opening', async () => {
  const { createRouteCamera, EXTERNAL_ENTRY } = await import('../public/digestion-route-camera.js');
  const rig = createRouteCamera(tract);
  rig.begin('anus', 'travel');
  rig.begin('mouth', 'face-intro');
  assert.equal(
    rig.distance,
    EXTERNAL_ENTRY.start,
    'a new journey resets an existing camera outside the face',
  );
  rig.update(3);
  assert.equal(rig.distance, EXTERNAL_ENTRY.choice);
  rig.begin('mouth', 'entry', 0, { physicalRouteVersion: 1, cameraDistance: 0 });
  const p = rig.pose('mouth').position,
    inlet = tract.byId.mouth.inlet;
  assert.equal(rig.distance, EXTERNAL_ENTRY.choice);
  assert(p.clone().sub(inlet.center).dot(inlet.outward) > 15);
  assert.equal(p.x, inlet.center.x);
  assert.equal(p.y, inlet.center.y);
});
test('outside-to-mouth flight and its negative-distance checkpoint are continuous', async () => {
  const { createRouteCamera } = await import('../public/digestion-route-camera.js');
  const rig = createRouteCamera(tract);
  rig.begin('mouth', 'entry');
  rig.begin('mouth', 'intro');
  const restored = createRouteCamera(tract);
  rig.update(4);
  assert(rig.distance < 0);
  restored.begin('mouth', 'intro', 4, JSON.parse(JSON.stringify(rig.checkpoint())));
  assert.equal(restored.distance, rig.distance);
  let prior = rig.pose('mouth').position;
  for (let t = 4; t <= 10; t += 0.01) {
    rig.update(t);
    restored.update(t);
    const p = rig.pose('mouth').position;
    assert(p.distanceTo(prior) < 0.04);
    assert(p.distanceTo(restored.pose('mouth').position) < 1e-10);
    prior = p;
  }
  rig.update(10);
  assert(rig.pose('mouth').position.distanceTo(tract.stations.mouth.position) < 1e-8);
});
test('external head has an opaque cheek and a genuine open route into the mouth', async () => {
  const { buildExternalFace } = await import('../public/digestion-face.js');
  const { ORAL_CENTER } = await import('../public/digestion-anatomy.js');
  const face = buildExternalFace();
  face.group.position.fromArray(ORAL_CENTER);
  face.group.updateMatrixWorld();
  const ray = new T.Raycaster(
    new T.Vector3(ORAL_CENTER[0], ORAL_CENTER[1], 22),
    new T.Vector3(0, 0, -1),
    0,
    24,
  );
  assert.equal(
    ray.intersectObject(face.group, true).length,
    0,
    'mouth has no head surface or black disc across it',
  );
  ray.ray.origin.x += 5;
  ray.ray.origin.y += 3;
  assert(
    ray.intersectObject(face.skin).length > 0,
    'face skin is still visible around the opening',
  );
  assert.equal(face.skin.material.transparent, false);
});
test('posterior tongue shares the oral midline through the coordinated swallowing cycle', async () => {
  const { buildSwallowAnatomy } = await import('../public/digestion-swallow.js');
  const model = buildSwallowAnatomy({ labels: false, continuous: true });
  for (const t of [0, 0.5, 1.2, 2.2, 3]) {
    model.update(t, true);
    assert.equal(model.tongue.position.x, tract.byId.mouth.inlet.center.x);
    assert(model.tongue.position.y + model.tongue.scale.y < tract.byId.mouth.inlet.center.y - 0.3);
  }
});
test('portrait camera widens anatomical context without moving the eye or changing desktop optics', async () => {
  const { digestionFieldOfView } = await import('../public/digestion-route-camera.js');
  assert.equal(digestionFieldOfView(1280 / 800), 74);
  assert.equal(digestionFieldOfView(844 / 390), 74);
  for (const aspect of [390 / 844, 375 / 667, 320 / 568, 768 / 1024]) {
    const fov = digestionFieldOfView(aspect);
    const horizontal = T.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(T.MathUtils.degToRad(fov / 2)) * aspect),
    );
    assert(Math.abs(horizontal - 74) < 1e-8);
  }
  assert(digestionFieldOfView(0.1) <= 120);
  const aspect = 390 / 844,
    old = new T.PerspectiveCamera(74, aspect, 0.03, 180),
    next = new T.PerspectiveCamera(digestionFieldOfView(aspect), aspect, 0.03, 180);
  const sample = new T.Vector3(1, 0, -3);
  assert(
    sample.clone().project(next).x < sample.clone().project(old).x * 0.65,
    'nearby anatomy occupies substantially less of the phone width',
  );
  assert(next.position.equals(old.position));
});
