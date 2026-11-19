import * as T from './three.module.min.js';
import { stomachPoint } from './digestion-anatomy.js';

// Smooth anatomical axis: fundus/corpus bend towards antrum and pylorus.
// Projection ignores depth, so anterior/posterior walls share the same wave.
const axis = new T.CubicBezierCurve3(
  new T.Vector3(-2.2, 2.1, -6.8),
  new T.Vector3(-3.2, -3.6, -6.8),
  new T.Vector3(1.8, -2.8, -6.8),
  new T.Vector3(4.7, -2, -6.8),
);
const samples = Array.from({ length: 33 }, (_, i) => ({ u: i / 32, p: axis.getPoint(i / 32) }));
function coordinate(p) {
  let sum = 0,
    weighted = 0;
  for (const s of samples) {
    const distance = (p.x - s.p.x) ** 2 + (p.y - s.p.y) ** 2;
    const weight = 1 / (0.7 + distance) ** 3;
    sum += weight;
    weighted += weight * s.u;
  }
  return weighted / sum;
}
export function gastricFrame(p, derivatives = false) {
  const u = coordinate(p),
    center = axis.getPoint(u);
  if (!derivatives) return { u, axis: center };
  const d = 0.001;
  const gradient = new T.Vector3(
    (coordinate(new T.Vector3(p.x + d, p.y, p.z)) - coordinate(new T.Vector3(p.x - d, p.y, p.z))) /
      (2 * d),
    (coordinate(new T.Vector3(p.x, p.y + d, p.z)) - coordinate(new T.Vector3(p.x, p.y - d, p.z))) /
      (2 * d),
    0,
  );
  const derivative = axis
    .getPoint(Math.min(1, u + d))
    .sub(axis.getPoint(Math.max(0, u - d)))
    .divideScalar(2 * d);
  return { u, axis: center, gradient, derivative };
}

// Same sixteen rounded rugae, combined into one draw call. Both folds and wall
// use exactly the same spatial deformation field; inset follows the radial direction; the .075-radius ridge overlaps the wall.
export function buildGastricFolds({ ports = [] } = {}) {
  const positions = [],
    normals = [],
    uvs = [],
    indices = [];
  let offset = 0;
  for (let i = 0; i < 16; i++) {
    const points = Array.from({ length: 24 }, (_, j) => {
      const p = stomachPoint(0.14 + (j / 24) * 0.73, i / 16),
        a = gastricFrame(p).axis;
      return p.addScaledVector(p.clone().sub(a).normalize(), -0.05);
    });
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(points), 40, 0.075, 6, false);
    positions.push(...g.attributes.position.array);
    normals.push(...g.attributes.normal.array);
    uvs.push(...g.attributes.uv.array);
    for (let j = 0; j < g.index.count; j += 3) {
      const triangle = Array.from(g.index.array.slice(j, j + 3));
      if (
        !triangle.some((k) =>
          ports.some(
            (port) =>
              new T.Vector3()
                .fromBufferAttribute(g.attributes.position, k)
                .distanceTo(port.center) <
              port.radius + 0.22,
          ),
        )
      )
        indices.push(...triangle.map((k) => k + offset));
    }
    offset += g.attributes.position.count;
    g.dispose();
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.userData.rugae = 16;
  return g;
}

// A tracer approaches the pylorus, then returns towards the corpus when the
// outlet resists flow. These are teaching tracers, not a fluid simulation.
export function gastricFlowPose(seconds, index) {
  const cycle = (((seconds / 20 + index / 26) % 1) + 1) % 1;
  const retrograde = cycle > 0.72;
  const u = retrograde ? 0.92 - ((cycle - 0.72) / 0.28) * 0.76 : 0.16 + (cycle / 0.72) * 0.76;
  const point = axis.getPoint(u);
  point.y += Math.sin(index * 2.4) * 0.55;
  point.z += Math.cos(index * 2.4) * 1.0;
  const phase = (((seconds / 20) % 1) + 1) % 1;
  const outflow = index % 5 === 0 && cycle > 0.88 && phase > 0.88;
  if (outflow) point.set(4.3 + ((cycle - 0.88) / 0.12) * 1.1, -2, -6.8);
  return { point, u, retrograde, outflow };
}
