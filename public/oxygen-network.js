import * as T from './three.module.min.js';
import { bloodStructure, oxygenRoute } from './oxygen-data.js';
import { visualAnatomy, anatomyCurves } from './journey-3d-anatomy.js';
import { chamberPlan } from './journey-chambers.js';
import { anatomicalCameraFrames } from './digestion-camera-frames.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  curve = (points) => new T.CatmullRomCurve3(points.map((p) => p.clone?.() || V(...p))),
  clamp = T.MathUtils.clamp;
export const HEAD_ORIGIN = V(0, 90, 0),
  ORAL_ORIGIN = V(0, 92.1, 0);
export const VALVE_IDS = ['mitral', 'aorticValve', 'tricuspid', 'pulmonaryValve'];
export const ALVEOLAR_RADIUS = 2.6;
export function sideSign(side) {
  return side === 'left' ? 1 : -1;
}
export function alveolarLandmarks(side) {
  const s = sideSign(side);
  return {
    center: V(s * 31.5, 42, 4.5),
    epithelium: V(s * 34, 42, 4.5),
    basal: V(s * 34.04, 42, 4.5),
    endothelium: V(s * 34.08, 42, 4.5),
    cell: V(s * 34.6, 42, 4.5),
    observer: V(s * 34.35, 42.16, 4.88),
    outward: V(s, 0, 0),
  };
}
function transformedCurve(source, matrix) {
  return curve(source.getSpacedPoints(100).map((p) => p.applyMatrix4(matrix)));
}
function heartPair(left) {
  const atrial = visualAnatomy(bloodStructure(left ? 'la' : 'ra')),
    ventricular = visualAnatomy(bloodStructure(left ? 'lv' : 'rv'));
  const a = anatomyCurves(atrial).parent,
    v = anatomyCurves(ventricular).parent,
    scale = 0.65;
  const direction = V(left ? 0.12 : -0.12, -1, 0.22).normalize(),
    qa = new T.Quaternion().setFromUnitVectors(a.getTangentAt(1), direction),
    qv = new T.Quaternion().setFromUnitVectors(v.getTangentAt(0), direction);
  const center = V(left ? 6 : -6, 35, left ? -4 : 2),
    offset = chamberPlan(atrial)
      .center.clone()
      .multiplyScalar(atrial.radius * scale)
      .applyQuaternion(qa),
    ma = new T.Matrix4().compose(center.clone().sub(offset), qa, V(scale, scale, scale));
  const outlet = a.getPointAt(1).applyMatrix4(ma),
    mv = new T.Matrix4().compose(
      outlet.clone().sub(v.getPointAt(0).multiplyScalar(scale).applyQuaternion(qv)),
      qv,
      V(scale, scale, scale),
    );
  return {
    [atrial.id]: { stage: atrial, matrix: ma, path: transformedCurve(a, ma), native: a, scale },
    [ventricular.id]: {
      stage: ventricular,
      matrix: mv,
      path: transformedCurve(v, mv),
      native: v,
      scale,
    },
  };
}
export function createOxygenNetwork() {
  const hearts = { ...heartPair(true), ...heartPair(false) },
    parts = new Map(),
    air = new Map(),
    paths = new Map();
  function add(id, points, radius, kind = 'airway', extra = {}) {
    const p = { id, path: curve(points), radius, kind, ...extra };
    parts.set(id, p);
    return p;
  }
  const pharynx = V(0, 92.25, -3.15);
  add('mouth', [[0, 92.1, 4.0], [0, 92.1, 1.5], [0, 92.1, -1.3], pharynx], 1.8, 'mouth');
  add(
    'nose',
    [[0.45, 95.45, 4.7], [0.45, 95.45, 1.6], [0.45, 95.8, -1.2], [0.4, 94, -3.6], pharynx],
    0.75,
    'nose',
    { ciliated: true, ciliaRange: [0.2, 0.65], startRadius: 0.0675, endRadius: 1.2 },
  );
  add(
    'pharynx',
    [pharynx, [0.9, 91.95, -3.35], [1, 91.35, -4.2], [0.85, 90.9, -4.6], [0.8, 90.43, -4.85]],
    1.2,
    'pharynx',
  );
  add(
    'larynx',
    [
      [0.8, 90.43, -4.85],
      [0.22, 90.25, -4.75],
      [0, 89.73, -4.7],
      [0, 88.4, -4.7],
      [0, 85, -4.7],
    ],
    0.57,
    'larynx',
  );
  add(
    'trachea',
    [
      [0, 85, -4.7],
      [0.06, 80, -4.8],
      [-0.03, 73, -4.7],
      [0, 67, -4.7],
    ],
    0.57,
    'trachea',
    { ciliated: true },
  );
  const junctionParent = curve([
      [0, 67, -4.7],
      [0, 65.6, -4.7],
      [0, 64.3, -4.7],
    ]),
    junctionBranches = [];
  for (const side of ['right', 'left']) {
    const s = sideSign(side),
      P = (x, y, z) => [s * x, y, z],
      a = alveolarLandmarks(side);
    const branch = curve([
      [0, 64.3, -4.7],
      P(1, side === 'right' ? 62.8 : 63.5, -4.7),
      P(side === 'right' ? 2.5 : 3.4, 61.8, -4.6),
    ]);
    junctionBranches.push(branch);
    const defs = [
      ['mainbronchus', branch, 0.5, 'bronchus'],
      ['bronchus', curve([branch.getPointAt(1), P(10, 56, -3.8), P(17, 51, -2)]), 0.4, 'bronchus'],
      ['bronchiole', curve([P(17, 51, -2), P(21, 48, 0), P(24, 46, 2)]), 0.29, 'bronchiole'],
      ['terminal', curve([P(24, 46, 2), P(25, 45.5, 2.5), P(26, 44.8, 3)]), 0.27, 'terminal'],
      [
        'respiratory',
        curve([P(26, 44.8, 3), P(27, 44.1, 3.6), P(28, 43.4, 4)]),
        0.4,
        'respiratory',
      ],
      ['duct', curve([P(28, 43.4, 4), P(28.4, 42.8, 4.3), P(28.8, 42.4, 4.5)]), 0.62, 'duct'],
      ['sac', curve([P(28.8, 42.4, 4.5), P(29.1, 42.1, 4.5), P(29.3, 42, 4.5)]), 0.8, 'sac'],
      ['alveolus', curve([P(29.3, 42, 4.5), a.center]), 2.6, 'alveolus'],
    ];
    const calibre = {
      mainbronchus: [0.5, 0.342],
      bronchus: [0.342, 0.29],
      bronchiole: [0.29, 0.27],
      terminal: [0.27, 0.25],
      respiratory: [0.25, 0.4],
      duct: [0.4, 0.62],
      sac: [0.62, 0.8],
      alveolus: [0.8, 2.6],
    };
    for (const [id, path, radius, kind] of defs) {
      const p = {
        id: side + ':' + id,
        path,
        radius,
        kind,
        side,
        startRadius: calibre[id][0],
        endRadius: calibre[id][1],
        ciliated: ['bronchus', 'bronchiole', 'terminal'].includes(kind),
        cartilage: kind === 'bronchus',
      };
      parts.set(p.id, p);
      air.set(side + ':' + id, p);
    }
    const cap = add(
      side + ':pulmonary-capillary',
      [P(34.6, 42, 2.2), a.cell, P(34.6, 42, 7.5)],
      0.52,
      'capillary',
      { side },
    );
    add(side + ':pvenules', [cap.path.getPointAt(1), P(29, 41, 9), P(20, 39, 7)], 0.85, 'vein', {
      blood: 'pvenules',
    });
    add(side + ':pv', [P(20, 39, 7), P(13, 40, 8), hearts.la.path.getPointAt(0)], 1.25, 'vein', {
      blood: 'pv',
    });
    add(side + ':pa', [[-2, 43, 4], P(12, 45, 2), P(26, 44, 1)], 1.25, 'artery', { blood: 'pa' });
    add(
      side + ':parterioles',
      [P(26, 44, 1), P(33, 43, 1.2), cap.path.getPointAt(0)],
      0.7,
      'arteriole',
      { blood: 'parterioles' },
    );
  }
  const out = hearts.lv.path.getPointAt(1),
    rightOut = hearts.rv.path.getPointAt(1);
  add('aorta', [out, [8, 45, -1], [4, 49, -4], [-8, 47, -3]], 2.1, 'artery', { blood: 'aorta' });
  add(
    'arteries',
    [
      [-8, 47, -3],
      [-20, 43, 2],
      [-25, 32, 6],
    ],
    1.5,
    'artery',
    { blood: 'arteries' },
  );
  add(
    'arterioles',
    [
      [-25, 32, 6],
      [-29, 25, 7],
      [-34, 19, 7],
    ],
    0.8,
    'arteriole',
    { blood: 'arterioles' },
  );
  add(
    'systemic-capillary',
    [
      [-34, 19, 7],
      [-34.1, 16, 7.1],
      [-34, 13, 7],
    ],
    0.52,
    'capillary',
    { blood: 'capillaries' },
  );
  add(
    'venules',
    [
      [-34, 13, 7],
      [-33, 12, 8],
      [-31, 12, 9],
    ],
    0.8,
    'vein',
    { blood: 'venules' },
  );
  add(
    'veins',
    [
      [-31, 12, 9],
      [-28, 26, 10],
      [-20, 39, 9],
      [-12, 42, 8],
    ],
    1.25,
    'vein',
    { blood: 'veins' },
  );
  add('svc', [[-12, 42, 8], [-6, 44, 7], hearts.ra.path.getPointAt(0)], 1.7, 'vein', {
    blood: 'svc',
  });
  add('trunk', [rightOut, [-3, 40, 4], [-2, 43, 4]], 1.7, 'artery', { blood: 'trunk' });
  const tissue = {
    capillary: parts.get('systemic-capillary').path.getPointAt(0.52),
    cell: V(-35.65, 16, 7.1),
    mitochondrion: V(-36.3, 16, 7.2),
    observer: V(-34.65, 16.45, 8.6),
  };
  function routeFor(run) {
    const key = [run.entry, run.side, run.exit || run.entry].join(':');
    if (paths.has(key)) return paths.get(key);
    const steps = oxygenRoute(run),
      segments = [],
      stations = {},
      s = sideSign(run.side),
      a = alveolarLandmarks(run.side);
    let length = 0,
      last = V(0, 95, 24);
    const append = (p, u0 = 0, u1 = 1) => {
      const path = curve(
        Array.from({ length: Math.max(4, Math.ceil(Math.abs(u1 - u0) * 80)) }, (_, i) =>
          p.path.getPointAt(
            T.MathUtils.lerp(u0, u1, i / (Math.max(4, Math.ceil(Math.abs(u1 - u0) * 80)) - 1)),
          ),
        ),
      );
      if (last.distanceTo(path.getPointAt(0)) > 0.025) {
        const bridge = curve([last, path.getPointAt(0)]);
        const L = bridge.getLength();
        segments.push({ path: bridge, start: length, end: length + L, id: 'join' });
        length += L;
      }
      const L = path.getLength();
      if (L > 0.00001) {
        segments.push({ path, start: length, end: length + L, id: p.id });
        length += L;
      }
      last = path.getPointAt(1);
    };
    const pointTo = (point, id = 'view') => {
      if (last.distanceTo(point) > 0.00001) append({ id, path: curve([last, point]) });
    };
    const A = (id) => air.get(run.side + ':' + id),
      B = (id) => parts.get(run.side + ':' + id),
      H = (id) => ({ id, path: hearts[id].path });
    for (const stage of steps) {
      let start = length,
        critical = null;
      switch (stage.id) {
        case 'outside':
          break;
        case 'mouth':
        case 'nose':
          append(parts.get(run.entry), 0, 0.43);
          break;
        case 'pharynx':
          append(parts.get(run.entry), 0.43, 1);
          break;
        case 'larynx':
          append(parts.get('pharynx'));
          append(parts.get('larynx'), 0, 0.13);
          break;
        case 'trachea':
          append(parts.get('larynx'), 0.13, 1);
          append(parts.get('trachea'), 0, 0.12);
          start = length;
          append(parts.get('trachea'), 0.12, 0.82);
          stations[stage.id] = { start, end: length };
          continue;
        case 'mucus':
          append(parts.get('trachea'), 0.82, 0.91);
          break;
        case 'mainbronchus':
          append(parts.get('trachea'), 0.91, 1);
          append({ id: 'carina', path: junctionParent }, 0, 0.84);
          break;
        case 'bronchus':
          append({ id: 'carina', path: junctionParent }, 0.84, 1);
          append(A('mainbronchus'));
          append(A('bronchus'), 0, 0.58);
          break;
        case 'bronchiole':
          append(A('bronchus'), 0.58, 1);
          append(A('bronchiole'), 0, 0.6);
          break;
        case 'terminal':
          append(A('bronchiole'), 0.6, 1);
          append(A('terminal'), 0, 0.6);
          break;
        case 'respiratory':
          append(A('terminal'), 0.6, 1);
          append(A('respiratory'), 0, 0.6);
          break;
        case 'duct':
          append(A('respiratory'), 0.6, 1);
          append(A('duct'), 0, 0.6);
          break;
        case 'sac':
          append(A('duct'), 0.6, 1);
          append(A('sac'), 0, 0.6);
          break;
        case 'alveolus':
          append(A('sac'), 0.6, 1);
          append(A('alveolus'));
          break;
        case 'oxygen-diffusion':
          start = length;
          pointTo(a.center.clone().lerp(a.observer, 0.55), 'alveolar-view');
          pointTo(a.observer, 'barrier-view');
          stations[stage.id] = { start, end: length };
          continue;
        case 'hb-binding':
          break;
        case 'pcap-oxygen':
          pointTo(B('pulmonary-capillary').path.getPointAt(0.48));
          append(B('pulmonary-capillary'), 0.48, 0.72);
          break;
        case 'pvenules':
          append(B('pulmonary-capillary'), 0.72, 1);
          append(B('pvenules'));
          break;
        case 'pv':
          append(B('pv'));
          break;
        case 'la':
          append(H('la'));
          break;
        case 'mitral':
          append(H('lv'), 0, 0.065);
          break;
        case 'lv':
          append(H('lv'), 0.065, 0.21);
          critical = length;
          append(H('lv'), 0.21, 0.63);
          break;
        case 'aorticValve':
          append(H('lv'), 0.63, 0.68);
          break;
        case 'aorta':
          append(H('lv'), 0.68, 0.87);
          critical = length;
          append(H('lv'), 0.87, 1);
          append(parts.get('aorta'));
          break;
        case 'arteries':
          append(parts.get('arteries'));
          break;
        case 'arterioles':
          append(parts.get('arterioles'));
          break;
        case 'capillaries':
          append(parts.get('systemic-capillary'), 0, 0.43);
          break;
        case 'tissue-oxygen':
          start = length;
          pointTo(tissue.observer, 'tissue-view');
          stations[stage.id] = { start, end: length };
          continue;
        case 'metabolism':
        case 'perspective':
        case 'tissue-carbon':
        case 'bicarbonate':
          break;
        case 'venules':
          pointTo(parts.get('systemic-capillary').path.getPointAt(0.57));
          append(parts.get('systemic-capillary'), 0.57, 1);
          append(parts.get('venules'));
          break;
        case 'veins':
        case 'svc':
          append(parts.get(stage.id));
          break;
        case 'ra':
          append(H('ra'));
          break;
        case 'tricuspid':
          append(H('rv'), 0, 0.065);
          break;
        case 'rv':
          append(H('rv'), 0.065, 0.21);
          critical = length;
          append(H('rv'), 0.21, 0.63);
          break;
        case 'pulmonaryValve':
          append(H('rv'), 0.63, 0.68);
          break;
        case 'trunk':
          append(H('rv'), 0.68, 0.87);
          critical = length;
          append(H('rv'), 0.87, 1);
          append(parts.get('trunk'));
          break;
        case 'pa':
        case 'parterioles':
          append(B(stage.id));
          break;
        case 'pcap-carbon':
          append(B('pulmonary-capillary'), 0, 0.45);
          break;
        case 'bicarbonate-return':
          pointTo(a.observer, 'carbon-view');
          break;
        case 'co2-diffusion':
          start = length;
          pointTo(a.center, 'alveolar-return');
          stations[stage.id] = { start, end: length };
          continue;
        case 'out_alveolus':
          break;
        case 'out_sac':
          append(A('alveolus'), 1, 0);
          append(A('sac'), 1, 0.6);
          break;
        case 'out_duct':
          append(A('sac'), 0.6, 0);
          append(A('duct'), 1, 0.6);
          break;
        case 'out_respiratory':
          append(A('duct'), 0.6, 0);
          append(A('respiratory'), 1, 0.6);
          break;
        case 'out_terminal':
          append(A('respiratory'), 0.6, 0);
          append(A('terminal'), 1, 0.6);
          break;
        case 'out_bronchiole':
          append(A('terminal'), 0.6, 0);
          append(A('bronchiole'), 1, 0.6);
          break;
        case 'out_bronchus':
          append(A('bronchiole'), 0.6, 0);
          append(A('bronchus'), 1, 0.58);
          break;
        case 'out_mainbronchus':
          append(A('bronchus'), 0.58, 0);
          append(A('mainbronchus'), 1, 0);
          break;
        case 'out_trachea':
          append({ id: 'carina', path: junctionParent }, 1, 0);
          append(parts.get('trachea'), 1, 0.5);
          break;
        case 'out_larynx':
          append(parts.get('trachea'), 0.5, 0);
          append(parts.get('larynx'), 1, 0.13);
          break;
        case 'out_pharynx':
          append(parts.get('larynx'), 0.13, 0);
          append(parts.get('pharynx'), 1, 0);
          break;
        case 'out_entry':
          append(parts.get(run.exit || run.entry), 1, 0.43);
          break;
        case 'exterior':
          append(parts.get(run.exit || run.entry), 0.43, 0);
          pointTo(V(0, 95, 24), 'exhaled');
          break;
      }
      stations[stage.id] = { start: length, end: length, critical, travelFrom: start };
    }
    function at(distance) {
      distance = clamp(distance, 0, length);
      let lo = 0,
        hi = segments.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (segments[mid].end < distance) lo = mid + 1;
        else hi = mid;
      }
      const p = segments[lo];
      return p.path.getPointAt(clamp((distance - p.start) / (p.end - p.start), 0, 1));
    }
    function ahead(distance) {
      if (distance <= length) return at(distance);
      return at(length).addScaledVector(
        at(length)
          .sub(at(length - 0.05))
          .normalize(),
        distance - length,
      );
    }
    const frames = anatomicalCameraFrames((d) => ahead(d / 10), length * 10, 4096);
    const route = {
      length,
      segments,
      stations,
      at,
      frames,
      position(run) {
        const stage = steps[run.index],
          station = stations[stage.id];
        if (run.phase === 'travel') {
          const from = stations[steps[run.fromIndex].id].end,
            to = station.start;
          if (run.valveDuration && station.critical) {
            const t = run.age - (run.valveWait || 0);
            if (t <= 0) return { distance: from };
            if (t < run.valveDuration)
              return {
                distance: T.MathUtils.lerp(
                  from,
                  station.critical,
                  T.MathUtils.smoothstep(t / run.valveDuration, 0, 1),
                ),
              };
            return {
              distance: T.MathUtils.lerp(
                station.critical,
                to,
                T.MathUtils.smoothstep((t - run.valveDuration) / 2.2, 0, 1),
              ),
            };
          }
          return {
            distance: T.MathUtils.lerp(
              from,
              to,
              T.MathUtils.smoothstep(run.age / (run.duration || 1), 0, 1),
            ),
          };
        }
        if (run.phase === 'animation')
          return {
            distance: T.MathUtils.lerp(
              station.start,
              station.end,
              T.MathUtils.smoothstep(run.age / (run.duration || 1), 0, 1),
            ),
          };
        return { distance: run.demonstrated.includes(stage.id) ? station.end : station.start };
      },
    };
    paths.set(key, route);
    return route;
  }
  return {
    parts,
    hearts,
    air,
    tissue,
    junction: { parent: junctionParent, branches: junctionBranches, radius: 0.57 },
    routeFor,
    stagePart(stage, run) {
      const id = stage.anatomy || stage.id;
      if (id === 'mucus') return parts.get('trachea');
      if (air.has(run.side + ':' + id)) return air.get(run.side + ':' + id);
      if (
        [
          'pcap-oxygen',
          'pcap-carbon',
          'oxygen-diffusion',
          'hb-binding',
          'bicarbonate-return',
          'co2-diffusion',
        ].includes(id)
      )
        return parts.get(run.side + ':pulmonary-capillary');
      if (
        [
          'tissue-oxygen',
          'metabolism',
          'perspective',
          'tissue-carbon',
          'bicarbonate',
          'capillaries',
        ].includes(id)
      )
        return parts.get('systemic-capillary');
      return parts.get(id) || parts.get(run.side + ':' + id) || null;
    },
  };
}
