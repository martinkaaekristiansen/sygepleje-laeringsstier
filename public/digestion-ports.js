import * as T from './three.module.min.js';

const key = (p) => [p.x, p.y, p.z].map((n) => Math.round(n * 1e5)).join(',');

// UV seams/poles may duplicate positions. Canonical positions identify the real
// surface boundary; the original indices keep UVs and smooth normals intact.
export function surfacePorts(geometry) {
  const positions = geometry.attributes.position,
    canonical = [],
    unique = new Map(),
    representatives = [];
  for (let i = 0; i < positions.count; i++) {
    const p = new T.Vector3().fromBufferAttribute(positions, i),
      k = key(p);
    if (!unique.has(k)) {
      unique.set(k, representatives.length);
      representatives.push(i);
    }
    canonical[i] = unique.get(k);
  }
  const edges = new Map();
  for (let i = 0; i < geometry.index.count; i += 3) {
    const ids = [0, 1, 2].map((j) => canonical[geometry.index.array[i + j]]);
    if (new Set(ids).size !== 3) continue;
    for (let j = 0; j < 3; j++) {
      const a = ids[j],
        b = ids[(j + 1) % 3],
        k = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!edges.has(k)) edges.set(k, { a, b, count: 0 });
      edges.get(k).count++;
    }
  }
  const next = new Map();
  for (const edge of edges.values()) {
    if (edge.count > 2) throw Error('Anatomical wall has a non-manifold edge');
    if (edge.count !== 1) continue;
    if (next.has(edge.a)) throw Error('Anatomical boundary branches or has inconsistent winding');
    next.set(edge.a, edge.b);
  }
  const visited = new Set(),
    ports = [];
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    const indices = [];
    let current = start;
    do {
      if (visited.has(current) || !next.has(current))
        throw Error('Anatomical boundary is not a closed loop');
      visited.add(current);
      indices.push(representatives[current]);
      current = next.get(current);
    } while (current !== start);
    const points = indices.map((i) => new T.Vector3().fromBufferAttribute(positions, i));
    const center = points.reduce((p, q) => p.add(q), new T.Vector3()).divideScalar(points.length);
    ports.push({
      indices,
      points,
      center,
      radius: Math.max(...points.map((p) => p.distanceTo(center))),
    });
  }
  return ports;
}

export function transformPort(port, matrix, outward) {
  return {
    ...port,
    points: port.points.map((p) => p.clone().applyMatrix4(matrix)),
    center: port.center.clone().applyMatrix4(matrix),
    outward: outward.clone().transformDirection(matrix),
  };
}

function sampleLoop(points, count) {
  const length = [0];
  for (let i = 0; i < points.length; i++)
    length.push(length.at(-1) + points[i].distanceTo(points[(i + 1) % points.length]));
  return Array.from({ length: count }, (_, i) => {
    const distance = (i / count) * length.at(-1);
    let j = 0;
    while (j + 1 < length.length && length[j + 1] < distance) j++;
    return points[j]
      .clone()
      .lerp(points[(j + 1) % points.length], (distance - length[j]) / (length[j + 1] - length[j]));
  });
}

