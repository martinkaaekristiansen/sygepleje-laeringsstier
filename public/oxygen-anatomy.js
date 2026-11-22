import * as T from './three.module.min.js';
import { buildExternalFace } from './digestion-face.js';
import { buildChewingAnatomy } from './digestion-chewing.js';
import { buildSwallowAnatomy } from './digestion-swallow.js';
import { anatomicalLabel } from './digestion-anatomy-labels.js';
import { vesselGeometry, wallMaterial, cellGeometry } from './journey-3d-geometry.js';
import { createGeometryLoader } from './journey-geometry-loader.js';
import { chamberFeatures, chamberAnimator } from './journey-chambers.js';
import { buildMucociliaryField, airwayRadius } from './oxygen-mucociliary.js';
import { HEAD_ORIGIN, ORAL_ORIGIN, sideSign, alveolarLandmarks } from './oxygen-network.js';
import { buildBloodStream, buildCounterDiffusion } from './oxygen-flow.js';
import { respiratoryCycle } from './journey-physiology.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  material = (color, options = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.7, ...options }),
  tube = (path, r, n = 60) => new T.TubeGeometry(path, n, r, 20, false);
function sliced(path, a, b) {
  return new T.CatmullRomCurve3(
    Array.from({ length: 65 }, (_, i) => path.getPointAt(T.MathUtils.lerp(a, b, i / 64))),
  );
}
export function openPorts(geometry, ports) {
  const p = geometry.attributes.position,
    index = geometry.index,
    kept = [],
    center = V();
  for (let i = 0; i < index.count; i += 3) {
    center.set(0, 0, 0);
    for (let j = 0; j < 3; j++) center.add(V().fromBufferAttribute(p, index.getX(i + j)));
    center.multiplyScalar(1 / 3);
    if (
      ports.some((port) => {
        const d = center.clone().sub(port.point);
        return (
          d.dot(port.outward) > -0.018 &&
          d.clone().addScaledVector(port.outward, -d.dot(port.outward)).length() <
            port.radius * 1.35
        );
      })
    )
      continue;
    kept.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  geometry.setIndex(kept);
  geometry.computeBoundingSphere();
  return geometry;
}
async function unionWall(parent, branches, radii, radius, color) {
  const points = [parent, ...branches].flatMap((c) => c.getPoints(30)),
    box = new T.Box3().setFromPoints(points).expandByScalar(Math.max(...radii.flat()) * 1.3),
    g = await vesselGeometry(
      {
        radius,
        entry: radii[0][0],
        kind: 'airway',
        radii,
        bounds: { min: box.min.toArray(), max: box.max.toArray() },
      },
      { parent, branches },
      'low',
    );
  const ports = [
    { point: parent.getPointAt(0), outward: parent.getTangentAt(0).negate(), radius: radii[0][0] },
    ...branches.map((b, i) => ({
      point: b.getPointAt(1),
      outward: b.getTangentAt(1),
      radius: radii[i + 1][1],
    })),
  ];
  openPorts(g, ports);
  return new T.Mesh(g, material(color, { side: T.BackSide }));
}
export function buildHead(network) {
  const group = new T.Group();
  group.name = 'reused-face-mouth-pharynx';
  const face = buildExternalFace({ nasalOpenings: true });
  face.group.position.copy(ORAL_ORIGIN);
  group.add(face.group);
  const oral = buildChewingAnatomy();
  oral.group.position.copy(ORAL_ORIGIN);
  oral.update(0, false);
  group.add(oral.group);
  const palate = new T.Mesh(new T.SphereGeometry(1, 24, 16), material(0xb96a7c));
  palate.position.copy(ORAL_ORIGIN).add(V(0, 2.8, -1));
  palate.scale.set(2.6, 0.3, 2);
  group.add(palate);
  const swallow = buildSwallowAnatomy({ continuous: true, labels: true });
  swallow.group.position.copy(HEAD_ORIGIN);
  swallow.update(0, false);
  group.add(swallow.group);
  const septum = new T.Mesh(new T.BoxGeometry(0.065, 2.7, 4.6), material(0xc78a8b));
  septum.position.set(0, 95.7, -0.25);
  group.add(septum);
  septum.add(anatomicalLabel('Septum nasi', [0.04, 0, 0.8], 1.3, { priority: 65, target: septum }));
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const fold = new T.Mesh(new T.SphereGeometry(1, 20, 12), material(0xc18187));
      fold.scale.set(0.22, 0.19, 1.5);
      fold.position.set(side * 0.95, 94.85 + i * 0.72, -0.4 - i * 0.12);
      group.add(fold);
      if (side === 1 && i === 1)
        fold.add(
          anatomicalLabel('Conchae nasales', [-0.25, 0.2, 0], 1.8, { priority: 80, target: fold }),
        );
    }
  let wall = null;
  const parentPoints = [
      V(0, 90, -4.7),
      ...network.parts.get('pharynx').path.getSpacedPoints(45).reverse(),
    ],
    parent = new T.CatmullRomCurve3(parentPoints),
    mouth = sliced(network.parts.get('mouth').path, 1, 0.17),
    nose = sliced(network.parts.get('nose').path, 1, 0.17),
    other = nose.clone();
  other.points = other.points.map((p) => V(-p.x, p.y, p.z));
  const ready = unionWall(
    parent,
    [mouth, nose, other],
    [
      [0.78, 1.2],
      [1.2, 1.8],
      [1.2, 0.26],
      [1.2, 0.26],
    ],
    1.2,
    0xb26b7a,
  ).then((m) => {
    wall = m;
    group.add(m);
    return m;
  });
  return {
    group,
    face,
    oral,
    swallow,
    ready,
    occluders: [
      face.skin,
      face.nose,
      palate,
      oral.tongue,
      swallow.tongue,
      swallow.epiglottis,
      ...swallow.vocalFolds,
    ],
    get wall() {
      return wall;
    },
  };
}
// Open, rounded alveolar outpocketings begin only in the respiratory zone.
function addAlveolarBuds(part, wall) {
  const count = { respiratory: 4, duct: 8, sac: 6 }[part.kind];
  if (!count) return null;
  const group = new T.Group(),
    holes = [],
    frames = part.path.computeFrenetFrames(80, false);
  for (let i = 0; i < count; i++) {
    const u = 0.15 + (0.7 * (i + 0.5)) / count,
      j = Math.round(u * 80),
      angle = i * 2.399,
      out = frames.normals[j]
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[j], Math.sin(angle)),
      r = airwayRadius(part, u),
      b = r * 0.55,
      opening = part.path.getPointAt(u).addScaledVector(out, r),
      center = opening.clone().addScaledVector(out, b * 0.55);
    const geo = new T.SphereGeometry(
        b,
        20,
        14,
        0,
        Math.PI * 2,
        Math.acos(0.55),
        Math.PI - Math.acos(0.55),
      ),
      mesh = new T.Mesh(geo, material(0xd1a19f, { side: T.DoubleSide }));
    mesh.position.copy(center);
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), out.clone().negate());
    group.add(mesh);
    holes.push({ point: opening, outward: out, radius: b * Math.sqrt(1 - 0.55 * 0.55) });
  }
  const p = wall.attributes.position,
    index = wall.index,
    kept = [],
    c = V();
  for (let i = 0; i < index.count; i += 3) {
    c.set(0, 0, 0);
    for (let j = 0; j < 3; j++) c.add(V().fromBufferAttribute(p, index.getX(i + j)));
    c.multiplyScalar(1 / 3);
    if (
      holes.some((h) => {
        const v = c.clone().sub(h.point);
        return (
          Math.abs(v.dot(h.outward)) < h.radius &&
          v.addScaledVector(h.outward, -v.dot(h.outward)).length() < h.radius
        );
      })
    )
      continue;
    kept.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  wall.setIndex(kept);
  group.name = 'open-alveolar-buds-' + part.kind;
  return group;
}
export function buildAirwayPart(part) {
  const group = new T.Group();
  group.name = part.id;
  const frames = part.path.computeFrenetFrames(64, false),
    g = new T.TubeGeometry(part.path, 64, 1, 24, false),
    p = g.attributes.position,
    n = g.attributes.normal;
  for (let j = 0; j <= 64; j++) {
    const u = j / 64,
      c = part.path.getPointAt(u),
      r = airwayRadius(part, u);
    for (let i = 0; i <= 24; i++) {
      const k = j * 25 + i,
        a = (i / 24) * Math.PI * 2,
        relief =
          part.kind === 'trachea' && a < Math.PI * 1.65
            ? 0.012 * Math.cos(u * part.path.getLength() * Math.PI * 1.6)
            : 0;
      p.setXYZ(
        k,
        c.x + n.getX(k) * (r + relief),
        c.y + n.getY(k) * (r + relief),
        c.z + n.getZ(k) * (r + relief),
      );
    }
  }
  const buds = addAlveolarBuds(part, g);
  g.computeVertexNormals();
  const translucent = ['trachea', 'bronchus'].includes(part.kind),
    wall = new T.Mesh(
      g,
      material(0xb66f7e, {
        side: T.BackSide,
        transparent: translucent,
        opacity: translucent ? 0.86 : 1,
        depthWrite: !translucent,
      }),
    );
  group.add(wall);
  if (buds) group.add(buds);
  const extras = new T.Group();
  group.add(extras);
  if (part.kind === 'trachea')
    for (let i = 0; i < 16; i++) {
      const u = 0.03 + i * 0.06,
        r = airwayRadius(part, u),
        ring = new T.Mesh(
          new T.TorusGeometry(r + 0.018, 0.035, 6, 32, Math.PI * 1.63),
          material(0xd5b6a8, { transparent: true, opacity: 0.32, depthWrite: false }),
        );
      ring.position.copy(part.path.getPointAt(u));
      ring.quaternion.setFromUnitVectors(V(0, 0, 1), part.path.getTangentAt(u));
      ring.rotateZ(-0.315 * Math.PI);
      extras.add(ring);
    }
  if (part.kind === 'trachea') {
    const positions = [],
      indices = [];
    for (let row = 0; row <= 48; row++) {
      const c = part.path.getPointAt(row / 48);
      for (let col = 0; col <= 8; col++) {
        const angle = -Math.PI / 2 + (col / 8 - 0.5) * Math.PI * 0.37;
        positions.push(c.x + Math.cos(angle) * 0.569, c.y, c.z + Math.sin(angle) * 0.569);
      }
    }
    for (let row = 0; row < 48; row++)
      for (let col = 0; col < 8; col++) {
        const a = row * 9 + col,
          b = a + 9;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const membrane = new T.Mesh(
      geo,
      material(0x9e6976, {
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    extras.add(membrane);
    group.add(
      anatomicalLabel(
        'Bageste membranøse væg',
        part.path
          .getPointAt(0.35)
          .add(V(0, 0, -0.56))
          .toArray(),
        1.8,
        { target: membrane, priority: 55 },
      ),
    );
  }
  if (part.kind === 'bronchus') {
    const plates = new T.InstancedMesh(
        new T.SphereGeometry(1, 8, 6),
        material(0xc8aea0, { transparent: true, opacity: 0.3, depthWrite: false }),
        24,
      ),
      d = new T.Object3D();
    for (let i = 0; i < 24; i++) {
      const u = 0.04 + (i / 24) * 0.9,
        j = Math.round(u * 64),
        a = i * 2.4,
        r = airwayRadius(part, u);
      d.position
        .copy(part.path.getPointAt(u))
        .addScaledVector(frames.normals[j], Math.cos(a) * r)
        .addScaledVector(frames.binormals[j], Math.sin(a) * r);
      d.scale.set(0.06, 0.13, 0.05);
      d.updateMatrix();
      plates.setMatrixAt(i, d.matrix);
    }
    extras.add(plates);
  }
  if (['bronchus', 'bronchiole', 'terminal', 'respiratory'].includes(part.kind))
    for (let i = 0; i < 12; i++) {
      const u = 0.06 + i * 0.075,
        ring = new T.Mesh(
          new T.TorusGeometry(airwayRadius(part, u) + 0.016, 0.012, 5, 24),
          material(0xc17f8a, { transparent: true, opacity: 0.25, depthWrite: false }),
        );
      ring.position.copy(part.path.getPointAt(u));
      ring.quaternion.setFromUnitVectors(V(0, 0, 1), part.path.getTangentAt(u));
      ring.rotateZ(-0.315 * Math.PI);
      extras.add(ring);
    }
  const field = buildMucociliaryField(part);
  if (field) group.add(field.group);
  const at = part.path.getPointAt(0.5),
    normal = frames.normals[32];
  const labels = [
    anatomicalLabel(
      part.kind === 'trachea'
        ? 'Respiratorisk epitel'
        : part.kind === 'bronchus'
          ? 'Bruskplader'
          : ['duct', 'sac'].includes(part.kind)
            ? 'Alveoleåbninger'
            : 'Glat muskulatur',
      at
        .clone()
        .addScaledVector(normal, part.radius * 0.8)
        .toArray(),
      1.5,
      { target: wall, priority: 40 },
    ),
  ];
  group.add(...labels);
  if (part.kind === 'trachea') {
    const goblets = new T.InstancedMesh(new T.SphereGeometry(0.018, 8, 6), material(0xe3c69c), 32),
      d = new T.Object3D();
    for (let i = 0; i < 32; i++) {
      const u = (i + 0.5) / 32,
        j = Math.round(u * 64),
        a = i * 2.4;
      d.position
        .copy(part.path.getPointAt(u))
        .addScaledVector(frames.normals[j], Math.cos(a) * (part.radius - 0.012))
        .addScaledVector(frames.binormals[j], Math.sin(a) * (part.radius - 0.012));
      d.scale.set(1, 1.7, 1);
      d.updateMatrix();
      goblets.setMatrixAt(i, d.matrix);
    }
    group.add(goblets);
    group.add(
      anatomicalLabel(
        'Bægerceller · slim',
        at
          .clone()
          .addScaledVector(normal, -part.radius * 0.8)
          .toArray(),
        1.8,
        { target: goblets, priority: 50 },
      ),
    );
  }
  return { group, wall, field, part };
}
export function buildAlveolus(side) {
  const a = alveolarLandmarks(side),
    sign = sideSign(side),
    group = new T.Group();
  group.name = side + '-alveolar-exchange';
  const inletAngle = Math.asin(0.8 / 2.6),
    outletAngle = Math.acos(2.5 / 2.6),
    geometry = new T.SphereGeometry(
      2.6,
      48,
      32,
      0,
      Math.PI * 2,
      inletAngle,
      Math.PI - inletAngle - outletAngle,
    );
  geometry.rotateZ((sign * Math.PI) / 2);
  const p = geometry.attributes.position;
  const wall = new T.Mesh(
    geometry,
    material(0xd2aaa8, { side: T.DoubleSide, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  wall.position.copy(a.center);
  group.add(wall);
  const rest = p.array.slice();
  const layers = [
      ['Alveoleepitel · type I', a.epithelium, 0xe0b6ae],
      ['Tynd fælles basalregion', a.basal, 0xe4d9b9],
      ['Kapillærendotel', a.endothelium, 0xb78194],
    ],
    membranes = [];
  for (const [name, point, color] of layers) {
    const m = new T.Mesh(
      new T.CircleGeometry(Math.sqrt(0.51), 48),
      material(color, { transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false }),
    );
    m.position.copy(point);
    m.rotation.y = Math.PI / 2;
    group.add(m);
    m.add(anatomicalLabel(name, [0, 0.65, 0], 1.9, { target: m, priority: 65 }));
    membranes.push(m);
  }
  const pneumoII = new T.InstancedMesh(new T.SphereGeometry(0.15, 12, 8), material(0xc89cce), 8),
    d = new T.Object3D();
  for (let i = 0; i < 8; i++) {
    const angle = i * 2.399,
      u = (i + 0.5) / 8,
      y = 2 * u - 1,
      normal = V(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle));
    d.position.copy(a.center).addScaledVector(normal, 2.48);
    d.updateMatrix();
    pneumoII.setMatrixAt(i, d.matrix);
  }
  group.add(pneumoII);
  group.add(
    anatomicalLabel(
      'Type II · surfaktant',
      a.center
        .clone()
        .add(V(0, 2.1, 0))
        .toArray(),
      1.9,
      { target: pneumoII, priority: 75 },
    ),
  );
  const surfactant = new T.Mesh(
    geometry.clone().scale(2.56 / 2.6, 2.56 / 2.6, 2.56 / 2.6),
    material(0xb6d2c6, { transparent: true, opacity: 0.065, side: T.BackSide, depthWrite: false }),
  );
  surfactant.position.copy(a.center);
  group.add(surfactant);
  const counterDiffusion = buildCounterDiffusion(a);
  group.add(counterDiffusion.group);
  const capillaryStreams = [];
  const capillaryMat = material(0xb97687, {
    side: T.BackSide,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const network = new T.Group();
  group.add(network);
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI) / 7,
      points = [];
    for (let j = 0; j <= 40; j++) {
      const t = (j / 40) * Math.PI * 1.65 - Math.PI * 0.82;
      points.push(
        a.center
          .clone()
          .add(
            V(
              sign * Math.cos(t) * 2.7,
              Math.sin(t) * Math.cos(angle) * 2.7,
              Math.sin(t) * Math.sin(angle) * 2.7,
            ),
          ),
      );
    }
    const path = new T.CatmullRomCurve3(points);
    network.add(new T.Mesh(tube(path, 0.1, 40), capillaryMat));
    const stream = buildBloodStream(path, 0.1, { kind: 'capillary', count: 7 });
    network.add(stream.group);
    capillaryStreams.push(stream);
  }
  const neighbors = new T.InstancedMesh(
    new T.SphereGeometry(0.7, 14, 10),
    material(0xc39a9b, { transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }),
    16,
  );
  for (let i = 0; i < 16; i++) {
    const angle = i * 2.399;
    d.position
      .copy(a.center)
      .add(V(Math.cos(angle) * 4.2, Math.sin(angle) * 3.8, -1.8 - (i % 3) * 0.8));
    d.scale.setScalar(0.8 + (i % 3) * 0.12);
    d.updateMatrix();
    neighbors.setMatrixAt(i, d.matrix);
  }
  group.add(neighbors);
  let last = -Infinity;
  return {
    group,
    wall,
    membranes,
    side,
    counterDiffusion,
    capillaryStreams,
    update(time, expiration = false, { camera, lod = true, reduced = false, volume = null } = {}) {
      counterDiffusion.update(time);
      if (camera)
        for (const stream of capillaryStreams) stream.update(time, camera, { lod, reduced });
      if (time - last < 0.08 && time >= last) return;
      last = time;
      const breath = volume ?? respiratoryCycle(time).volume,
        amount = 0.035 * (breath - 0.5);
      for (let i = 0; i < p.count; i++) {
        const v = V().fromArray(rest, i * 3),
          weight = T.MathUtils.smoothstep(2.4 - Math.abs(v.x), 0, 0.6);
        v.multiplyScalar(1 + amount * weight);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      p.needsUpdate = true;
      surfactant.scale.setScalar(1 + amount * 0.55);
    },
    snapshot: (time) => ({
      cilia: 0,
      typeI: true,
      typeII: 8,
      surfactant: true,
      capillaryNetwork: true,
      barrierLayers: layers.map((l) => l[0]),
      breath: respiratoryCycle(time),
    }),
  };
}
export function createBloodPartBuilder() {
  const loader = createGeometryLoader(),
    materials = new Map(),
    cellGeo = cellGeometry('low');
  function mat(kind) {
    if (!materials.has(kind)) {
      const m = wallMaterial(kind === 'capillary', 1);
      m.side = T.BackSide;
      if (kind === 'capillary') {
        m.transparent = true;
        m.opacity = 0.16;
        m.depthWrite = false;
        m.side = T.DoubleSide;
      }
      m.color.set(kind === 'vein' ? 0x8d455d : kind === 'capillary' ? 0xb7798b : 0xa34b60);
      materials.set(kind, m);
    }
    return materials.get(kind);
  }
  return {
    cellGeo,
    async chamber(def) {
      const group = new T.Group();
      group.name = def.stage.id;
      group.matrixAutoUpdate = false;
      group.matrix.copy(def.matrix);
      const geometry = await loader.chamber(def.stage, 'low'),
        wall = new T.Mesh(geometry, mat('chamber'));
      group.add(wall);
      const features = chamberFeatures(
          group,
          def.stage,
          { parent: def.native, branches: [] },
          geometry,
          { outletValve: def.stage.kind !== 'atrium' },
        ),
        animate = chamberAnimator(wall, def.stage),
        stream = buildBloodStream(def.native, def.stage.radius, {
          stage: def.stage,
          kind: def.stage.kind,
          count: 8,
        });
      group.add(stream.group);
      group.add(
        anatomicalLabel(def.stage.name, def.native.getPointAt(0.5).toArray(), 2, {
          target: wall,
          priority: 65,
        }),
      );
      return {
        group,
        wall,
        features,
        stream,
        definition: def,
        update(time, reduced) {
          animate(reduced ? 0 : time);
          features.update(time, reduced);
        },
      };
    },
    vessel(part) {
      const group = new T.Group();
      group.name = part.id;
      const wall = new T.Mesh(tube(part.path, part.radius, 64), mat(part.kind));
      group.add(wall);
      const stream = buildBloodStream(part.path, part.radius, { kind: part.kind });
      group.add(stream.group);
      return { group, wall, part, stream };
    },
    dispose() {
      loader.dispose();
    },
  };
}
export async function buildCarina(network) {
  const j = network.junction;
  const wall = await unionWall(
      j.parent,
      j.branches,
      [
        [0.57, 0.5],
        [0.5, 0.342],
        [0.5, 0.342],
      ],
      0.57,
      0xb87380,
    ),
    group = new T.Group();
  group.add(wall);
  group.name = 'open-carina-both-main-bronchi';
  group.add(
    anatomicalLabel('Carina tracheae', j.parent.getPointAt(0.92).toArray(), 1.6, {
      target: wall,
      priority: 80,
    }),
  );
  return { group, wall };
}
