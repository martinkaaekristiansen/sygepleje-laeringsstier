import * as T from './three.module.min.js';
import { ORAL_CENTER } from './digestion-anatomy.js';
import { anatomicalLabel } from './digestion-anatomy-labels.js';
// Local axes: +y superior; +z anterior. Oesophagus is posterior to the airway.
export const SWALLOW_LANDMARKS = {
  tongue: [0, 1.6, -2.5],
  epiglottis: [0, 1.2, -4.05],
  larynx: [0, -0.5, -4.7],
  trachea: [0, -3, -4.7],
  oesophagus: [0, -2.8, -6.7],
};
const smooth = (a, b, x) => {
  const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export function swallowingPose(seconds, active = true) {
  const t = Math.max(0, seconds);
  const closure = active ? smooth(0.15, 0.9, t) * (1 - smooth(1.9, 2.9, t)) : 0;
  return {
    lift: closure * 0.48,
    anterior: closure * 0.3,
    epiglottisAngle: -closure * 1.55,
    vocalGap: 0.25 * (1 - closure) + 0.015,
    ues: active ? smooth(0.8, 1.3, t) * (1 - smooth(2.1, 2.7, t)) : 0,
    bolus: active ? smooth(0.15, 2.6, t) : 0,
    closure,
  };
}
export function epiglottisGeometry() {
  const rows = 32,
    around = 32,
    p = [],
    indices = [];
  for (let j = 0; j <= rows; j++) {
    const u = j / rows;
    const width =
      (0.055 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.8) * (0.65 + u * 0.55)) * (u === 1 ? 0 : 1);
    for (let i = 0; i <= around; i++) {
      const a = (i / around) * Math.PI * 2;
      p.push(
        width * Math.cos(a),
        u * 2.05,
        0.22 * Math.sin(Math.PI * u) + 0.065 * Math.sin(a) * Math.sin(Math.PI * u),
      );
      if (j < rows && i < around) {
        const k = j * (around + 1) + i;
        indices.push(k, k + 1, k + around + 1, k + 1, k + around + 2, k + around + 1);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.userData = { kind: 'curved-leaf', stemWidth: 0.11 };
  return g;
}
export function buildSwallowAnatomy({ labels = true, continuous = false } = {}) {
  const group = new T.Group();
  group.name = 'coordinated-swallow';
  const material = (c) =>
    new T.MeshStandardMaterial({ color: c, roughness: 0.42, side: T.DoubleSide });
  const add = (geometry, color, parent = group) => {
    const m = new T.Mesh(geometry, material(color));
    parent.add(m);
    return m;
  };
  const ellipsoid = (p, scale, color, parent = group) => {
    const m = add(new T.SphereGeometry(1, 28, 20), color, parent);
    m.position.fromArray(p);
    m.scale.fromArray(scale);
    return m;
  };
  const tube = (points, r, c, parent = group) =>
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        48,
        r,
        24,
        false,
      ),
      c,
      parent,
    );
  // Posterior/lateral pharyngeal wall. Its anterior part is naturally the oral approach.
  const wall = add(
    new T.CylinderGeometry(2.3, 1.4, 7, 48, 24, true, Math.PI * 0.55, Math.PI * 0.9),
    0xab6571,
  );
  wall.position.set(0, 0, -5.5);
  const tongue = ellipsoid(SWALLOW_LANDMARKS.tongue, [0.95, 0.4, 1], 0xd98994);
  if (continuous) tongue.position.set(ORAL_CENTER[0], ORAL_CENTER[1] - 1.05, -2.5);
  tongue.name = 'posterior-tongue';
  const larynx = new T.Group();
  larynx.position.set(0, 0, -4.7);
  group.add(larynx);
  const funnel = add(new T.CylinderGeometry(0.78, 0.56, 1.7, 48, 8, true), 0xcf8b94, larynx);
  funnel.position.y = -0.85;
  const trachealAssembly = new T.Group();
  group.add(trachealAssembly);
  const trachea = tube(
    [
      [0, -1.6, -4.7],
      [0, -3, -4.7],
      [0, -5.1, -4.7],
    ],
    0.57,
    0xc69b9d,
    trachealAssembly,
  );
  for (let i = 0; i < 9; i++) {
    const c = add(
      new T.TorusGeometry(0.58, 0.045, 8, 32, Math.PI * 1.65),
      0xe8c9b4,
      trachealAssembly,
    );
    c.rotation.x = Math.PI / 2;
    c.rotation.z = -Math.PI * 0.32;
    c.position.set(0, -1.9 - i * 0.33, -4.7);
  }
  const oesophagus = tube(
    [
      [0, -0.2, -6.6],
      [0, -1.2, -6.7],
      [0, -3, -6.7],
      [0, -5.1, -6.7],
    ],
    0.55,
    0xb97685,
  );
  const ues = [-1, 1].map((side) => ({
    side,
    fold: ellipsoid([side * 0.24, -0.35, -6.6], [0.26, 0.12, 0.49], 0xa55e75),
  }));
  const folds = [];
  for (const side of [-1, 1]) {
    const fold = ellipsoid([side * 0.265, -0.27, 0], [0.11, 0.09, 0.58], 0xf2d9c7, larynx);
    folds.push({ fold, side });
    ellipsoid([side * 0.65, 0.05, -0.06], [0.17, 0.18, 0.64], 0xca7c8c, larynx);
  }
  const pivot = new T.Group();
  pivot.position.set(0, 0.02, 0.64);
  larynx.add(pivot);
  const epiglottis = add(epiglottisGeometry(), 0xdf8a9c, pivot);
  const bolus = ellipsoid([0, 1.5, -3.3], [0.33, 0.3, 0.43], 0xd7ad74);
  const bolusPath = new T.CatmullRomCurve3(
    [
      [0, 1.6, -3.2],
      [0, 1, -5.65],
      [0, -0.3, -6.6],
      [0, -2.4, -6.7],
    ].map((p) => new T.Vector3(...p)),
  );
  let larynxLabel;
  function update(seconds, active) {
    const p = swallowingPose(seconds, active);
    larynx.position.set(0, p.lift, -4.7 + p.anterior);
    // In the shared sagittal view the resting leaf leans towards the tongue
    // base; its free edge is anterior to the open laryngeal inlet. Closure
    // still carries the blade backwards over the airway, never over the food path.
    pivot.rotation.x = p.epiglottisAngle + (continuous ? 0.4 * (1 - p.closure) : 0);
    trachealAssembly.position.set(0, p.lift, p.anterior);
    if (larynxLabel) larynxLabel.visible = p.closure < 0.55;
    folds.forEach(({ fold, side }) => (fold.position.x = side * p.vocalGap));
    funnel.scale.x = 1 - p.closure * 0.12;
    tongue.position.z = -2.5 - p.closure * 0.32;
    ues.forEach(({ side, fold }) => {
      fold.position.x = side * (0.24 + 0.33 * p.ues);
      fold.scale.x = 0.26 - 0.1 * p.ues;
    });
    bolus.visible = !continuous && active && seconds < 2.8;
    bolus.position.copy(bolusPath.getPointAt(p.bolus));
    wall.scale.x = 1 - p.closure * 0.035;
    return p;
  }
  if (labels) {
    epiglottis.add(
      anatomicalLabel('Epiglottis', [0, 0.55, 0.15], 1.6, {
        target: epiglottis,
        priority: 100,
        side: 1,
      }),
    );
    tongue.add(anatomicalLabel('Tungerod', [0, 1, 0], 1.6, { target: tongue, priority: 70 }));
    larynxLabel = anatomicalLabel('Indgang til larynx', [0, -0.15, 0], 1.8, {
      target: funnel,
      priority: 95,
      side: 2,
      maxWidth: 150,
      labelGap: 200,
    });
    larynx.add(larynxLabel);
    group.add(
      anatomicalLabel('Trachea', [0.55, -2.5, -4.1], 1.5, { target: trachea, priority: 40 }),
    );
    group.add(
      anatomicalLabel('Oesophagus · bag luftvejen', [0, -0.35, -6.6], 2.8, { priority: 85 }),
    );
  }
  if (continuous) {
    wall.visible = false;
    oesophagus.visible = false;
  }
  update(0, false);
  return {
    group,
    tongue,
    epiglottis,
    larynx,
    trachea,
    oesophagus,
    pivot,
    vocalFolds: folds.map((f) => f.fold),
    update,
  };
}
