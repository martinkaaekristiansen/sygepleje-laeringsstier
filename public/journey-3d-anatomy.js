import { chamberPlan, chamberGeometry, chamberFeatures } from './journey-chambers.js';
import * as T from './three.module.min.js';
import {
  anatomyProfile,
  isValve,
  valveOpening,
  cardiacCycle,
  respiratoryCycle,
} from './journey-physiology.js';
import { makeCurves, wallMaterial } from './journey-3d-geometry.js';
import { createValve } from './journey-valves.js';
import {
  trabecularField,
  smoothWallSeam,
  trabecularBridges,
  myocardiumMaterial,
} from './journey-myocardium.js';
export { createValve } from './journey-valves.js';
const V = (x, y, z) => new T.Vector3(x, y, z);

// Visual dimensions only. Names and answer options ALWAYS come from blood-routes.
export function visualAnatomy(s, next) {
  const profile = anatomyProfile(s),
    cap = profile.capillary,
    chamber = profile.chamber;
  const smallVein = ['venules', 'pvenules'].includes(s.id);
  const radius = cap
    ? 0.86
    : chamber
      ? 5.4
      : isValve(s)
        ? 3.3
        : s.kind === 'arteriole'
          ? 1.65
          : smallVein
            ? 1.8
            : s.kind === 'vein'
              ? 4.8
              : s.kind === 'arch'
                ? 6
                : ['arteries', 'pa', 'rpa'].includes(s.id)
                  ? 3.8
                  : s.id === 'trunk'
                    ? 5
                    : 6.2;
  // At the medium/easy level valves are traversed without creating extra steps.
  let valve = isValve(s) ? s : null;
  if (!valve && !isValve(next || { kind: '' })) {
    const implicit = {
      ra: { id: 'tricuspid', kind: 'av-three' },
      la: { id: 'mitral', kind: 'av-two' },
      rv: { id: 'pulmonaryValve', kind: 'semilunar' },
      right: { id: 'pulmonaryValve', kind: 'semilunar' },
      lv: { id: 'aorticValve', kind: 'semilunar' },
      left: { id: 'aorticValve', kind: 'semilunar' },
    };
    if (implicit[s.id]) valve = implicit[s.id];
  }
  return {
    ...s,
    profile,
    radius,
    entry: radius,
    valve,
    branch: false,
    chamber,
    cap,
    smallVein,
    shape: chamber
      ? s.kind
      : cap
        ? 'capillary'
        : isValve(s)
          ? 'valve'
          : s.kind === 'vein'
            ? 'vein'
            : s.kind === 'arch'
              ? 'arch'
              : 'arterial',
    cacheKey: [s.kind, s.id, radius, !!valve].join(':'),
  };
}
export function anatomyCurves(s) {
  if (s.chamber) return { parent: chamberPlan(s).parent, branches: [] };
  const r = s.radius;
  if (s.branch) return makeCurves(r);
  const parent = new T.CatmullRomCurve3(
    s.kind === 'arch'
      ? [
          V(0, 0, 2 * r),
          V(0.12 * r, 0.12 * r, -2 * r),
          V(0.55 * r, 0.7 * r, -5 * r),
          V(1.8 * r, 1.1 * r, -8 * r),
          V(3.4 * r, 0.85 * r, -11 * r),
        ]
      : [
          V(0, 0, 2 * r),
          V(0.1 * r, 0.04 * r, -2 * r),
          V(-0.12 * r, 0.08 * r, -5 * r),
          V(0.15 * r, -0.07 * r, -8 * r),
          V(0.32 * r, 0.06 * r, -11 * r),
        ],
  );
  return { parent, branches: [] };
}
function nativeRadius(s, u) {
  if (s.chamber) {
    const swell = Math.sin(Math.PI * Math.max(0, Math.min(1, (u - 0.06) / 0.88)));
    return (
      s.radius * (0.48 + Math.pow(Math.max(0, swell), s.kind === 'atrium' ? 0.55 : 0.85) * 0.9)
    );
  }
  if (s.cap) return s.radius * (1 - 0.1 * u);
  if (s.kind === 'arteriole') return s.radius * (1.15 - 0.35 * u);
  return s.radius * (1 - 0.14 * u);
}
export function lumenRadius(s, u) {
  if (s.chamber) return s.radius * (u > 0.25 && u < 0.62 ? 0.7 : 0.35);
  if (s.entry !== s.radius && u < 0.42) {
    const t = T.MathUtils.clamp((u - 0.1) / 0.32, 0, 1);
    return T.MathUtils.lerp(
      s.entry,
      lumenRadius({ ...s, entry: s.radius }, u),
      t * t * (3 - 2 * t),
    );
  }
  const base = nativeRadius(s, u);
  // Leave room around the sinus root / ventricular support cuff, including
  // valves embedded in the easier levels' chamber scenes.
  if (s.valve && u > 0.67 && u < 0.96) {
    const clearance = nativeRadius(s, 0.73) * 1.3,
      blend = Math.min(1, (u - 0.67) / 0.05, (0.96 - u) / 0.04);
    return T.MathUtils.lerp(base, Math.max(base, clearance), Math.max(0, blend));
  }
  return base;
}
export function lumenGeometry(s, curve, quality) {
  if (s.chamber) return chamberGeometry(s, quality);
  const ventricular = ['right-ventricle', 'left-ventricle'].includes(s.kind);
  const length = ventricular ? (quality === 'low' ? 160 : 240) : quality === 'low' ? 64 : 100,
    radial = ventricular ? (quality === 'low' ? 128 : 192) : quality === 'low' ? 28 : 44;
  const trabeculae = ventricular
    ? trabecularField(s.kind === 'left-ventricle' ? 'left' : 'right', 4.8)
    : null;
  const g = new T.TubeGeometry(curve, length, 1, radial, false),
    p = g.attributes.position,
    n = g.attributes.normal,
    colors = ventricular ? new Float32Array(p.count * 3) : null;
  for (let j = 0; j <= length; j++) {
    const u = j / length,
      c = curve.getPointAt(u),
      radius = lumenRadius(s, u);
    for (let i = 0; i <= radial; i++) {
      const k = j * (radial + 1) + i,
        a = (i / radial) * Math.PI * 2;
      // Relief belongs to ventricular body; smooth inlet/outflow boundaries.
      const relief = trabeculae
        ? trabeculae.sample(a, (u - 0.18) / (s.valve?.kind === 'semilunar' ? 0.5 : 0.64))
        : 0;
      const ripple =
        (s.chamber ? 0.005 * Math.sin(a * 7 + u * 14) : 0.006 * Math.sin(a * 5 + u * 22)) - relief;
      if (colors) {
        const shade = 0.72 + (0.28 * relief) / trabeculae.profile.height;
        colors.set([shade, shade, shade], k * 3);
      }
      const flatten = s.kind === 'right-ventricle' ? 0.82 : s.kind === 'vein' ? 0.85 : 1;
      p.setXYZ(
        k,
        c.x + n.getX(k) * radius * (1 + ripple),
        c.y + n.getY(k) * radius * flatten * (1 + ripple),
        c.z + n.getZ(k) * radius * (1 + ripple),
      );
    }
  }
  if (colors) g.setAttribute('color', new T.BufferAttribute(colors, 3));
  g.userData.rows = length;
  g.userData.columns = radial;
  g.userData.trabeculated = ventricular;
  g.userData.ventricle = ventricular ? s.kind : null;
  return smoothWallSeam(g, length, radial);
}
export function oxygenAt(s, u) {
  const f = T.MathUtils.clamp((u - 0.12) / 0.72, 0, 1);
  return s.oxygen === 'exchange-in'
    ? f
    : s.oxygen === 'exchange-out'
      ? 1 - f
      : s.oxygen === 'high'
        ? 1
        : 0;
}
export function gasRadius(s, isOxygen, f) {
  const outward = s.oxygen === 'exchange-out' ? isOxygen : !isOxygen;
  return s.radius * (outward ? 0.2 + f * 1.7 : 1.9 - f * 1.7);
}

