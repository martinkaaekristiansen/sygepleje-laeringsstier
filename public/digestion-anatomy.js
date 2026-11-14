import * as T from './three.module.min.js';
export const ORGAN_LABELS = {
  mouth: ['Tandbuer', 'Hård og blød gane', 'Tunge'],
  pharynx: ['Svælg', 'Larynxindgang', 'Epiglottis'],
  epiglottis: [
    'Strubelåg · observationspunkt',
    'Beskyttet larynxindgang',
    'Oesophagus bag luftvejen',
  ],
  oesophagus: ['Længdefolder', 'Peristaltisk bølge'],
  stomach: [
    'Fundus',
    'Corpus',
    'Antrum pyloricum',
    'Curvatura major',
    'Curvatura minor',
    'Pylorus',
  ],
  duodenum: ['C-formet duodenum', 'Papilla duodeni major', 'Galde + pankreassekret', 'Bikarbonat'],
  jejunum: ['Tætte plicae circulares', 'Lange villi'],
  ileum: ['Lavere folder', 'Færre villi', 'Lymfoidt væv'],
  caecum: ['Caecum', 'Appendix · blind sidegren'],
  ascending: ['Haustra', 'Semilunære folder'],
  transverse: ['Haustra', 'Vandoptagelse'],
  descending: ['Haustra', 'Fastere tarmindhold'],
  sigmoid: ['S-formet forløb'],
  rectum: ['Rectum · reservoir'],
  anal: ['Indre og ydre sfinkter'],
};
export function organCurve(id) {
  const points =
    id === 'ascending'
      ? [
          [0, 0, 3],
          [0, 2, 1],
          [0, 6, 0],
          [0, 11, 0],
        ]
      : id === 'transverse'
        ? [
            [0, 0, 3],
            [3, 0, 1],
            [7, 0, 0],
            [11, 0, 0],
          ]
        : id === 'descending'
          ? [
              [0, 0, 3],
              [0, -3, 1],
              [0, -7, 0],
              [0, -11, 0],
            ]
          : id === 'duodenum'
            ? [
                [0, 0, 3],
                [0, 0, -1],
                [0.6, -1.7, -5],
                [4, -3, -7],
                [7, -1.5, -6],
                [8, 1, -5],
              ]
            : id === 'jejunum'
              ? [
                  [0, 0, 3],
                  [-0.7, 0.2, -2],
                  [-1.4, 1, -7],
                  [1, 0.5, -12],
                  [1.6, -1, -18],
                  [0, 0, -24],
                ]
              : id === 'ileum'
                ? [
                    [0, 0, 3],
                    [0.8, -0.5, -3],
                    [1.5, -1, -9],
                    [-0.5, -0.8, -16],
                    [0, -1, -24],
                  ]
                : id === 'sigmoid'
                  ? [
                      [0, 0, 3],
                      [-1, 0, -3],
                      [1.4, -0.8, -9],
                      [-1.5, -1.6, -15],
                      [0, -2, -23],
                    ]
                  : [
                      [0, 0, 5],
                      [0, 0, -3],
                      [0.25, 0, -12],
                      [0, 0, -24],
                    ];
  return new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
}
export function stomachPoint(u, v) {
  const t = u * Math.PI,
    a = v * Math.PI * 2,
    s = Math.sin(t),
    c = Math.cos(t);
  return new T.Vector3(
    (4.5 + (Math.cos(a) < 0 ? 1 : 0)) * s * Math.cos(a) + (1.9 * (1 - c)) / 2,
    4.6 * c - 1,
    4.1 * s * Math.sin(a) - 6.8,
  );
}
export function lumenRadius(id, u, a = 0) {
  if (id === 'mouth') return 3.5 * (1 + 0.05 * Math.cos(a * 2));
  if (id === 'oesophagus') return 2.35 + 0.12 * Math.cos(a * 10);
  if (id === 'duodenum') return 2.25 + 0.12 * Math.cos(u * 130);
  if (id === 'jejunum') return 2.65 + 0.22 * Math.cos(u * 180);
  if (id === 'ileum') return 2.5 + 0.08 * Math.cos(u * 96);
  if (['caecum', 'ascending', 'transverse', 'descending', 'sigmoid'].includes(id))
    return 3.8 + 0.42 * Math.cos(u * 46) * (0.65 + 0.35 * Math.cos(a * 3));
  return 2.7 + 0.06 * Math.cos(a * 8);
}
export function peristalsis(u, t) {
  const center = (t * 0.14) % 1;
  const d = Math.min(Math.abs(u - center), 1 - Math.abs(u - center));
  return 1 - 0.38 * Math.exp((-d * d) / 0.002);
}
export function buildOrganSurface(stage, low = false) {
  const sack = stage.id === 'stomach',
    along = low ? 64 : 112,
    around = low ? 32 : 56;
  const path = organCurve(stage.id),
    frames = path.computeFrenetFrames(along, false),
    positions = [],
    indices = [];
  for (let j = 0; j <= along; j++)
    for (let i = 0; i <= around; i++) {
      const u = j / along,
        a = (i / around) * Math.PI * 2;
      let p;
      if (sack) p = stomachPoint(u, i / around);
      else {
        const c = path.getPointAt(u),
          r = lumenRadius(stage.id, u, a);
        p = c
          .clone()
          .addScaledVector(frames.normals[j], Math.cos(a) * r)
          .addScaledVector(frames.binormals[j], Math.sin(a) * r * (stage.id === 'mouth' ? 0.8 : 1));
      }
      positions.push(p.x, p.y, p.z);
      if (j < along && i < around) {
        const k = j * (around + 1) + i;
        // Distinct cardia and pyloric openings, rather than an open tube through the stomach.
        const cardia = sack && p.distanceTo(new T.Vector3(-1.6, 2.5, -3.8)) < 1;
        const pylorus = sack && p.distanceTo(new T.Vector3(4.7, -2, -6.8)) < 0.85;
        if (!cardia && !pylorus)
          indices.push(k, k + around + 1, k + 1, k + 1, k + around + 1, k + around + 2);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.userData = {
    kind: sack
      ? 'asymmetric-sac'
      : stage.id === 'duodenum'
        ? 'c-shaped'
        : ['caecum', 'ascending', 'transverse', 'descending', 'sigmoid', 'rectum'].includes(
              stage.id,
            )
          ? 'haustra'
          : 'folded',
    along,
    around,
  };
  return { geometry: g, path, frames };
}

export function toothPose(i) {
  const j = i % 16,
    a = (j / 15) * Math.PI;
  return {
    position: [Math.cos(a) * 2.35, (i < 16 ? 1 : -1) * 1.75, -2.8 + Math.sin(a) * 3.3],
    rotation: i < 16 ? Math.PI : 0,
    crownDirection: i < 16 ? -1 : 1,
    type: j < 4 || j > 11 ? 'molar' : j === 4 || j === 11 ? 'canine' : 'incisor',
  };
}
