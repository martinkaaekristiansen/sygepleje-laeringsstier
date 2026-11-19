import * as T from './three.module.min.js';
// A single indexed surface: blind caecal floor, ascending continuation and two
// welded side branches. There are no overlaid tubes hiding an uncut wall.
export const CAECUM_LANDMARKS = {
  floor: [0, -4, -6],
  ileum: [3.15, 0.65, -6],
  appendix: [1.95, -1.9, -7.95],
  ascending: [0.3, 3, -6],
};
export function caecumSurfacePoint(y, a) {
  const lower = y <= 0 ? Math.sqrt(Math.max(0, 1 - (y / 4) ** 2)) : 1;
  const r =
    (y <= 0 ? 3.2 * lower : 3.2 - 0.45 * Math.min(1, y / 4)) +
    (0.13 * Math.cos(a * 3) +
      0.13 * Math.sin(y * 2.3 + 0.3 * Math.cos(a * 3)) * (0.55 + 0.45 * Math.cos(a * 3))) *
      lower;
  return new T.Vector3(
    0.23 * Math.sin(((y + 4) / 12) * Math.PI) + r * Math.cos(a),
    y,
    -6 + r * Math.sin(a) * 0.94,
  );
}
export function buildCaecumGeometry() {
  const around = 96,
    rows = 80,
    step = 0.15,
    positions = [],
    indices = [],
    ids = [];
  const holes = [
    { name: 'ileum', j0: 28, j1: 34, i0: 44, i1: 52, radius: 0.66, length: 4.6 },
    { name: 'appendix', j0: 12, j1: 16, i0: 34, i1: 38, radius: 0.23, length: 2.2 },
  ];
  const vertex = (p) => {
    const i = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    return i;
  };
  const floor = vertex(new T.Vector3(0, -4, -6));
  for (let j = 0; j <= rows; j++) {
    const ring = [];
    for (let i = 0; i < around; i++) {
      let yi = j,
        ai = i;
      for (const h of holes)
        if (j >= h.j0 && j <= h.j1 && i >= h.i0 && i <= h.i1) {
          const u = (i - (h.i0 + h.i1) / 2) / ((h.i1 - h.i0) / 2),
            v = (j - (h.j0 + h.j1) / 2) / ((h.j1 - h.j0) / 2);
          ai = (h.i0 + h.i1) / 2 + (u * Math.sqrt(1 - (v * v) / 2) * (h.i1 - h.i0)) / 2;
          yi = (h.j0 + h.j1) / 2 + (v * Math.sqrt(1 - (u * u) / 2) * (h.j1 - h.j0)) / 2;
        }
      ring.push(
        j === 0
          ? floor
          : vertex(caecumSurfacePoint(-4 + yi * step, -Math.PI + (ai / around) * Math.PI * 2)),
      );
    }
    ring.push(ring[0]);
    ids.push(ring);
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < around; i++) {
      if (holes.some((h) => j >= h.j0 && j < h.j1 && i >= h.i0 && i < h.i1)) continue;
      const a = ids[j][i],
        b = ids[j][i + 1],
        c = ids[j + 1][i],
        d = ids[j + 1][i + 1];
      if (a !== b) indices.push(a, c, b);
      indices.push(b, c, d);
    }
  const branches = {};
  for (const h of holes) {
    const boundary = [];
    for (let i = h.i0; i <= h.i1; i++) boundary.push(ids[h.j0][i]);
    for (let j = h.j0 + 1; j <= h.j1; j++) boundary.push(ids[j][h.i1]);
    for (let i = h.i1 - 1; i >= h.i0; i--) boundary.push(ids[h.j1][i]);
    for (let j = h.j1 - 1; j > h.j0; j--) boundary.push(ids[j][h.i0]);
    const points = boundary.map((i) => new T.Vector3().fromArray(positions, i * 3));
    const center = points
      .reduce((a, p) => a.add(p), new T.Vector3())
      .multiplyScalar(1 / points.length);
    const a = -Math.PI + ((h.i0 + h.i1) / 2 / around) * Math.PI * 2;
    const outward = new T.Vector3(Math.cos(a), 0, Math.sin(a));
    const controls =
      h.name === 'ileum'
        ? [
            center,
            center.clone().addScaledVector(outward, 0.7),
            center
              .clone()
              .addScaledVector(outward, 2.5)
              .add(new T.Vector3(0, 0.4, 0.2)),
            center
              .clone()
              .addScaledVector(outward, h.length)
              .add(new T.Vector3(0, 0.7, 0.45)),
          ]
        : [
            center,
            center.clone().addScaledVector(outward, 0.45),
            center
              .clone()
              .addScaledVector(outward, 1.5)
              .add(new T.Vector3(0, -1.8, 0)),
            center
              .clone()
              .addScaledVector(outward, 0.9)
              .add(new T.Vector3(-0.7, -4, -0.3)),
          ];
    const path = new T.CatmullRomCurve3(controls),
      frames = path.computeFrenetFrames(32, false);
    const offsets = points.map((p) => p.clone().sub(center));
    const angles = offsets.map((p) =>
      Math.atan2(
        p.y / (((h.j1 - h.j0) * step) / 2),
        p.dot(new T.Vector3(-Math.sin(a), 0, Math.cos(a))) /
          (((0.5 * (h.i1 - h.i0)) / around) * Math.PI * 2 * 3),
      ),
    );
    const initialTangent = path.getTangentAt(0);
    const initialVertical = new T.Vector3(0, 1, 0)
      .addScaledVector(initialTangent, -initialTangent.y)
      .normalize();
    const align = Math.atan2(
      initialVertical.dot(frames.binormals[0]),
      initialVertical.dot(frames.normals[0]),
    );
    let previous = boundary;
    for (let j = 1; j <= 32; j++) {
      const t = j / 32,
        c = path.getPointAt(t),
        ring = [];
      const tangent = path.getTangentAt(t),
        vertical = frames.normals[j]
          .clone()
          .multiplyScalar(Math.cos(align))
          .addScaledVector(frames.binormals[j], Math.sin(align));
      const horizontal = tangent.clone().cross(vertical).normalize();
      const blend = T.MathUtils.smoothstep(t, 0, 0.25);
      const taper =
        h.name === 'appendix' && t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1;
      for (let i = 0; i < points.length; i++) {
        const round = horizontal
          .clone()
          .multiplyScalar(Math.cos(angles[i]) * h.radius * taper)
          .addScaledVector(vertical, Math.sin(angles[i]) * h.radius * taper);
        const p = c.clone().add(offsets[i].clone().lerp(round, blend));
        ring.push(vertex(p));
      }
      for (let i = 0; i < ring.length; i++) {
        const k = (i + 1) % ring.length;
        indices.push(previous[i], previous[k], ring[i], previous[k], ring[k], ring[i]);
      }
      previous = ring;
    }
    if (h.name === 'appendix') {
      const cap = vertex(path.getPointAt(1));
      for (let i = 0; i < previous.length; i++)
        indices.push(previous[i], previous[(i + 1) % previous.length], cap);
    }
    branches[h.name] = {
      center: center.toArray(),
      end: path.getPointAt(1).toArray(),
      radius: h.radius,
      length: path.getLength(),
      boundary,
      path: Array.from({ length: 33 }, (_, i) => path.getPointAt(i / 32).toArray()),
    };
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const uvs = [];
  for (let i = 0; i < positions.length; i += 3)
    uvs.push(
      Math.atan2(positions[i + 2] + 6, positions[i]) / (Math.PI * 2) + 0.5,
      (positions[i + 1] + 4) / 12,
    );
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.userData = {
    kind: 'blind-caecal-sac',
    branches,
    floor: [0, -4, -6],
    ascendingRadius: 2.75,
    connectedBranches: true,
  };
  return geometry;
}
export function buildIleocaecalLips() {
  const group = new T.Group();
  group.name = 'ileocaecal-mucosal-lips';
  for (const side of [-1, 1]) {
    const lip = new T.Mesh(
      new T.CapsuleGeometry(0.11, 0.85, 5, 16),
      new T.MeshStandardMaterial({ color: 0xe9a298, roughness: 0.45 }),
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.set(3.06, 0.65 + side * 0.27, -6);
    group.add(lip);
  }
  return group;
}

// The lips retract for a passing bolus; the fixed camera route must never cut
// through a closed mucosal fold. Between passages the original slow pulse stays.
export function ileocaecalGap(phase, distance = Infinity, moving = true) {
  const pulse = phase < 0.14 ? Math.sin((phase / 0.14) * Math.PI) : 0;
  const passage = 1 - T.MathUtils.smoothstep(Math.abs(distance), 0.5, 2);
  return Math.max(moving ? 0.1 + pulse * 0.17 : 0.27, 0.38 * passage);
}