export function addAnatomy(root, s, curves, low, lumen) {
  if (s.chamber) return chamberFeatures(root, s, curves, lumen);
  const extras = new T.Group();
  root.add(extras);
  let valve = null,
    alveoli = null;
  if (s.valve) {
    valve = createValve(s.valve, nativeRadius(s, 0.73) * 0.98);
    valve.group.position.copy(curves.parent.getPointAt(0.73));
    valve.group.quaternion.setFromUnitVectors(V(0, 0, -1), curves.parent.getTangentAt(0.73));
    extras.add(valve.group);
  }
  if (s.profile.venousValve) {
    const venous = createValve({ id: 'venousValve', kind: 'venous' }, lumenRadius(s, 0.73) * 0.98);
    venous.group.position.copy(curves.parent.getPointAt(0.73));
    venous.group.quaternion.setFromUnitVectors(V(0, 0, -1), curves.parent.getTangentAt(0.73));
    venous.update(0.95);
    extras.add(venous.group);
  }
  if (lumen?.userData.trabeculated) {
    const rows = lumen.userData.rows,
      cols = lumen.userData.columns,
      p = lumen.attributes.position;
    const surface = (a, t) => {
      const u = 0.26 + t * 0.34,
        y = u * rows,
        j = Math.floor(y),
        x = (a / (2 * Math.PI)) * cols,
        i = Math.floor(x);
      const row = (n) =>
        new T.Vector3()
          .fromBufferAttribute(p, n * (cols + 1) + i)
          .lerp(new T.Vector3().fromBufferAttribute(p, n * (cols + 1) + i + 1), x - i);
      const point = row(j).lerp(row(j + 1), y - j),
        outward = point.clone().sub(curves.parent.getPointAt(u)).normalize();
      return { point, outward };
    };
    extras.add(
      trabecularBridges(
        surface,
        s.kind === 'left-ventricle' ? 'left' : 'right',
        s.radius,
        myocardiumMaterial(),
      ),
    );
  }
  if (s.cap) {
    if (s.profile.pulmonary) {
      alveoli = new T.Group();
      const geo = new T.SphereGeometry(s.radius * 0.9, low ? 16 : 24, 12),
        mat = new T.MeshStandardMaterial({
          color: 0xcca8a1,
          roughness: 0.85,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          side: T.DoubleSide,
        });
      for (let i = 0; i < (low ? 10 : 16); i++) {
        const u = 0.18 + (i % 6) * 0.1,
          c = curves.parent.getPointAt(u),
          a = i * 2.3999;
        const m = new T.Mesh(geo, mat);
        m.position.set(c.x + Math.cos(a) * s.radius * 1.8, c.y + Math.sin(a) * s.radius * 1.8, c.z);
        m.userData.center = m.position.clone();
        alveoli.add(m);
      }
      extras.add(alveoli);
    } else {
      const mat = wallMaterial(false, s.radius);
      mat.color.set(0x80515c);
      mat.roughness = 0.9;
      extras.add(new T.Mesh(new T.TubeGeometry(curves.parent, 64, s.radius * 1.7, 24, false), mat));
    }
  }
  return {
    group: extras,
    valve,
    update(time, reduced) {
      if (valve)
        valve.update(
          reduced ? 1 : valveOpening(s.valve, time),
          reduced ? 0 : cardiacCycle(time).contraction,
        );
      if (alveoli) {
        const breath = reduced ? 1 : 1 + 0.05 * respiratoryCycle(time).volume;
        alveoli.children.forEach((m) => m.scale.setScalar(breath));
      }
    },
  };
}
