import * as T from './three.module.min.js';
import { trabecularField, myocardiumMaterial, trabecularBridges } from './journey-myocardium.js';
import { createValve, VALVE_ANATOMY } from './journey-valves.js';
import { cardiacCycle, valveOpening } from './journey-physiology.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  clamp = T.MathUtils.clamp;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const blend = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const plans = new WeakMap();
export function chamberPlan(s) {
  if (plans.has(s)) return plans.get(s);
  const left = ['la', 'lv', 'left'].includes(s.id),
    atrium = s.kind === 'atrium';
  const center = V(0, atrium ? 0 : -0.25, atrium ? -3 : -3.7);
  const radii = atrium
    ? V(left ? 1.25 : 1.4, left ? 1.0 : 1.15, 1.15)
    : V(left ? 1.4 : 1.7, left ? 1.65 : 1.35, 1.4);
  const points = atrium
    ? left
      ? [
          V(-0.58, 0.35, 0.4),
          V(-0.58, 0.35, -1.8),
          V(-0.4, 0.15, -2.8),
          V(0.1, -0.15, -3.2),
          V(0.8, -0.65, -3.5),
          V(1.7, -1.2, -3.8),
          V(2.6, -1.8, -4.1),
        ]
      : [
          V(-0.5, 3, -2.5),
          V(-0.5, 1.5, -2.6),
          V(-0.3, 0.4, -2.9),
          V(0.1, -0.1, -3.2),
          V(0.8, -0.55, -3.6),
          V(1.7, -1.2, -3.9),
          V(2.6, -1.8, -4.2),
        ]
    : [
        V(-0.45, 2.5, -2.3),
        V(-0.45, 1.2, -2.6),
        V(-0.35, 0.25, -3.1),
        V(-0.15, -0.35, -3.7),
        V(0.65, -0.15, -4.05),
        V(0.8, 1.3, -4.3),
        V(1.15, 3.1, -4.6),
      ];
  const parent = new T.CatmullRomCurve3(points.map((p) => p.multiplyScalar(s.radius))),
    ports = [];
  // Entry and exit necks are separate from the chamber cavity; never a single
  // enlarged vessel. Additional openings are real venous inlets, not choices.
  const add = (a, b, r = 0.34) => ports.push({ a, b, r });
  add(
    points[0].clone().multiplyScalar(1 / s.radius),
    points[2].clone().multiplyScalar(1 / s.radius),
    0.4,
  );
  add(
    points[4].clone().multiplyScalar(1 / s.radius),
    points[6].clone().multiplyScalar(1 / s.radius),
    0.38,
  );
  if (atrium && left)
    for (const x of [-0.58, 0.58])
      for (const y of [-0.35, 0.35]) add(V(x, y, -2.6), V(x, y, 0.5), 0.22);
  if (atrium && !left) add(V(-0.55, -0.4, -2.8), V(-0.55, -3, -2.4), 0.32);
  // Extend ports outside the sampling box: actual open lumens, no end caps.
  for (let i = 0; i < ports.length; i++) {
    const port = ports[i],
      direction = port.b.clone().sub(port.a).normalize();
    if (i === 0) port.a.addScaledVector(direction, -2);
    else port.b.addScaledVector(direction, 2);
  }
  const auricle = atrium ? V(left ? -1.1 : 1.2, 0.45, -3) : null;
  const plan = {
    left,
    atrium,
    center,
    radii,
    parent,
    ports,
    auricle,
    exitValve: atrium
      ? { id: left ? 'mitral' : 'tricuspid', kind: left ? 'av-two' : 'av-three' }
      : { id: left ? 'aorticValve' : 'pulmonaryValve', kind: 'semilunar' },
    inletValve: atrium
      ? null
      : { id: left ? 'mitral' : 'tricuspid', kind: left ? 'av-two' : 'av-three' },
  };
  plans.set(s, plan);
  return plan;
}
export function chamberField(s, p, plan = chamberPlan(s)) {
  const c = plan.center,
    r = plan.radii,
    y = (p.y - c.y) / r.y;
  const taper = plan.atrium ? 1 : 0.78 + 0.22 * smooth(-1, 0.6, y);
  const x = p.x - c.x - (plan.left ? 0.12 : -0.13) * y - 0.07 * Math.sin((p.z - c.z) * 2);
  let value =
    (Math.hypot(x / (r.x * taper), (p.y - c.y) / r.y, (p.z - c.z) / r.z) - 1) *
    Math.min(r.x, r.y, r.z);
  if (!plan.atrium && !plan.left) value = Math.max(value, -p.x - 0.92); // flatter septal surface
  if (plan.auricle) value = blend(value, p.distanceTo(plan.auricle) - 0.49, 0.2);
  for (const port of plan.ports) {
    const d = port.b.clone().sub(port.a),
      t = clamp(p.clone().sub(port.a).dot(d) / d.lengthSq(), 0, 1),
      closest = port.a.clone().addScaledVector(d, t);
    value = blend(value, p.distanceTo(closest) - port.r, 0.22);
  }
  return value;
}
// Marching tetrahedra over an implicit chamber + its short ports. Shared edge
// vertices make one connected surface. Existing vessel meshes remain unchanged.
export function chamberGeometry(s, quality = 'low') {
  const plan = chamberPlan(s),
    step = quality === 'low' ? 0.085 : 0.065,
    min = V(-2.3, -2.8, -5.5),
    max = V(3.1, 3.4, 0.7),
    nx = Math.ceil((max.x - min.x) / step) + 1,
    ny = Math.ceil((max.y - min.y) / step) + 1,
    nz = Math.ceil((max.z - min.z) / step) + 1;
  const index = (x, y, z) => x + nx * (y + ny * z),
    values = new Float32Array(nx * ny * nz),
    coords = [];
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const p = V(min.x + x * step, min.y + y * step, min.z + z * step);
        coords.push(p);
        values[index(x, y, z)] = chamberField(s, p, plan);
      }
  const positions = [],
    indices = [],
    cache = new Map(),
    corners = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    tets = [
      [0, 5, 1, 6],
      [0, 1, 2, 6],
      [0, 2, 3, 6],
      [0, 3, 7, 6],
      [0, 7, 4, 6],
      [0, 4, 5, 6],
    ];
  function vertex(a, b) {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (cache.has(key)) return cache.get(key);
    const t = values[a] / (values[a] - values[b]),
      p = coords[a].clone().lerp(coords[b], t),
      i = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    cache.set(key, i);
    return i;
  }
  const epsilon = 0.01;
  function gradient(p) {
    return V(
      chamberField(s, p.clone().add(V(epsilon, 0, 0)), plan) -
        chamberField(s, p.clone().add(V(-epsilon, 0, 0)), plan),
      chamberField(s, p.clone().add(V(0, epsilon, 0)), plan) -
        chamberField(s, p.clone().add(V(0, -epsilon, 0)), plan),
      chamberField(s, p.clone().add(V(0, 0, epsilon)), plan) -
        chamberField(s, p.clone().add(V(0, 0, -epsilon)), plan),
    ).normalize();
  }
  function triangle(a, b, c) {
    const p = V().fromArray(positions, a * 3),
      q = V().fromArray(positions, b * 3),
      r = V().fromArray(positions, c * 3);
    if (q.sub(p).cross(r.sub(p)).dot(gradient(p)) < 0) indices.push(a, c, b);
    else indices.push(a, b, c);
  }
  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        const cube = corners.map(([a, b, c]) => index(x + a, y + b, z + c));
        for (const tet of tets) {
          const inside = tet.map((i) => cube[i]).filter((i) => values[i] < 0),
            outside = tet.map((i) => cube[i]).filter((i) => values[i] >= 0);
          if (!inside.length || !outside.length) continue;
          if (inside.length === 1) triangle(...outside.map((b) => vertex(inside[0], b)));
          else if (inside.length === 3) triangle(...inside.map((a) => vertex(a, outside[0])));
          else {
            const a = vertex(inside[0], outside[0]),
              b = vertex(inside[0], outside[1]),
              c = vertex(inside[1], outside[0]),
              d = vertex(inside[1], outside[1]);
            triangle(a, b, c);
            triangle(b, d, c);
          }
        }
      }
  const field = trabecularField(plan.left ? 'left' : 'right', 3),
    colors = [],
    uv = [],
    normals = [];
  for (let i = 0; i < positions.length; i += 3) {
    const p = V().fromArray(positions, i),
      n = gradient(p),
      a = Math.atan2(p.z - plan.center.z, p.x),
      t = (p.y - plan.center.y + plan.radii.y) / (2 * plan.radii.y),
      mask = 1 - smooth(0.3, 1.1, p.y);

    let relief = plan.atrium ? 0 : field.sample(a, t) * mask;
    if (plan.atrium && p.distanceTo(plan.auricle) < 0.62)
      relief =
        0.028 *
        (0.5 + 0.5 * Math.sin(a * 18 + p.y * 9)) *
        (1 - smooth(0.4, 0.62, p.distanceTo(plan.auricle)));
    const surfaceNormal = n.clone();
    if (!plan.atrium) {
      const e = 0.004,
        da = ((field.sample(a + e, t) - field.sample(a - e, t)) / (2 * e)) * mask,
        dt =
          (((field.sample(a, t + e) - field.sample(a, t - e)) / (2 * e)) * mask) /
          (2 * plan.radii.y),
        rho = Math.max(0.3, Math.hypot(p.x, p.z - plan.center.z));
      surfaceNormal
        .addScaledVector(V(-Math.sin(a), 0, Math.cos(a)), da / rho)
        .add(V(0, dt, 0))
        .normalize();
    }
    normals.push(surfaceNormal.x, surfaceNormal.y, surfaceNormal.z);
    p.addScaledVector(n, -relief).multiplyScalar(s.radius);
    positions[i] = p.x;
    positions[i + 1] = p.y;
    positions[i + 2] = p.z;
    const shade = 0.84 + Math.min(0.16, relief * 2);
    colors.push(shade, shade, shade);
    uv.push((a / (2 * Math.PI)) * 3, t * 3);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.setAttribute('cavityNormal', new T.Float32BufferAttribute(normals, 3));
  smoothChamberNormals(g);
  g.computeBoundingSphere();
  g.userData = {
    chamber: true,
    trabeculated: !plan.atrium,
    ventricle: plan.atrium ? null : s.kind,
  };
  return g;
}
function smoothChamberNormals(g) {
  const base = g.attributes.cavityNormal;
  if (!base) {
    g.computeVertexNormals();
    return;
  }
  if (g.attributes.normal) {
    g.attributes.normal.copy(base);
    g.attributes.normal.needsUpdate = true;
  } else g.setAttribute('normal', base.clone());
}
export function deformChamberPoint(
  p,
  s,
  seconds,
  out = V(),
  cycle = cardiacCycle(seconds),
  plan = chamberPlan(s),
) {
  const c = plan.atrium ? cycle.atrialContraction : cycle.emptying,
    r = s.radius,
    x = p.x / r,
    y = p.y / r,
    z = p.z / r;
  const mask =
    (1 - smooth(0.55, 1.45, y)) *
    (1 - smooth(1.05, 1.8, Math.abs(x))) *
    (1 - smooth(1.0, 1.8, Math.abs(z - plan.center.z)));
  const strength = c * mask,
    twist = plan.left && !plan.atrium ? 0.045 * strength * (1 - clamp((y + 1.8) / 3, 0, 1)) : 0;
  const xx = x * (1 - (plan.atrium ? 0.055 : plan.left ? 0.14 : 0.18) * strength),
    zz = (z - plan.center.z) * (1 - (plan.atrium ? 0.04 : 0.1) * strength);
  out.set(
    (xx * Math.cos(twist) - zz * Math.sin(twist)) * r,
    (y + (0.85 - y) * (plan.atrium ? 0.025 : 0.075) * strength) * r,
    (plan.center.z + xx * Math.sin(twist) + zz * Math.cos(twist)) * r,
  );
  return out;
}
export function chamberAnimator(mesh, s) {
  const geometry = mesh.geometry,
    original = geometry.attributes.position.array.slice(),
    p = V(),
    out = V();
  let last = -1;
  return (time) => {
    if (time === last) return;
    last = time;
    const position = geometry.attributes.position,
      cycle = cardiacCycle(time),
      plan = chamberPlan(s);
    for (let i = 0; i < position.count; i++) {
      p.fromArray(original, i * 3);
      deformChamberPoint(p, s, time, out, cycle, plan);
      position.setXYZ(i, out.x, out.y, out.z);
    }
    position.needsUpdate = true;
    smoothChamberNormals(geometry);
  };
}
export function chamberFeatures(root, s, curves, geometry) {
  const plan = chamberPlan(s),
    group = new T.Group();
  root.add(group);
  const animations = [],
    valves = [];
  let time = 0;
  const placeValve = (definition, u, options = {}) => {
    const radius = s.radius * 0.35,
      position = curves.parent.getPointAt(u),
      rotation = new T.Quaternion().setFromUnitVectors(V(0, 0, -1), curves.parent.getTangentAt(u));
    const toLocal = (p) =>
      p
        .clone()
        .sub(position)
        .applyQuaternion(rotation.clone().invert())
        .multiplyScalar(1 / radius);
    if (options.support) {
      const mat = new T.MeshBasicMaterial({ side: T.DoubleSide }),
        surface = new T.Mesh(geometry, mat),
        ray = new T.Raycaster(),
        center = plan.center.clone().multiplyScalar(s.radius);
      surface.updateMatrixWorld(true);
      const dirs = VALVE_ANATOMY[definition.id].angles.slice(0, -1).map((a) =>
        V(Math.cos(a), Math.sin(a), 0)
          .applyQuaternion(rotation)
          .add(V(0, -0.35, 0)),
      );
      options.anchors = dirs.map((d) => {
        ray.set(center, d.normalize());
        const hit = ray.intersectObject(surface)[0];
        const base = (hit?.point || center.clone().addScaledVector(d, s.radius))
            .clone()
            .addScaledVector(d, s.radius * 0.025),
          tip = base
            .clone()
            .lerp(center, 0.28)
            .add(V(0, s.radius * 0.18, 0));
        return { base: toLocal(base), tip: toLocal(tip), size: 0.3 };
      });
      mat.dispose();
      options.transformSupport = (p) => {
        const world = p.clone().multiplyScalar(radius).applyQuaternion(rotation).add(position);
        return toLocal(deformChamberPoint(world, s, time));
      };
    }
    const valve = createValve(definition, radius, { cuff: false, ...options });
    valve.group.position.copy(position);
    valve.group.quaternion.copy(rotation);
    group.add(valve.group);
    valves.push(valve);
    return valve;
  };
  // Previously crossed AV valve remains visible at the inlet; the camera starts
  // downstream of it. Its papillary apparatus belongs to this chamber's wall.
  if (plan.inletValve) placeValve(plan.inletValve, 0.1, { support: true });
  const outlet = placeValve(plan.exitValve, s.valve ? 0.73 : 0.73, { support: false });
  if (!plan.atrium) {
    const mat = myocardiumMaterial(),
      surfaceMesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide })),
      ray = new T.Raycaster(),
      center = plan.center.clone().multiplyScalar(s.radius);
    surfaceMesh.updateMatrixWorld(true);
    const bridges = trabecularBridges(
      (a, t) => {
        const dir = V(Math.cos(a), -0.7 + t * 0.55, Math.sin(a)).normalize();
        ray.set(center, dir);
        const hit = ray.intersectObject(surfaceMesh)[0];
        return {
          point: hit?.point.clone() || center.clone().addScaledVector(dir, s.radius),
          outward: dir,
        };
      },
      plan.left ? 'left' : 'right',
      s.radius,
      mat,
    );
    group.add(bridges);
    bridges.children.forEach((m) => animations.push(chamberAnimator(m, s)));
    surfaceMesh.material.dispose();
  }
  return {
    group,
    valve: s.valve ? outlet : null,
    update(seconds, reduced) {
      time = reduced ? 0 : seconds;
      animations.forEach((fn) => fn(time));
      for (const valve of valves)
        valve.update(
          reduced ? 1 : valveOpening(valve.definition, time),
          reduced ? 0 : cardiacCycle(time).contraction,
        );
    },
  };
}