// The end rings use the ACTUAL wall vertices, not idealized circles. Unequal
// ring counts are joined by a zipper; all boundary edges are used exactly once.
export function bridgePorts(
  a,
  b,
  {
    name = 'mucosal-junction',
    rows = 24,
    around = 64,
    colors = [0xb96f72, 0xb96f72],
    fold = null,
  } = {},
) {
  const distance = a.center.distanceTo(b.center);
  const candidate = (ha, hb) =>
    new T.CubicBezierCurve3(
      a.center.clone(),
      a.center.clone().addScaledVector(a.outward, ha),
      b.center.clone().addScaledVector(b.outward, hb),
      b.center.clone(),
    );
  let path = null,
    bestLength = Infinity,
    bestClearance = 0;
  for (const fa of [0.35, 0.5, 0.75, 1, 1.5, 2, 3])
    for (const fb of [0.35, 0.5, 0.75, 1, 1.5, 2, 3]) {
      const trial = candidate(distance * fa, distance * fb),
        length = trial.getLength();
      let clearance = Infinity;
      for (let j = 1; j < 64; j++) {
        const u = j / 64,
          d = 0.001,
          curvature =
            trial
              .getTangentAt(u + d)
              .sub(trial.getTangentAt(u - d))
              .length() /
            (2 * d * length);
        const radius =
          a.radius * (1 - T.MathUtils.smoothstep(u, 0, 1)) +
          b.radius * T.MathUtils.smoothstep(u, 0, 1);
        clearance = Math.min(clearance, 1 / Math.max(1e-8, curvature) / radius);
      }
      if (clearance >= 1.2 && length < bestLength) {
        path = trial;
        bestLength = length;
      }
      if (!Number.isFinite(bestLength) && clearance > bestClearance) {
        path = trial;
        bestClearance = clearance;
      }
    }
  if (!Number.isFinite(bestLength))
    throw Error(`${name}: insufficient curvature clearance (${bestClearance.toFixed(2)})`);
  const frames = path.computeFrenetFrames(rows, false);
  const start = [...a.points].reverse(),
    end = [...b.points];
  const sa = sampleLoop(start, around),
    sb = sampleLoop(end, around);
  const qa = new T.Quaternion().setFromUnitVectors(path.getTangentAt(0), path.getTangentAt(1));
  let shift = 0,
    best = Infinity;
  for (let k = 0; k < around; k++) {
    let error = 0;
    for (let i = 0; i < around; i++)
      error += sa[i]
        .clone()
        .sub(a.center)
        .applyQuaternion(qa)
        .distanceToSquared(sb[(i + k) % around].clone().sub(b.center));
    if (error < best) {
      best = error;
      shift = k;
    }
  }
  const endShift = Math.round((shift / around) * end.length) % end.length;
  const eb = end.slice(endShift).concat(end.slice(0, endShift));
  const resampledEnd = sampleLoop(eb, around);
  const positions = [],
    uvs = [],
    vertexColors = [],
    indices = [],
    rings = [],
    surfaceRings = [];
  const ca = new T.Color(colors[0]),
    cb = new T.Color(colors[1]);
  const makeRing = (points, u) => {
    const ring = [],
      color = ca.clone().lerp(cb, T.MathUtils.smoothstep(u, 0, 1));
    points.forEach((p, i) => {
      ring.push(positions.length / 3);
      positions.push(...p.toArray());
      uvs.push(i / points.length, u);
      vertexColors.push(color.r, color.g, color.b);
    });
    rings.push(ring);
    surfaceRings.push(points.map((p) => p.clone()));
  };
  makeRing(start, 0);
  const q0 = new T.Quaternion().setFromRotationMatrix(
    new T.Matrix4().makeBasis(frames.normals[0], frames.binormals[0], frames.tangents[0]),
  );
  const q1 = new T.Quaternion().setFromRotationMatrix(
    new T.Matrix4().makeBasis(frames.normals[rows], frames.binormals[rows], frames.tangents[rows]),
  );
  const oa = sa.map((p) => p.clone().sub(a.center).applyQuaternion(q0.clone().invert()));
  const ob = resampledEnd.map((p) => p.clone().sub(b.center).applyQuaternion(q1.clone().invert()));
  for (let j = 1; j < rows; j++) {
    const u = j / rows,
      blend = T.MathUtils.smoothstep(u, 0, 1),
      c = path.getPointAt(u);
    const q = new T.Quaternion().setFromRotationMatrix(
      new T.Matrix4().makeBasis(frames.normals[j], frames.binormals[j], frames.tangents[j]),
    );
    makeRing(
      oa.map((p, i) =>
        p
          .clone()
          .lerp(ob[i], blend)
          .multiplyScalar(fold ? fold(u, (i / around) * Math.PI * 2) : 1)
          .applyQuaternion(q)
          .add(c),
      ),
      u,
    );
  }
  makeRing(eb, 1);
  for (let j = 0; j < rings.length - 1; j++) {
    const x = rings[j],
      y = rings[j + 1];
    let i = 0,
      k = 0;
    while (i < x.length || k < y.length) {
      const ni = (i + 1) / x.length,
        nk = (k + 1) / y.length;
      if (ni <= nk && i < x.length) {
        indices.push(x[i % x.length], x[(i + 1) % x.length], y[k % y.length]);
        i++;
      } else {
        indices.push(x[i % x.length], y[(k + 1) % y.length], y[k % y.length]);
        k++;
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new T.Float32BufferAttribute(vertexColors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData = {
    kind: 'welded-mucosal-junction',
    name,
    startCount: start.length,
    endCount: eb.length,
  };
  function surfacePoint(u, a) {
    const j = Math.min(rows - 1, Math.floor(u * rows)),
      v = u * rows - j;
    const sample = (ring) => {
      const x = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * ring.length,
        k = Math.floor(x);
      return ring[k].clone().lerp(ring[(k + 1) % ring.length], x - k);
    };
    const first = surfaceRings[j],
      second = surfaceRings[j + 1];
    if (first.length === second.length) {
      const x = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * first.length,
        k = Math.floor(x),
        w = x - k,
        n = (k + 1) % first.length;
      return v + w <= 1
        ? first[k]
            .clone()
            .multiplyScalar(1 - v - w)
            .addScaledVector(first[n], w)
            .addScaledVector(second[k], v)
        : second[n]
            .clone()
            .multiplyScalar(v + w - 1)
            .addScaledVector(first[n], 1 - v)
            .addScaledVector(second[k], 1 - w);
    }
    return sample(first).lerp(sample(second), v);
  }
  function surfaceFrame(u, a) {
    const d = 0.0001,
      point = surfacePoint(u, a),
      along = surfacePoint(Math.min(1, u + d), a).sub(surfacePoint(Math.max(0, u - d), a)),
      around = surfacePoint(u, a + d).sub(surfacePoint(u, a - d));
    const inward = along.cross(around).normalize();
    if (inward.dot(point.clone().sub(path.getPointAt(u))) > 0) inward.negate();
    return { point, inward };
  }
  return {
    geometry,
    path,
    start,
    end: eb,
    surfaceFrame,
    sectionPorts: Array.from({ length: 9 }, (_, i) => ({
      points: surfaceRings[Math.round((i / 8) * rows)],
      center: path.getPointAt(i / 8),
    })),
  };
}

export function invertSurface(geometry) {
  const indices = geometry.index.array;
  for (let i = 0; i < indices.length; i += 3)
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  geometry.computeVertexNormals();
  return geometry;
}

// Correct authoring orientation at branch seams before using one-sided surfaces.
// Position aliases (including UV seams) participate in the same adjacency graph.
export function orientSurface(geometry) {
  const p = geometry.attributes.position,
    ids = [],
    unique = new Map(),
    edges = new Map(),
    adjacency = [];
  for (let i = 0; i < p.count; i++) {
    const k = key(new T.Vector3().fromBufferAttribute(p, i));
    if (!unique.has(k)) unique.set(k, unique.size);
    ids.push(unique.get(k));
  }
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const t = i / 3,
      v = [ids[index[i]], ids[index[i + 1]], ids[index[i + 2]]];
    adjacency[t] = [];
    if (new Set(v).size < 3) continue;
    for (let j = 0; j < 3; j++) {
      const a = v[j],
        b = v[(j + 1) % 3],
        k = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!edges.has(k)) edges.set(k, []);
      edges.get(k).push({ t, sign: a < b ? 1 : -1 });
    }
  }
  for (const list of edges.values()) {
    if (list.length > 2) throw Error('Non-manifold anatomy');
    if (list.length === 2) {
      const [a, b] = list;
      adjacency[a.t].push([b.t, a.sign === b.sign]);
      adjacency[b.t].push([a.t, a.sign === b.sign]);
    }
  }
  const flipped = new Map();
  for (let start = 0; start < adjacency.length; start++) {
    if (flipped.has(start)) continue;
    const queue = [start];
    flipped.set(start, false);
    for (let k = 0; k < queue.length; k++) {
      const t = queue[k];
      for (const [next, same] of adjacency[t]) {
        const flip = flipped.get(t) !== same;
        if (flipped.has(next)) {
          if (flipped.get(next) !== flip) throw Error('Non-orientable anatomy');
        } else {
          flipped.set(next, flip);
          queue.push(next);
        }
      }
    }
  }
  for (const [t, flip] of flipped)
    if (flip) [index[t * 3 + 1], index[t * 3 + 2]] = [index[t * 3 + 2], index[t * 3 + 1]];
  geometry.computeVertexNormals();
  return geometry;
}

// Smooth shading across UV aliases and across separately rendered port rings.
// Geometry/UVs remain separate so regional material maps keep their coordinates.
export function smoothTractNormals(segments, connections) {
  const entries = new Map(),
    normalMatrix = new T.Matrix3(),
    inverseNormal = new T.Matrix3();
  const add = (geometry, matrix) => {
    normalMatrix.getNormalMatrix(matrix);
    const inverse = normalMatrix.clone().invert();
    const p = geometry.attributes.position,
      n = geometry.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const position = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix),
        k = key(position);
      if (!entries.has(k)) entries.set(k, []);
      entries.get(k).push({
        geometry,
        i,
        normal: new T.Vector3().fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(),
        inverse,
      });
    }
  };
  for (const s of segments) add(s.built.geometry, s.matrix);
  for (const c of connections) add(c.geometry, new T.Matrix4());
  for (const list of entries.values()) {
    if (list.length < 2) continue;
    const average = list.reduce((v, e) => v.add(e.normal), new T.Vector3()).normalize();
    if (!average.lengthSq()) continue;
    for (const e of list) {
      const n = average.clone().applyMatrix3(e.inverse).normalize();
      e.geometry.attributes.normal.setXYZ(e.i, n.x, n.y, n.z);
    }
  }
}
