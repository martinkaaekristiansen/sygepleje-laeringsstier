import * as T from './three.module.min.js';
import { physiologyLabel as anatomicalLabel } from './digestion-physiology-label.js';

export const NUTRIENT_ENDINGS = {
  stanley:
    'Stivelsen blev til glukose. Glukosen er optaget gennem enterocytterne og ført med kapillærblod via vena portae til leveren.',
  poul: 'Proteinet blev til aminosyrer og små peptider. Di- og tripeptider blev overvejende hydrolyseret i enterocytterne; aminosyrerne er ført med blodet via vena portae til leveren.',
  trine:
    'Langkædede fedtsyrer og monoglycerider blev optaget i enterocytterne. Gendannede triglycerider blev pakket i chylomikroner og ført via lymfen, ductus thoracicus og venstre venevinkel til det systemiske blod.',
};
export function defecationPose(age) {
  const t = Math.max(0, age),
    release = T.MathUtils.smoothstep(t, 1, 2.4),
    fall = T.MathUtils.smoothstep(t, 2.4, 4.8);
  return {
    release,
    fall,
    residueY: 1.15 - fall * 4.45,
    impact: t >= 4.8,
    internalSphincter: 0.48 + release * 0.35,
    externalSphincter: 0.44 + release * 0.37,
    camera: [0, 5.5, 2.8],
    look: [0, -2.5, -6.1],
    waterY: -3.35,
  };
}
export function buildFinale() {
  const group = new T.Group(),
    mat = new Map();
  function add(geometry, color, position, opacity = 1) {
    const key = color + ':' + opacity;
    if (!mat.has(key))
      mat.set(
        key,
        new T.MeshStandardMaterial({
          color,
          roughness: 0.45,
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity === 1,
          side: T.DoubleSide,
        }),
      );
    const mesh = new T.Mesh(geometry, mat.get(key));
    mesh.position.fromArray(position);
    group.add(mesh);
    return mesh;
  }
  const bowl = add(
    new T.LatheGeometry(
      [
        new T.Vector2(0, -3.9),
        new T.Vector2(0.8, -3.8),
        new T.Vector2(1.5, -3.5),
        new T.Vector2(2, -2.7),
        new T.Vector2(2.1, -2.45),
      ],
      48,
    ),
    0xf8f3e7,
    [0, 0, -6],
  );
  bowl.scale.z = 1.15;
  const rim = add(new T.TorusGeometry(2.08, 0.16, 10, 48), 0xfffdf3, [0, -2.45, -6]);
  rim.rotation.x = -Math.PI / 2;
  rim.scale.y = 1.15;
  add(new T.BoxGeometry(1.55, 1.3, 0.6), 0xf8f3e7, [0, -1.8, -8.4]);
  add(new T.CylinderGeometry(0.55, 0.7, 1.1, 20), 0xf8f3e7, [0, -4.4, -6]);
  const water = add(new T.CircleGeometry(1.65, 48), 0x61c9de, [0, -3.35, -6]);
  water.rotation.x = -Math.PI / 2;
  const rectum = add(
    new T.CylinderGeometry(0.75, 0.48, 2, 24, 1, true),
    0xc8848b,
    [-0.8, 1.3, -6.3],
    0.45,
  );
  const sphincters = [
    add(new T.TorusGeometry(0.5, 0.12, 8, 32), 0xc56e86, [-0.8, 0.45, -6.3]),
    add(new T.TorusGeometry(0.5, 0.13, 8, 32), 0xb37a95, [-0.8, 0.05, -6.3]),
  ];
  sphincters.forEach((m) => (m.rotation.x = -Math.PI / 2));
  const residue = add(new T.CapsuleGeometry(0.25, 0.6, 4, 10), 0x9e7855, [-0.8, 1.15, -6.3]);
  const ripples = [];
  const rippleGeometry = new T.TorusGeometry(0.3, 0.025, 5, 32);
  for (let i = 0; i < 4; i++) {
    const m = add(rippleGeometry, 0xcff6fa, [-0.8, -3.32, -6.3]);
    m.rotation.x = -Math.PI / 2;
    ripples.push(m);
  }
  const splashes = new T.InstancedMesh(
    new T.SphereGeometry(0.065, 6, 4),
    new T.MeshStandardMaterial({ color: 0xa7e9f3 }),
    12,
  );
  group.add(splashes);
  const dummy = new T.Object3D();
  group.add(anatomicalLabel('Rectum', [1.9, 1, -6.3], 1.4));
  group.add(anatomicalLabel('Indre og ydre analsfinkter', [0.7, 0.5, -6.3], 2.2));
  group.add(anatomicalLabel('Kun den ufordøjelige rest skylles ud', [0, -4, -5.6], 3, true));
  return {
    group,
    complete() {
      group.children.filter((o) => o.isSprite).forEach((o) => (o.visible = false));
    },
    update(age) {
      const pose = defecationPose(age);
      residue.position.y = pose.residueY;
      residue.visible = age < 5.25;
      sphincters[0].scale.setScalar(pose.internalSphincter / 0.5);
      sphincters[1].scale.setScalar(pose.externalSphincter / 0.5);
      ripples.forEach((m, i) => {
        const t = age - 4.8 - i * 0.18;
        m.visible = t >= 0 && t < 2.2;
        m.scale.setScalar(0.3 + Math.max(0, t) * 1.6);
      });
      splashes.visible = age >= 4.8 && age < 6.25;
      for (let i = 0; i < 12; i++) {
        const t = Math.max(0, age - 4.8),
          a = (i * Math.PI) / 6;
        dummy.position.set(
          -0.8 + Math.cos(a) * t * 0.6,
          -3.3 + 1.8 * t - 1.5 * t * t,
          -6.3 + Math.sin(a) * t * 0.6,
        );
        dummy.updateMatrix();
        splashes.setMatrixAt(i, dummy.matrix);
      }
      splashes.instanceMatrix.needsUpdate = true;
      return pose;
    },
  };
}
